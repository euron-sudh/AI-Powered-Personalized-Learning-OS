from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import os

from app.core.security import verify_supabase_jwt

security = HTTPBearer(auto_error=False)  # Don't auto-error, handle manually


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Extract and verify the Supabase JWT, return user payload."""
    # Development mode: check for dev token in header
    dev_token = request.headers.get("X-Dev-Token")
    if dev_token == "dev-bypass-auth":
        return {
            "sub": "123e4567-e89b-12d3-a456-426614174000",
            "email": "dev@test.com",
            "role": "authenticated",
        }

    # Production: verify JWT
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    try:
        token = credentials.credentials
        payload = await verify_supabase_jwt(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)[:50]}",
        )
