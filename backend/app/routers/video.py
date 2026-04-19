import uuid

from fastapi import APIRouter, Depends, Query, Request, Response, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.rate_limiter import limiter
from app.core.security import verify_supabase_jwt
from app.dependencies import get_current_user
from app.models.sentiment_log import SentimentLog
from app.schemas.sentiment import SentimentRequest, SentimentResponse
from app.services.sentiment_analyzer import analyze_frame, determine_adaptive_action

router = APIRouter()


@router.post("/analyze", response_model=SentimentResponse)
@limiter.limit("60/minute")
async def analyze_frame_route(
    request: Request,
    data: SentimentRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Analyze a video frame for student sentiment via Claude Vision and persist the result."""
    student_id = uuid.UUID(user["sub"])

    result = await analyze_frame(data.frame_base64)
    emotion = result.get("emotion", "engaged")
    confidence = result.get("confidence", 0.5)
    action = determine_adaptive_action(emotion, confidence)

    # Parse chapter_id if provided (optional — logs are saved regardless)
    chapter_uuid: uuid.UUID | None = None
    if data.chapter_id:
        try:
            chapter_uuid = uuid.UUID(data.chapter_id)
        except ValueError:
            pass

    log = SentimentLog(
        student_id=student_id,
        chapter_id=chapter_uuid,
        emotion=emotion,
        confidence=confidence,
        action_taken=action,
    )
    db.add(log)
    await db.commit()

    return SentimentResponse(emotion=emotion, confidence=confidence, action_taken=action)


@router.websocket("/sentiment/ws")
async def sentiment_websocket(
    websocket: WebSocket,
    token: str = Query(..., description="Supabase JWT for authentication"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Live sentiment WebSocket endpoint.

    Client sends JSON frames: {"frame_base64": "...", "chapter_id": "uuid-or-null"}
    Server responds with: {"emotion": "...", "confidence": 0.9, "action_taken": "..."}

    Authentication via ?token=<supabase-jwt> query parameter (browsers cannot send
    custom headers on WebSocket connections).
    """
    user = await verify_supabase_jwt(token)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    student_id = uuid.UUID(user["sub"])

    try:
        while True:
            data = await websocket.receive_json()
            frame_base64: str | None = data.get("frame_base64")
            chapter_id_str: str | None = data.get("chapter_id")

            if not frame_base64:
                continue

            result = await analyze_frame(frame_base64)
            emotion = result.get("emotion", "engaged")
            confidence = result.get("confidence", 0.5)
            action = determine_adaptive_action(emotion, confidence)

            chapter_uuid: uuid.UUID | None = None
            if chapter_id_str:
                try:
                    chapter_uuid = uuid.UUID(chapter_id_str)
                except ValueError:
                    pass

            log = SentimentLog(
                student_id=student_id,
                chapter_id=chapter_uuid,
                emotion=emotion,
                confidence=confidence,
                action_taken=action,
            )
            db.add(log)
            await db.commit()

            await websocket.send_json({
                "emotion": emotion,
                "confidence": confidence,
                "action_taken": action,
            })

    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@router.get("/sentiment/history")
async def get_sentiment_history(
    response: Response,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    limit: int = 100,
):
    """Return the student's recent sentiment log entries."""
    student_id = uuid.UUID(user["sub"])

    result = await db.execute(
        select(SentimentLog)
        .where(SentimentLog.student_id == student_id)
        .order_by(SentimentLog.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    response.headers["Cache-Control"] = "private, max-age=30"

    return [
        {
            "emotion": log.emotion,
            "confidence": log.confidence,
            "action_taken": log.action_taken,
            "timestamp": log.timestamp.isoformat(),
            "chapter_id": str(log.chapter_id) if log.chapter_id else None,
        }
        for log in logs
    ]
