from jose import jwt, JWTError
from app.config import settings
import logging
import sys

logger = logging.getLogger(__name__)


async def verify_supabase_jwt(token: str) -> dict | None:
    """Verify a Supabase-issued JWT locally using HS256 and return the user payload."""
    try:
        with open("debug.log", "a") as f:
            f.write(f"[SECURITY] Verifying JWT token (first 20 chars): {token[:20]}...\n")
        logger.info(f"Verifying JWT token (first 20 chars): {token[:20]}...")
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        with open("debug.log", "a") as f:
            f.write(f"[SECURITY] JWT verified successfully. User sub: {payload.get('sub')}\n")
        logger.info(f"JWT verified successfully. User sub: {payload.get('sub')}")
        return {
            "sub": payload["sub"],
            "email": payload.get("email", ""),
            "role": payload.get("role", "authenticated"),
        }
    except JWTError as e:
        with open("debug.log", "a") as f:
            f.write(f"[SECURITY] JWT verification failed: {e}\n")
        logger.error(f"JWT verification failed: {e}")
        return None
    except Exception as e:
        with open("debug.log", "a") as f:
            f.write(f"[SECURITY] Unexpected error during JWT verification: {type(e).__name__}: {e}\n")
        logger.error(f"Unexpected error during JWT verification: {type(e).__name__}: {e}")
        return None
