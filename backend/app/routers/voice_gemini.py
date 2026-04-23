"""WebSocket proxy for Gemini Live API.

The browser cannot open a direct WebSocket to Gemini because the API key would
have to be embedded in the page. This router exposes a WS at /api/voice/gemini
that:
  1. Verifies the student's Supabase JWT (passed as a query param since browsers
     can't set headers on WS connections).
  2. Opens an upstream WS to Gemini Live using the backend's GEMINI_API_KEY.
  3. Forwards messages in both directions until either side closes.
"""
from __future__ import annotations

import asyncio
import json
import logging

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.config import settings
from app.core.security import verify_supabase_jwt

logger = logging.getLogger(__name__)
router = APIRouter()

GEMINI_WS_URL_TEMPLATE = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    "?key={api_key}"
)


# JWT verification is delegated to app.core.security.verify_supabase_jwt, which
# the rest of the app uses (lenient dev-mode decoding — no signature check, so
# it tolerates Supabase's ES256 keys that rotate on the Auth side without us
# having to plumb JWKS fetches into the backend).


@router.websocket("/gemini")
async def gemini_proxy(websocket: WebSocket):
    """Bidirectional proxy between the browser and Gemini Live.

    Auth is done via the FIRST client message (not a URL query param) so that
    very long Supabase JWTs never hit the URL/handshake layer and cause
    browser-side 400s on handshake.
    """
    logger.info("[voice_gemini] incoming WS connection from %s", websocket.client)
    await websocket.accept()

    # First message from the client must be {"auth": "<supabase-jwt>"}.
    try:
        first = await asyncio.wait_for(websocket.receive_text(), timeout=10)
    except asyncio.TimeoutError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="auth timeout")
        return
    try:
        auth_payload = json.loads(first)
        token = auth_payload.get("auth", "") if isinstance(auth_payload, dict) else ""
    except json.JSONDecodeError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="auth malformed")
        return

    claims = await verify_supabase_jwt(token)
    if not claims:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid token")
        return

    if not settings.gemini_api_key:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="gemini key missing")
        return

    logger.info("[voice_gemini] authenticated sub=%s", claims.get("sub"))
    # Let the client know it can start sending Gemini frames.
    await websocket.send_text(json.dumps({"authed": True}))
    upstream_url = GEMINI_WS_URL_TEMPLATE.format(api_key=settings.gemini_api_key)

    try:
        async with websockets.connect(
            upstream_url,
            max_size=None,  # audio frames can be large
            ping_interval=20,
            ping_timeout=20,
        ) as upstream:
            async def client_to_gemini() -> None:
                try:
                    while True:
                        msg = await websocket.receive_text()
                        await upstream.send(msg)
                except WebSocketDisconnect:
                    return
                except Exception as exc:  # noqa: BLE001
                    logger.warning("[voice_gemini] client_to_gemini stopped: %s", exc)
                    return

            async def gemini_to_client() -> None:
                try:
                    async for msg in upstream:
                        if isinstance(msg, bytes):
                            # Gemini sends JSON frames as text; a binary frame
                            # would be unexpected. Decode best-effort.
                            try:
                                msg = msg.decode("utf-8")
                            except UnicodeDecodeError:
                                continue
                        await websocket.send_text(msg)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("[voice_gemini] gemini_to_client stopped: %s", exc)
                    return

            tasks = [
                asyncio.create_task(client_to_gemini()),
                asyncio.create_task(gemini_to_client()),
            ]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
    except Exception as exc:  # noqa: BLE001
        logger.exception("[voice_gemini] proxy error: %s", exc)
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass


# Health check that does NOT open a Gemini connection — lets the frontend
# verify the proxy route is alive and the key is configured.
@router.get("/gemini/health")
async def gemini_health() -> dict[str, bool]:
    return {
        "proxy": True,
        "gemini_key_configured": bool(settings.gemini_api_key),
    }


