"""
Encryption utilities for sensitive data like broker credentials.

Uses Fernet symmetric encryption (AES-128-CBC) with HMAC-SHA256 authentication.
The encryption key is derived from the ENCRYPTION_KEY environment variable.

SECURITY: Store ENCRYPTION_KEY securely and never commit it to version control.
"""

import os
import base64
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

# Salt for key derivation - in production, use a unique salt per deployment
SALT = b"gotrading_credential_salt_v1"

_fernet: Optional[Fernet] = None


def _get_fernet() -> Optional[Fernet]:
    """Get or create Fernet instance from environment key."""
    global _fernet
    
    if _fernet is not None:
        return _fernet
    
    encryption_key = os.getenv("ENCRYPTION_KEY")
    
    if not encryption_key:
        logger.warning(
            "ENCRYPTION_KEY not set - credentials will NOT be encrypted! "
            "Set ENCRYPTION_KEY environment variable for production use. "
            "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
        return None
    
    # Derive a proper Fernet key from the environment key using PBKDF2
    try:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=SALT,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(encryption_key.encode()))
        _fernet = Fernet(key)
        return _fernet
    except Exception as e:
        logger.error(f"Failed to initialize encryption: {e}")
        return None


def encrypt_credential(plaintext: Optional[str]) -> Optional[str]:
    """
    Encrypt a credential string.
    
    Args:
        plaintext: The credential to encrypt
        
    Returns:
        Base64-encoded encrypted string, or the original if encryption is not configured
    """
    if not plaintext:
        return plaintext
    
    fernet = _get_fernet()
    if not fernet:
        return plaintext  # Fallback: return as-is if no encryption
    
    try:
        encrypted = fernet.encrypt(plaintext.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return plaintext


def decrypt_credential(ciphertext: Optional[str]) -> Optional[str]:
    """
    Decrypt a credential string.
    
    Args:
        ciphertext: The Base64-encoded encrypted credential
        
    Returns:
        Decrypted plaintext string, or the original if decryption fails
    """
    if not ciphertext:
        return ciphertext
    
    fernet = _get_fernet()
    if not fernet:
        return ciphertext  # Fallback: return as-is if no encryption
    
    try:
        encrypted = base64.urlsafe_b64decode(ciphertext.encode())
        decrypted = fernet.decrypt(encrypted)
        return decrypted.decode()
    except InvalidToken:
        # May be an unencrypted legacy value - return as-is
        logger.debug("Decryption failed (likely unencrypted value), returning as-is")
        return ciphertext
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return ciphertext


def is_encryption_enabled() -> bool:
    """Check if encryption is properly configured."""
    return _get_fernet() is not None


def generate_encryption_key() -> str:
    """Generate a new Fernet-compatible encryption key."""
    return Fernet.generate_key().decode()
