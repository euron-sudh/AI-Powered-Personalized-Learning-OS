"""Wave 4: parent digest endpoint."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.services.parent_digest import build_digest

router = APIRouter()


@router.get("/digest")
async def parent_digest(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    student_id = uuid.UUID(user["sub"])
    return await build_digest(db, student_id)
