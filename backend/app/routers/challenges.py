import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.services.gamification import (
    claim_challenge,
    get_today_challenges,
    level_for_xp,
    xp_into_level,
)
from app.models.student import Student

router = APIRouter()


@router.get("/today")
async def todays_challenges(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    challenges = await get_today_challenges(db, student_id)
    return {"challenges": challenges}


@router.post("/{code}/claim")
async def claim(
    code: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    result = await claim_challenge(db, student_id, code)
    if not result.get("ok"):
        err = result.get("error", "claim_failed")
        status = 409 if err in {"already_claimed", "not_completed"} else 400
        raise HTTPException(status_code=status, detail=err)
    return result


@router.get("/xp")
async def xp_summary(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Lightweight XP/level snapshot for UI progress bars."""
    student = await db.get(Student, uuid.UUID(user["sub"]))
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    into, needed = xp_into_level(student.xp or 0)
    return {
        "xp": student.xp or 0,
        "level": student.level or level_for_xp(student.xp or 0),
        "xp_into_level": into,
        "xp_to_next_level": needed,
        "streak_days": student.streak_days or 0,
        "longest_streak": student.longest_streak or 0,
    }
