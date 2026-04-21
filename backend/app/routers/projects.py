"""Wave 6: project mode — AI generates a real-world build that ties chapters together."""
from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import claude_client
from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.student import Student
from app.models.subject import Subject

router = APIRouter()


class ProjectIn(BaseModel):
    subject_id: str | None = None
    chapter_ids: list[str] | None = None
    theme: str | None = None  # student-supplied vibe, e.g. "space", "music"


@router.post("/generate")
async def generate_project(
    data: ProjectIn,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Generate a 4-7 day real-world project that applies recent chapters.

    Returns:
      {
        "title": str,
        "pitch": str,
        "estimated_days": int,
        "skills_used": [str],
        "milestones": [{"day": 1, "title": "...", "tasks": ["...", "..."], "deliverable": "..."}],
        "stretch_goal": str
      }
    """
    sid = uuid.UUID(user["sub"])
    student = await db.get(Student, sid)
    if not student:
        raise HTTPException(status_code=404, detail="student not found")
    grade = student.grade or "8"
    interests = ", ".join(student.interests or []) or "general"

    chapter_titles: list[str] = []
    subject_name = "general study"
    if data.subject_id:
        try:
            subj = await db.get(Subject, uuid.UUID(data.subject_id))
            if subj:
                subject_name = subj.name
        except ValueError:
            pass

    if data.chapter_ids:
        ids = []
        for cid in data.chapter_ids[:6]:
            try:
                ids.append(uuid.UUID(cid))
            except ValueError:
                continue
        if ids:
            res = await db.execute(select(Chapter).where(Chapter.id.in_(ids)))
            chapter_titles = [c.title for c in res.scalars().all()]
    elif data.subject_id:
        try:
            subj_uuid = uuid.UUID(data.subject_id)
            res = await db.execute(
                select(Chapter)
                .where(Chapter.subject_id == subj_uuid)
                .order_by(Chapter.order_index)
                .limit(5)
            )
            chapter_titles = [c.title for c in res.scalars().all()]
        except ValueError:
            pass

    theme = data.theme or interests
    chapters_str = "; ".join(chapter_titles) or "(any recent material)"

    prompt = f"""Design a hands-on project for a grade {grade} student studying {subject_name}.
Recent chapters: {chapters_str}
Student's interests / theme: {theme}

The project should be doable in 4-7 days using everyday materials (no special equipment),
must apply ideas from at least 2 of the chapters listed, and end with something the student
can SHOW (a build, a poster, a small program, a short video, a written report).

Return STRICT JSON only:
{{
  "title": "...",
  "pitch": "1-2 sentence why this is exciting",
  "estimated_days": 5,
  "skills_used": ["...", "..."],
  "milestones": [
    {{"day": 1, "title": "...", "tasks": ["...", "..."], "deliverable": "..."}},
    ...
  ],
  "stretch_goal": "an optional harder add-on"
}}
No text outside the JSON."""

    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = (msg.content[0].text or "").strip()
        s = text.find("{")
        e = text.rfind("}") + 1
        return json.loads(text[s:e])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"project generation failed: {exc}")
