import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.notes import StudentNote

router = APIRouter()


class NoteUpsert(BaseModel):
    content: str


@router.get("/{chapter_id}")
async def get_note(
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    chapter_uuid = uuid.UUID(chapter_id)
    result = await db.execute(
        select(StudentNote).where(
            StudentNote.student_id == student_id,
            StudentNote.chapter_id == chapter_uuid,
        )
    )
    note = result.scalar_one_or_none()
    return {"content": note.content if note else ""}


@router.put("/{chapter_id}")
async def save_note(
    chapter_id: str,
    body: NoteUpsert,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    chapter_uuid = uuid.UUID(chapter_id)
    result = await db.execute(
        select(StudentNote).where(
            StudentNote.student_id == student_id,
            StudentNote.chapter_id == chapter_uuid,
        )
    )
    note = result.scalar_one_or_none()
    if note:
        note.content = body.content
    else:
        note = StudentNote(student_id=student_id, chapter_id=chapter_uuid, content=body.content)
        db.add(note)
    await db.commit()
    return {"content": body.content}
