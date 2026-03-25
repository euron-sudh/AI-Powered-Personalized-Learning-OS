from app.core.supabase_client import get_supabase_client


async def verify_supabase_jwt(token: str) -> dict | None:
    """Verify a Supabase-issued JWT via the Supabase admin client and return the user payload."""
    try:
        supabase = get_supabase_client()
        response = supabase.auth.get_user(token)
        if response and response.user:
            user = response.user
            return {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role,
            }
        return None
    except Exception:
        return None
