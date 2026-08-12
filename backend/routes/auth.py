from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlmodel import Session, select
from database import get_session
from models import User, BrokerCredential
import os
import jwt
from datetime import datetime, timedelta
from typing import Optional

security = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# SECURITY: JWT secret must be configured - no default fallback
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY or SECRET_KEY == "supersecret" or len(SECRET_KEY) < 32:
    import warnings
    warnings.warn(
        "CRITICAL: JWT_SECRET_KEY must be set to a secure random value (min 32 chars). "
        "Generate with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
    # In production, this should raise an error. For development, generate a random key.
    if os.getenv("ENVIRONMENT", "development") == "production":
        raise RuntimeError("JWT_SECRET_KEY must be configured in production")
    else:
        import secrets
        SECRET_KEY = secrets.token_hex(32)
        
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 60

class FyersAuthRequest(BaseModel):
    auth_code: str
    email: str # Mapped from the frontend oauth flow

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    Use this in route dependencies to require authentication.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """
    Optional authentication - returns None if not authenticated.
    Use for endpoints that work with or without auth.
    """
    if not credentials:
        return None
    
    payload = verify_token(credentials.credentials)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    return session.get(User, user_id)

@router.post("/fyers/link")
async def link_fyers_account(request: FyersAuthRequest, session: Session = Depends(get_session)):
    # 1. Fetch or create user
    user = session.exec(select(User).where(User.email == request.email)).first()
    if not user:
        user = User(email=request.email)
        session.add(user)
        session.commit()
        session.refresh(user)

    # 2. Mock HTTP call to Fyers to exchange auth_code for access_token
    # In reality, this would use httpx to call Fyers token endpoint
    mock_fyers_access_token = f"fyers_token_for_{request.auth_code}"

    # 3. Save to broker credentials
    creds = session.exec(select(BrokerCredential).where(BrokerCredential.user_id == user.id)).first()
    if not creds:
        creds = BrokerCredential(user_id=user.id, fyers_access_token=mock_fyers_access_token)
        session.add(creds)
    else:
        creds.fyers_access_token = mock_fyers_access_token
    session.commit()

    # 4. Generate internal JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer", "status": "linked"}
