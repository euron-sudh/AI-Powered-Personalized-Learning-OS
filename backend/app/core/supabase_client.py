from supabase import create_client, Client

from app.config import settings

# Singletons — one HTTP session per key type, reused across all requests
_service_client: Client | None = None
_anon_client: Client | None = None


def get_supabase_client() -> Client:
    """Returns a singleton Supabase client using the service role key (full access)."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _service_client


def get_supabase_anon_client() -> Client:
    """Returns a singleton Supabase client using the anon key (RLS-restricted)."""
    global _anon_client
    if _anon_client is None:
        _anon_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _anon_client
