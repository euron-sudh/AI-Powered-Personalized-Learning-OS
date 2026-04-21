import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, get_db_session
from app.dependencies import get_current_user
from app.models.flashcard import Flashcard
from app.models.student import Student
from app.services.flashcards import (
    XP_PER_QUALITY,
    deck_summary,
    generate_for_chapter,
    get_due_cards,
    sm2_update,
)
from app.services.gamification import award_xp

router = APIRouter()


class ReviewRequest(BaseModel):
    quality: int  # 1=Again, 2=Hard, 3=Good, 4=Easy


def _serialize(card: Flashcard) -> dict:
    return {
        "id": str(card.id),
        "chapter_id": str(card.chapter_id),
        "front": card.front,
        "back": card.back,
        "hint": card.hint,
        "due_date": card.due_date.isoformat() if card.due_date else None,
        "interval_days": card.interval_days,
        "repetitions": card.repetitions,
        "ease_factor": round(card.ease_factor, 2),
    }


@router.get("/due")
async def due_cards(
    limit: int = 50,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    cards = await get_due_cards(db, student_id, limit=limit)
    summary = await deck_summary(db, student_id)
    return {"cards": [_serialize(c) for c in cards], "summary": summary}


@router.get("/summary")
async def deck_overview(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    return await deck_summary(db, student_id)


@router.post("/{card_id}/review")
async def review_card(
    card_id: str,
    data: ReviewRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    if data.quality not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="quality must be 1-4")
    student_id = uuid.UUID(user["sub"])
    card = await db.get(Flashcard, uuid.UUID(card_id))
    if not card or card.student_id != student_id:
        raise HTTPException(status_code=404, detail="Card not found")

    sm2_update(card, data.quality)

    xp_gained = XP_PER_QUALITY.get(data.quality, 0)
    student = await db.get(Student, student_id)
    if student and xp_gained > 0:
        await award_xp(student, xp_gained, f"flashcard:{card_id}")

    await db.commit()
    return {
        "card": _serialize(card),
        "xp_awarded": xp_gained,
        "new_xp": student.xp if student else None,
        "new_level": student.level if student else None,
    }


@router.post("/chapter/{chapter_id}/generate")
async def generate_chapter_cards(
    chapter_id: str,
    force: bool = False,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    try:
        chapter_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid chapter id")
    created = await generate_for_chapter(db, student_id, chapter_uuid, force=force)
    return {"created": created}


@router.post("/generate-missing")
async def generate_missing(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Backfill flashcards for every completed chapter the student has no cards for.

    Returns immediately and runs generation in the background to avoid blocking the UI.
    """
    student_id = uuid.UUID(user["sub"])

    from sqlalchemy import select
    from app.models.chapter import Chapter
    from app.models.subject import Subject

    result = await db.execute(
        select(Chapter.id)
        .join(Subject, Chapter.subject_id == Subject.id)
        .where(Subject.student_id == student_id, Chapter.status == "completed")
    )
    chapter_ids = [row for (row,) in result.all()]

    async def _bg():
        async with async_session() as bg_db:
            for cid in chapter_ids:
                try:
                    await generate_for_chapter(bg_db, student_id, cid)
                except Exception:
                    pass

    asyncio.create_task(_bg())
    return {"queued_chapters": len(chapter_ids)}
