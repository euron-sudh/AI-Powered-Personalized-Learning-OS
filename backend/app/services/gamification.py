"""Wave 1 gamification: XP awards, streak with grace days, daily challenges."""
from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivitySubmission
from app.models.daily_challenge import DailyChallengeClaim
from app.models.student import Student

# Tunable constants
XP_PER_LEVEL = 500          # Flat XP cost per level (level = xp // 500 + 1)
GRACE_DAYS_PER_WEEK = 1     # Free streak freezes per ISO week
CHALLENGE_XP_BONUS = 50     # XP awarded when a daily challenge is claimed


def level_for_xp(xp: int) -> int:
    """Linear leveling. Level 1 starts at 0 XP; each level needs XP_PER_LEVEL more."""
    if xp <= 0:
        return 1
    return (xp // XP_PER_LEVEL) + 1


def xp_into_level(xp: int) -> tuple[int, int]:
    """Return (xp_into_current_level, xp_needed_to_next_level)."""
    into = xp % XP_PER_LEVEL
    return into, XP_PER_LEVEL


def _iso_week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


async def update_streak_and_activity(student: Student, today: date | None = None) -> dict:
    """Mutates student in-place. Returns a summary of the streak transition.

    Streak rules:
    - Same day: no change.
    - Next day: streak += 1.
    - Gap of 2+ days: try to spend a free weekly grace day; otherwise reset to 1.
    - First-ever activity: streak starts at 1.
    """
    today = today or date.today()
    summary = {"changed": False, "grace_used": False, "reset": False, "broke": False}

    week_start = _iso_week_start(today)
    if student.streak_freeze_week_start != week_start:
        student.streak_freeze_week_start = week_start
        student.streak_freezes_used = 0

    last = student.last_active_date
    if last is None:
        student.streak_days = 1
        summary["changed"] = True
    elif last == today:
        pass  # no-op
    elif last == today - timedelta(days=1):
        student.streak_days += 1
        summary["changed"] = True
    else:
        gap = (today - last).days
        if gap == 2 and student.streak_freezes_used < GRACE_DAYS_PER_WEEK:
            student.streak_freezes_used += 1
            student.streak_days += 1
            summary["changed"] = True
            summary["grace_used"] = True
        else:
            student.streak_days = 1
            summary["reset"] = True
            summary["broke"] = True

    if student.streak_days > (student.longest_streak or 0):
        student.longest_streak = student.streak_days

    student.last_active_date = today
    student.last_active_os = datetime.utcnow()
    return summary


async def award_xp(student: Student, amount: int, _reason: str = "") -> dict:
    """Add XP and recompute level. Returns delta info."""
    if amount <= 0:
        return {"awarded": 0, "level_up": False, "new_level": student.level, "new_xp": student.xp}
    old_level = student.level or 1
    student.xp = (student.xp or 0) + amount
    new_level = level_for_xp(student.xp)
    student.level = new_level
    return {
        "awarded": amount,
        "level_up": new_level > old_level,
        "new_level": new_level,
        "new_xp": student.xp,
    }


def xp_for_quiz_score(score: int) -> int:
    """Score-tiered XP for a quiz."""
    if score >= 90:
        return 150
    if score >= 75:
        return 100
    if score >= 60:
        return 60
    if score >= 40:
        return 30
    return 10


# ── Daily challenges ────────────────────────────────────────────────────────

# Static challenge catalog. Completion is computed live from existing tables.
CHALLENGES = [
    {
        "code": "complete_lesson",
        "title": "Complete a lesson",
        "description": "Finish any chapter today",
        "xp": CHALLENGE_XP_BONUS,
        "icon": "📖",
    },
    {
        "code": "ace_quiz",
        "title": "Ace a quiz",
        "description": "Score 80% or higher on any quiz",
        "xp": CHALLENGE_XP_BONUS,
        "icon": "🎯",
    },
    {
        "code": "keep_streak",
        "title": "Keep your streak alive",
        "description": "Open the app and learn something today",
        "xp": CHALLENGE_XP_BONUS,
        "icon": "🔥",
    },
]


async def _completion_state(
    db: AsyncSession, student_id: uuid.UUID, today: date
) -> dict[str, bool]:
    """Compute live completion state for each challenge code."""
    start_dt = datetime.combine(today, datetime.min.time())
    end_dt = start_dt + timedelta(days=1)

    # ace_quiz / complete_lesson: look at activity submissions today
    result = await db.execute(
        select(ActivitySubmission.score)
        .where(
            ActivitySubmission.student_id == student_id,
            ActivitySubmission.submitted_at >= start_dt,
            ActivitySubmission.submitted_at < end_dt,
        )
    )
    scores = [s for (s,) in result.all() if s is not None]

    # keep_streak: any submission OR last_active_date == today
    student = await db.get(Student, student_id)
    streak_ok = (student is not None and student.last_active_date == today) or bool(scores)

    return {
        "complete_lesson": len(scores) > 0,
        "ace_quiz": any(s >= 80 for s in scores),
        "keep_streak": streak_ok,
    }


async def get_today_challenges(db: AsyncSession, student_id: uuid.UUID) -> list[dict]:
    """Return today's three challenges with completion + claim state."""
    today = date.today()

    completed = await _completion_state(db, student_id, today)

    claims_result = await db.execute(
        select(DailyChallengeClaim.challenge_code).where(
            DailyChallengeClaim.student_id == student_id,
            DailyChallengeClaim.challenge_date == today,
        )
    )
    claimed_codes = {c for (c,) in claims_result.all()}

    return [
        {
            **ch,
            "completed": completed.get(ch["code"], False),
            "claimed": ch["code"] in claimed_codes,
        }
        for ch in CHALLENGES
    ]


async def claim_challenge(
    db: AsyncSession, student_id: uuid.UUID, code: str
) -> dict:
    """Claim XP for a completed challenge. Idempotent per (student, date, code)."""
    challenge = next((c for c in CHALLENGES if c["code"] == code), None)
    if not challenge:
        return {"ok": False, "error": "unknown_challenge"}

    today = date.today()

    completed = await _completion_state(db, student_id, today)
    if not completed.get(code, False):
        return {"ok": False, "error": "not_completed"}

    existing = await db.get(DailyChallengeClaim, (student_id, today, code))
    if existing:
        return {"ok": False, "error": "already_claimed"}

    student = await db.get(Student, student_id)
    if not student:
        return {"ok": False, "error": "no_student"}

    xp_info = await award_xp(student, challenge["xp"], f"challenge:{code}")
    db.add(DailyChallengeClaim(
        student_id=student_id,
        challenge_date=today,
        challenge_code=code,
        xp_awarded=challenge["xp"],
    ))
    await db.commit()

    return {
        "ok": True,
        "xp_awarded": challenge["xp"],
        "new_xp": xp_info["new_xp"],
        "new_level": xp_info["new_level"],
        "level_up": xp_info["level_up"],
    }
