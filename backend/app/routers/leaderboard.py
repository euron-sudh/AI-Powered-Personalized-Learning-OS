"""Wave 4: leaderboards (total + weekly XP)."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.activity import ActivitySubmission
from app.models.student import Student

router = APIRouter()


def _display_name(name: str | None, grade: str | None, sid: uuid.UUID) -> str:
    """Pseudonymous display: first name + last initial + grade tag.

    Fully anonymous fallback uses the last 4 chars of the UUID.
    """
    if name and name.strip():
        parts = name.strip().split()
        first = parts[0]
        initial = (parts[-1][:1].upper() + ".") if len(parts) > 1 else ""
        return f"{first} {initial}".strip() + (f" · G{grade}" if grade else "")
    return f"Learner-{str(sid)[-4:].upper()}" + (f" · G{grade}" if grade else "")


@router.get("")
async def leaderboard(
    scope: str = Query("all_time", regex="^(all_time|weekly)$"),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Top learners by XP (or by recent quiz score gains for `weekly`)."""
    me_id = uuid.UUID(user["sub"])

    if scope == "weekly":
        # Sum quiz scores submitted in the last 7 days as a "weekly XP" proxy
        cutoff = datetime.utcnow() - timedelta(days=7)
        weekly_q = (
            select(
                ActivitySubmission.student_id.label("sid"),
                func.sum(ActivitySubmission.score).label("weekly_score"),
            )
            .where(
                ActivitySubmission.submitted_at >= cutoff,
                ActivitySubmission.score.is_not(None),
            )
            .group_by(ActivitySubmission.student_id)
            .subquery()
        )
        rows_q = (
            select(
                Student.id, Student.name, Student.grade, Student.level,
                Student.streak_days, weekly_q.c.weekly_score,
            )
            .join(weekly_q, weekly_q.c.sid == Student.id)
            .order_by(desc(weekly_q.c.weekly_score))
            .limit(limit)
        )
    else:
        rows_q = (
            select(
                Student.id, Student.name, Student.grade, Student.level,
                Student.streak_days, Student.xp,
            )
            .where(Student.xp > 0)
            .order_by(desc(Student.xp), desc(Student.level))
            .limit(limit)
        )

    result = await db.execute(rows_q)
    rows = result.all()

    entries = []
    me_entry = None
    for rank, row in enumerate(rows, start=1):
        sid = row[0]
        score = int(row[5] or 0)
        entry = {
            "rank": rank,
            "is_me": sid == me_id,
            "display_name": _display_name(row[1], row[2], sid),
            "grade": row[2],
            "level": row[3] or 1,
            "streak_days": row[4] or 0,
            "score": score,
            "score_label": "weekly pts" if scope == "weekly" else "XP",
        }
        if entry["is_me"]:
            me_entry = entry
        entries.append(entry)

    # If the user isn't in the top, compute their rank cheaply
    if me_entry is None:
        if scope == "weekly":
            cutoff = datetime.utcnow() - timedelta(days=7)
            my_score_q = await db.execute(
                select(func.coalesce(func.sum(ActivitySubmission.score), 0))
                .where(
                    ActivitySubmission.student_id == me_id,
                    ActivitySubmission.submitted_at >= cutoff,
                )
            )
            my_score = int(my_score_q.scalar() or 0)
            rank_q = await db.execute(
                select(func.count(func.distinct(ActivitySubmission.student_id)))
                .where(
                    ActivitySubmission.submitted_at >= cutoff,
                    ActivitySubmission.score.is_not(None),
                )
                .group_by(ActivitySubmission.student_id)
                .having(func.sum(ActivitySubmission.score) > my_score)
            )
            ranks_above = len(rank_q.all())
        else:
            me = await db.get(Student, me_id)
            my_score = me.xp if me else 0
            rank_q = await db.execute(
                select(func.count(Student.id)).where(Student.xp > my_score)
            )
            ranks_above = int(rank_q.scalar() or 0)

        me = await db.get(Student, me_id)
        if me:
            me_entry = {
                "rank": ranks_above + 1,
                "is_me": True,
                "display_name": _display_name(me.name, me.grade, me.id),
                "grade": me.grade,
                "level": me.level or 1,
                "streak_days": me.streak_days or 0,
                "score": int(my_score),
                "score_label": "weekly pts" if scope == "weekly" else "XP",
            }

    return {"scope": scope, "entries": entries, "me": me_entry}
