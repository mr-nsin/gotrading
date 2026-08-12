from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict
from sqlmodel import Session, select
from database import get_session
from models import BrokerCredential, User

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])

# In-memory mode state with persistent fallback
GLOBAL_TRADING_MODE = {
    "paper_trading": True,
    "mode": "PAPER"
}

class BrokerCredentialUpdateRequest(BaseModel):
    brokerId: str
    credentials: Dict[str, str]

class TradingModeToggleRequest(BaseModel):
    paper_trading: bool

@router.get("/trading-mode")
def get_trading_mode():
    return GLOBAL_TRADING_MODE

@router.post("/trading-mode")
def update_trading_mode(req: TradingModeToggleRequest):
    GLOBAL_TRADING_MODE["paper_trading"] = req.paper_trading
    GLOBAL_TRADING_MODE["mode"] = "PAPER" if req.paper_trading else "LIVE"
    return GLOBAL_TRADING_MODE

@router.post("/broker")
async def update_broker_credentials(request: BrokerCredentialUpdateRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User)).first()
    if not user:
        user = User(email="demo@example.com")
        session.add(user)
        session.commit()
        session.refresh(user)

    creds = session.exec(select(BrokerCredential).where(BrokerCredential.user_id == user.id)).first()
    if not creds:
        creds = BrokerCredential(user_id=user.id)
        session.add(creds)
    
    if request.brokerId == "fyers":
        creds.fyers_app_id = request.credentials.get("appId", creds.fyers_app_id)
        creds.fyers_access_token = request.credentials.get("secretKey", creds.fyers_access_token)
    elif request.brokerId == "zerodha":
        creds.zerodha_api_key = request.credentials.get("apiKey", creds.zerodha_api_key)
    elif request.brokerId == "dhan":
        creds.dhan_client_id = request.credentials.get("clientId", creds.dhan_client_id)
    elif request.brokerId == "angelone":
        creds.angelone_api_key = request.credentials.get("apiKey", creds.angelone_api_key)
    
    session.add(creds)
    session.commit()
    return {"status": "success"}
