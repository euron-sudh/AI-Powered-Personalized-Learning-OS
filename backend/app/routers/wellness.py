"""Wave 6: wellness — mood check-in + study session timer logs."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.mood import MoodLog

router = APIRouter()


# ── Mood check-in ────────────────────────────────────────────────────────

MoodLiteral = Literal["happy", "calm", "focused", "tired", "stressed", "stuck"]


class MoodIn(BaseModel):
    mood: MoodLiteral
    energy: int = Field(ge=1, le=5)
    note: str | None = None


class MoodOut(BaseModel):
    id: str
    mood: str
    energy: int
    note: str | None
    created_at: datetime
    suggestion: str


_SUGGESTIONS = {
    "happy":   "You're flying — good time to tackle something challenging.",
    "calm":    "Steady mood — perfect for a deep-focus chapter.",
    "focused": "Lock in for 25 minutes with the Pomodoro and ride the wave.",
    "tired":   "Try a short flashcard review (5 minutes) instead of a new lesson.",
    "stressed":"Take 3 slow breaths. A quick win on the Study Buddy might help reset.",
    "stuck":   "Switch modes — try Story mode or scan a doubt to unblock yourself.",
}


@router.post("/mood", response_model=MoodOut)
async def log_mood(
    data: MoodIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    sid = uuid.UUID(user["sub"])
    log = MoodLog(student_id=sid, mood=data.mood, energy=data.energy, note=data.note)
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return MoodOut(
        id=str(log.id),
        mood=log.mood,
        energy=log.energy,
        note=log.note,
        created_at=log.created_at,
        suggestion=_SUGGESTIONS.get(data.mood, "Have a great session!"),
    )


@router.get("/mood/today")
async def mood_today(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """The most recent mood log within the last 12 hours, if any."""
    sid = uuid.UUID(user["sub"])
    cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    res = await db.execute(
        select(MoodLog)
        .where(MoodLog.student_id == sid, MoodLog.created_at >= cutoff)
        .order_by(desc(MoodLog.created_at))
        .limit(1)
    )
    log = res.scalar_one_or_none()
    if not log:
        return {"checked_in": False}
    return {
        "checked_in": True,
        "mood": log.mood,
        "energy": log.energy,
        "created_at": log.created_at,
        "suggestion": _SUGGESTIONS.get(log.mood, ""),
    }


@router.get("/mood/history")
async def mood_history(
    days: int = 14,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    sid = uuid.UUID(user["sub"])
    cutoff = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 60)))
    res = await db.execute(
        select(MoodLog)
        .where(MoodLog.student_id == sid, MoodLog.created_at >= cutoff)
        .order_by(MoodLog.created_at)
    )
    rows = res.scalars().all()
    return {
        "logs": [
            {"mood": r.mood, "energy": r.energy, "at": r.created_at.isoformat()}
            for r in rows
        ]
    }


# ── Pomodoro completion ping (logged as an "energy" mood event) ──────────

class PomodoroIn(BaseModel):
    minutes: int = Field(ge=1, le=120)
    chapter_id: str | None = None


@router.post("/pomodoro/complete")
async def pomodoro_complete(
    data: PomodoroIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Log a completed pomodoro. Returns a short congratulatory line."""
    sid = uuid.UUID(user["sub"])
    note = f"Pomodoro {data.minutes}m" + (f" · chapter {data.chapter_id}" if data.chapter_id else "")
    log = MoodLog(student_id=sid, mood="focused", energy=4, note=note)
    db.add(log)
    await db.commit()
    return {
        "ok": True,
        "minutes": data.minutes,
        "message": f"Nice — {data.minutes} focused minutes logged. Take a short break!",
    }
