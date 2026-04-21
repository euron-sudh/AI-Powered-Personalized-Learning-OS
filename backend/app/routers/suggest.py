"""Wave 7: next-best-action recommendation that combines all signals."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.activity import ActivitySubmission
from app.models.flashcard import Flashcard
from app.models.mastery import UserGlobalStats
from app.models.mood import MoodLog
from app.services.adaptive import aggregate_weaknesses

router = APIRouter()


def _streak_about_to_break(stats: UserGlobalStats | None) -> bool:
    if not stats or not stats.last_active_date:
        return False
    return stats.last_active_date < date.today()


@router.get("/next-best-action")
async def next_best_action(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Returns up to 3 prioritized recommended actions tailored to the student.

    Each action: {priority, title, reason, cta_label, href, icon}
    """
    sid = uuid.UUID(user["sub"])
    today = date.today()

    # Signals
    due_count_res = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.student_id == sid, Flashcard.due_date <= today
        )
    )
    due_count = int(due_count_res.scalar() or 0)

    stats = await db.get(UserGlobalStats, sid)
    streak_risk = _streak_about_to_break(stats)
    streak_days = stats.streak_days if stats else 0

    # Most recent quiz score (last 3 days)
    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    score_res = await db.execute(
        select(ActivitySubmission.score)
        .where(
            ActivitySubmission.student_id == sid,
            ActivitySubmission.submitted_at >= cutoff,
            ActivitySubmission.score.is_not(None),
        )
        .order_by(desc(ActivitySubmission.submitted_at))
        .limit(5)
    )
    recent_scores = [int(s) for s in score_res.scalars().all() if s is not None]
    avg_recent = sum(recent_scores) / len(recent_scores) if recent_scores else None

    # Recent mood
    mood_cutoff = datetime.now(timezone.utc) - timedelta(hours=12)
    mood_res = await db.execute(
        select(MoodLog)
        .where(MoodLog.student_id == sid, MoodLog.created_at >= mood_cutoff)
        .order_by(desc(MoodLog.created_at))
        .limit(1)
    )
    last_mood = mood_res.scalar_one_or_none()

    # Weak subjects
    weak = await aggregate_weaknesses(db, sid)
    top_weak = (weak.get("top_weaknesses") or [])[:1]

    actions: list[dict] = []

    # 1) Streak protection beats everything else when at risk
    if streak_risk and streak_days >= 1:
        actions.append({
            "priority": 1,
            "title": f"Keep your {streak_days}-day streak alive",
            "reason": "You haven't done anything today.",
            "cta_label": "Quick review",
            "href": "/review",
            "icon": "flame",
        })

    # 2) Due flashcards
    if due_count >= 5:
        actions.append({
            "priority": 2 if streak_risk else 1,
            "title": f"{due_count} flashcards are due",
            "reason": "Spaced repetition works best when you don't let cards pile up.",
            "cta_label": "Start review",
            "href": "/review",
            "icon": "layers",
        })
    elif due_count > 0 and not streak_risk:
        actions.append({
            "priority": 3,
            "title": f"{due_count} cards due — quick win",
            "reason": "A 2-minute review keeps things sharp.",
            "cta_label": "Review",
            "href": "/review",
            "icon": "layers",
        })

    # 3) Mood-driven nudge
    if last_mood:
        if last_mood.mood == "stuck":
            actions.append({
                "priority": 2,
                "title": "Try story mode to unblock",
                "reason": "You said you felt stuck — sometimes a different angle helps.",
                "cta_label": "Open story mode",
                "href": "/learn",
                "icon": "book",
            })
        elif last_mood.mood == "tired":
            actions.append({
                "priority": 4,
                "title": "Easy mode: a few flashcards",
                "reason": "Low energy — keep momentum without burning out.",
                "cta_label": "5-min review",
                "href": "/review",
                "icon": "battery-low",
            })
        elif last_mood.mood in ("focused", "happy") and not actions:
            actions.append({
                "priority": 1,
                "title": "Tackle a tougher chapter",
                "reason": "You're feeling good — ride the wave.",
                "cta_label": "Open Learn",
                "href": "/learn",
                "icon": "rocket",
            })

    # 4) Recent low scores → focus area
    if avg_recent is not None and avg_recent < 60 and top_weak:
        sname = top_weak[0].get("subject_name", "your weak subject")
        actions.append({
            "priority": 2,
            "title": f"Practice {sname} — recent quizzes < 60%",
            "reason": "Targeted practice closes the gap fastest.",
            "cta_label": "Practice now",
            "href": "/practice",
            "icon": "target",
        })

    # 5) Build something — when scores are strong and no urgent items
    if avg_recent is not None and avg_recent >= 80 and not actions:
        actions.append({
            "priority": 1,
            "title": "You're ready for a project",
            "reason": "Recent quiz average ≥ 80%. Apply it.",
            "cta_label": "Open Project mode",
            "href": "/project",
            "icon": "hammer",
        })

    # 6) Mood check-in if absent
    if not last_mood:
        actions.append({
            "priority": 5,
            "title": "Quick mood check-in",
            "reason": "Helps tailor what to suggest next.",
            "cta_label": "Check in",
            "href": "/focus",
            "icon": "heart-pulse",
        })

    # Default fallback so we always show something
    if not actions:
        actions.append({
            "priority": 5,
            "title": "Pick up where you left off",
            "reason": "No urgent items — keep the momentum.",
            "cta_label": "Open Learn",
            "href": "/learn",
            "icon": "book-open",
        })

    actions.sort(key=lambda a: a["priority"])
    return {
        "actions": actions[:3],
        "signals": {
            "due_cards": due_count,
            "streak_days": streak_days,
            "streak_at_risk": streak_risk,
            "recent_avg_score": avg_recent,
            "last_mood": last_mood.mood if last_mood else None,
            "top_weakness": (top_weak[0].get("subject_name") if top_weak else None),
        },
    }
