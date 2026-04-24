"""Wave 4: parent digest endpoint."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
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
    digest = await build_digest(db, student_id)
    # build_digest returns {"error": "student not found"} when there is no
    # students row for this UUID (e.g. the user hasn't onboarded yet).
    # Surface that as a proper 404 so the frontend can render an empty
    # state instead of dereferencing missing fields.
    if "error" in digest:
        raise HTTPException(status_code=404, detail=digest["error"])
    return digest
