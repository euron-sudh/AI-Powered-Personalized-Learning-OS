"""
Tutor Session API Routes

Endpoints for managing AI tutor sessions with LangGraph state machine.
"""

import json
from typing import Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.core.database import get_db_session
from app.services.tutor_session_engine import TutorSessionEngine


router = APIRouter(tags=["tutor-session"])


# =====================
# REQUEST/RESPONSE MODELS
# =====================

class StartSessionRequest(BaseModel):
    chapter_id: str
    topic: str = ""


class StartSessionResponse(BaseModel):
    session_id: str
    status: str = "started"


class PushEmotionRequest(BaseModel):
    emotion: str
    confidence: float


class SessionStateResponse(BaseModel):
    session_id: str
    student_id: str
    chapter_id: str
    topic: str
    stage: str
    emotion: str
    mastery: float
    confusion_count: int
    engagement_score: float


# =====================
# REST ENDPOINTS
# =====================

@router.post("/start", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    user: dict = Depends(get_current_user),
    db_session = Depends(get_db_session),
) -> StartSessionResponse:
    """
    Create a new tutor session for the student in the given chapter.
    This initializes the LangGraph state machine.
    """
    try:
        student_id = user["sub"]
        chapter_id = request.chapter_id

        # Create TutorSessionEngine and initialize session
        engine = TutorSessionEngine(db_session)
        session_id = await engine.create_session(student_id, chapter_id, db_session)

        # Log initial event
        await engine.log_event(
            session_id,
            "SESSION_STARTED",
            {"topic": request.topic, "student_id": student_id},
            db_session
        )

        return StartSessionResponse(session_id=session_id, status="started")

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting session: {str(e)}")


@router.post("/emotion")
async def push_emotion(
    request: PushEmotionRequest,
    session_id: str,
    user: dict = Depends(get_current_user),
    db_session = Depends(get_db_session),
) -> dict:
    """
    Push student emotion data to trigger state machine step.
    The emotion is injected into the LangGraph state and drives adaptive routing.
    """
    try:
        # Update learning_sessions with new emotion
        from sqlalchemy import text
        await db_session.execute(
            text("""
                UPDATE learning_sessions
                SET emotion = :emotion
                WHERE id = :session_id AND student_id = :student_id
            """),
            {
                "session_id": session_id,
                "student_id": user["sub"],
                "emotion": request.emotion,
            }
        )
        await db_session.commit()

        # Log emotion event
        engine = TutorSessionEngine(db_session)
        await engine.log_event(
            session_id,
            "EMOTION_DETECTED",
            {
                "emotion": request.emotion,
                "confidence": request.confidence,
            },
            db_session
        )

        return {
            "status": "emotion_received",
            "emotion": request.emotion,
            "confidence": request.confidence,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error pushing emotion: {str(e)}")


@router.get("/{session_id}", response_model=SessionStateResponse)
async def get_session_state(
    session_id: str,
    user: dict = Depends(get_current_user),
    db_session = Depends(get_db_session),
) -> SessionStateResponse:
    """
    Get current session state (stage, emotion, mastery, etc.)
    """
    try:
        from sqlalchemy import text, select

        # Fetch from learning_sessions table
        result = await db_session.execute(
            text("""
                SELECT id, student_id, chapter_id, topic, stage, emotion, mastery, confusion_count, engagement_score
                FROM learning_sessions
                WHERE id = :session_id AND student_id = :student_id
            """),
            {"session_id": session_id, "student_id": user["sub"]}
        )

        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")

        return SessionStateResponse(
            session_id=row[0],
            student_id=row[1],
            chapter_id=row[2],
            topic=row[3],
            stage=row[4],
            emotion=row[5],
            mastery=row[6],
            confusion_count=row[7],
            engagement_score=row[8],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching session state: {str(e)}")


# =====================
# WEBSOCKET ENDPOINT
# =====================

class ConnectionManager:
    """Manage WebSocket connections for real-time event streaming"""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def broadcast(self, session_id: str, message: dict):
        """Broadcast event to all connected clients for this session"""
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to WebSocket: {e}")


manager = ConnectionManager()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time tutor event streaming.
    Client receives tutor_events as they happen.

    Auth: Query param ?token={supabase_jwt}
    """
    # Extract token from query params for auth
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return

    # Verify token (would normally use get_current_user, but that's HTTP)
    try:
        # For now, trust the token from NEXT_PUBLIC_API_URL proxy
        # In production, verify with: auth = supabase_client.auth.get_user(token)
        pass
    except Exception as e:
        await websocket.close(code=4003, reason="Invalid token")
        return

    await manager.connect(session_id, websocket)
    try:
        while True:
            # Receive heartbeat/keep-alive from client
            data = await websocket.receive_text()

            # Optionally echo back or process commands
            if data == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(session_id, websocket)


async def stream_tutor_events(session_id: str, db_session) -> None:
    """
    Background task to stream tutor_events from Supabase Realtime.
    This would be called when a client connects to the WebSocket.
    """
    try:
        # Subscribe to tutor_events table via Supabase Realtime
        # This is a simplified version; in production use supabase-py's realtime subscription

        # For now, fetch recent events and send them
        from sqlalchemy import text
        result = await db_session.execute(
            text("""
                SELECT id, event_type, payload, created_at
                FROM tutor_events
                WHERE session_id = :session_id
                ORDER BY created_at DESC
                LIMIT 10
            """),
            {"session_id": session_id}
        )

        rows = result.fetchall()
        for row in rows:
            event = {
                "id": str(row[0]),
                "event_type": row[1],
                "payload": json.loads(row[2]) if row[2] else {},
                "created_at": str(row[3]),
            }
            await manager.broadcast(session_id, event)

    except Exception as e:
        print(f"Error streaming tutor events: {e}")
