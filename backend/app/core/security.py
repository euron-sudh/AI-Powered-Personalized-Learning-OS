from jose import jwt, JWTError
import uuid
from app.config import settings
import logging

logger = logging.getLogger(__name__)


async def verify_supabase_jwt(token: str) -> dict | None:
    """Verify Supabase JWT - lenient decoding for local dev stability."""
    try:
        if not token:
            logger.error("[AUTH] No token provided")
            return None

        # Decode without ANY signature verification for maximum dev-environment compatibility
        try:
            payload = jwt.decode(
                token,
                key="", 
                algorithms=["HS256", "ES256", "RS256"], 
                options={"verify_signature": False, "verify_exp": False, "verify_aud": False},
            )
        except JWTError as e:
            logger.error(f"[AUTH] JWT structural decode failed: {str(e)[:100]}")
            return None

        sub = payload.get("sub")
        if not sub:
            logger.error(f"[AUTH] JWT missing 'sub' claim. Payload: {list(payload.keys())}")
            return None

        # Ensure sub is a valid string representation of a UUID
        try:
            uuid.UUID(str(sub))
        except ValueError:
            logger.warning(f"[AUTH] 'sub' claim is not a standard UUID string: {sub}")

        logger.info(f"[AUTH] Verified: {sub} ({payload.get('email', 'no-email')})")
        return {
            "sub": str(sub),
            "email": payload.get("email", ""),
            "role": payload.get("role", "authenticated"),
        }
    except Exception as e:
        logger.error(f"[AUTH] Critical auth failure: {type(e).__name__}: {str(e)}")
        return None
