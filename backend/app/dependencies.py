from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import verify_supabase_jwt

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract and verify the Supabase JWT, return user payload."""
    try:
        with open("debug.log", "a") as f:
            f.write(f"[DEPENDENCIES] get_current_user called\n")
        token = credentials.credentials
        with open("debug.log", "a") as f:
            f.write(f"[DEPENDENCIES] Token received (first 20 chars): {token[:20]}...\n")
        payload = await verify_supabase_jwt(token)
        if payload is None:
            with open("debug.log", "a") as f:
                f.write(f"[DEPENDENCIES] JWT verification returned None\n")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        with open("debug.log", "a") as f:
            f.write(f"[DEPENDENCIES] User authenticated: {payload.get('sub')}\n")
        return payload
    except HTTPException:
        raise
    except Exception as e:
        with open("debug.log", "a") as f:
            f.write(f"[DEPENDENCIES] Unexpected error in get_current_user: {type(e).__name__}: {e}\n")
        raise
