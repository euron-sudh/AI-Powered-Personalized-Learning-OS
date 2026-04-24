"""YouTube search proxy for the voice tutor.

The tutor tool calls find a short, embeddable, safe-search video via the
YouTube Data API v3. Keeping the key server-side avoids leaking it to the
browser and lets us enforce safe-search + embeddable filtering consistently.

Search.list costs 100 quota units; default daily quota is 10,000 → ~100
searches/day. Results are cached in-process for 1 hour per query to stretch
that on repeat lookups of the same concept (fine for a single backend
instance; swap to Redis if this scales).
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import settings
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

_CACHE_TTL_SECONDS = 60 * 60
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


@router.get("/search")
async def search_youtube(
    q: str = Query(..., min_length=2, max_length=200),
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the top embeddable YouTube video for the query.

    Response: {"video_id": str | None, "title": str | None}
    """
    if not settings.youtube_data_api_key:
        raise HTTPException(status_code=503, detail="YouTube Data API key not configured")

    key = q.strip().lower()
    now = time.time()
    cached = _cache.get(key)
    if cached and now - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    params = {
        "part": "snippet",
        "q": q,
        "type": "video",
        "safeSearch": "strict",
        "videoEmbeddable": "true",
        "videoSyndicated": "true",
        # Prefer short clips (< 4 minutes) so the tutor doesn't drop a
        # 20-minute lecture on the student. YouTube's three buckets are
        # short (<4m), medium (4–20m), long (>20m). "short" is the sweet
        # spot for single-concept illustrations.
        "videoDuration": "short",
        "maxResults": 1,
        "relevanceLanguage": "en",
        "key": settings.youtube_data_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search", params=params
            )
    except httpx.HTTPError as exc:
        logger.warning("[youtube] network error: %s", exc)
        raise HTTPException(status_code=502, detail="YouTube API unreachable") from exc

    if resp.status_code == 403:
        # Quota exceeded or key invalid. Tell the client so the tutor can skip
        # the video and continue explaining verbally.
        logger.warning("[youtube] 403 from API: %s", resp.text[:200])
        raise HTTPException(status_code=429, detail="YouTube quota exceeded or key invalid")
    if resp.status_code != 200:
        logger.warning("[youtube] %s: %s", resp.status_code, resp.text[:200])
        raise HTTPException(status_code=502, detail=f"YouTube API error: {resp.status_code}")

    data = resp.json()
    items = data.get("items") or []
    if not items:
        result: dict[str, Any] = {"video_id": None, "title": None}
    else:
        item = items[0]
        video_id = (item.get("id") or {}).get("videoId")
        title = (item.get("snippet") or {}).get("title")
        result = {"video_id": video_id, "title": title}

    _cache[key] = (now, result)
    return result
