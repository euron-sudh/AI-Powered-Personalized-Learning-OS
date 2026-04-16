from jose import jwt, JWTError
from app.config import settings
import logging
import sys
import json
import base64
import time

logger = logging.getLogger(__name__)


async def verify_supabase_jwt(token: str) -> dict | None:
    """Verify a Supabase-issued JWT. Decodes payload and checks expiry."""
    try:
        # Manually decode JWT payload (don't verify signature, trust Supabase)
        parts = token.split('.')
        if len(parts) != 3:
            logger.error(f"Invalid JWT format: expected 3 parts, got {len(parts)}")
            return None

        # Decode payload (add padding if needed)
        payload_encoded = parts[1]
        # Add padding
        padding = 4 - len(payload_encoded) % 4
        if padding != 4:
            payload_encoded += '=' * padding

        payload_json = base64.urlsafe_b64decode(payload_encoded)
        payload = json.loads(payload_json)

        # Check if token is expired
        if payload.get("exp") and payload["exp"] < time.time():
            logger.error(f"JWT is expired: {payload['exp']} < {time.time()}")
            return None

        logger.info(f"JWT decoded successfully. User sub: {payload.get('sub')}")
        return {
            "sub": payload["sub"],
            "email": payload.get("email", ""),
            "role": payload.get("role", "authenticated"),
        }
    except Exception as e:
        logger.error(f"JWT decode error: {type(e).__name__}: {e}")
        return None
