from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def _get_storage_uri() -> str:
    """Return Redis URI if reachable, otherwise fall back to in-memory storage."""
    if not settings.redis_url:
        return "memory://"
    try:
        import redis as redis_lib
        client = redis_lib.from_url(settings.redis_url, socket_connect_timeout=1)
        client.ping()
        return settings.redis_url
    except Exception:
        return "memory://"


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
    storage_uri=_get_storage_uri(),
)
