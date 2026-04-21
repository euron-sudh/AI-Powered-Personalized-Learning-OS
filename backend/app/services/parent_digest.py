"""Wave 4: parent digest — weekly markdown report for a student."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import claude_client
from app.models.activity import ActivitySubmission
from app.models.chapter import Chapter
from app.models.flashcard import Flashcard
from app.models.progress import StudentProgress
from app.models.student import Student
from app.models.subject import Subject


async def build_digest(db: AsyncSession, student_id: uuid.UUID) -> dict:
    """Compose a weekly summary covering activity, scores, focus areas.

    Returns a dict with raw data + an AI-generated parent-friendly note.
    """
    student = await db.get(Student, student_id)
    if not student:
        return {"error": "student not found"}

    cutoff = datetime.utcnow() - timedelta(days=7)

    # Chapters completed in the last 7 days
    ch_result = await db.execute(
        select(Chapter.title, Subject.name)
        .join(Subject, Chapter.subject_id == Subject.id)
        .where(
            Subject.student_id == student_id,
            Chapter.status == "completed",
        )
        .order_by(desc(Chapter.id))
        .limit(20)
    )
    chapters_completed = [
        {"title": title, "subject": subject} for title, subject in ch_result.all()
    ]

    # Quiz scores in the last 7 days
    sub_result = await db.execute(
        select(ActivitySubmission.score, ActivitySubmission.submitted_at)
        .where(
            ActivitySubmission.student_id == student_id,
            ActivitySubmission.submitted_at >= cutoff,
            ActivitySubmission.score.is_not(None),
        )
    )
    weekly_scores = [int(s) for s, _ in sub_result.all() if s is not None]
    avg_score = round(sum(weekly_scores) / len(weekly_scores)) if weekly_scores else None

    # Flashcards due / reviewed
    fc_total = await db.execute(
        select(func.count(Flashcard.id)).where(Flashcard.student_id == student_id)
    )
    fc_reviewed = await db.execute(
        select(func.count(Flashcard.id)).where(
            Flashcard.student_id == student_id,
            Flashcard.last_reviewed_at >= cutoff,
        )
    )
    flashcards = {
        "total": int(fc_total.scalar() or 0),
        "reviewed_this_week": int(fc_reviewed.scalar() or 0),
    }

    # Top weaknesses across all subjects
    prog_result = await db.execute(
        select(StudentProgress.weaknesses, StudentProgress.strengths)
        .where(StudentProgress.student_id == student_id)
    )
    weaknesses: list[str] = []
    strengths: list[str] = []
    for w, s in prog_result.all():
        if w:
            weaknesses.extend(w)
        if s:
            strengths.extend(s)
    top_weak = list(dict.fromkeys(weaknesses))[:5]
    top_strong = list(dict.fromkeys(strengths))[:5]

    raw = {
        "student_name": student.name,
        "grade": student.grade,
        "week_ending": datetime.utcnow().date().isoformat(),
        "xp": student.xp,
        "level": student.level,
        "streak_days": student.streak_days,
        "longest_streak": student.longest_streak,
        "chapters_completed_recent": chapters_completed[:8],
        "weekly_quizzes": len(weekly_scores),
        "weekly_avg_score": avg_score,
        "flashcards": flashcards,
        "top_strengths": top_strong,
        "top_focus_areas": top_weak,
    }

    note = await _ai_summary(raw)
    raw["parent_note"] = note
    return raw


async def _ai_summary(data: dict) -> str:
    """Compose a short, warm parent-facing weekly note."""
    prompt = f"""You write short, warm weekly parent updates for a K-12 learning platform.

Tone: friendly, specific, parent-facing (not student-facing). 4-6 short sentences.
Lead with one bright spot, mention one focus area, end with one concrete suggestion.

Student data:
- Name: {data.get('student_name')}
- Grade: {data.get('grade')}
- Week ending: {data.get('week_ending')}
- Total XP: {data.get('xp')}, Level {data.get('level')}, Streak {data.get('streak_days')} days (longest {data.get('longest_streak')})
- Chapters recently completed: {[c['title'] + ' (' + c['subject'] + ')' for c in data.get('chapters_completed_recent', [])]}
- Quizzes this week: {data.get('weekly_quizzes')}, average {data.get('weekly_avg_score')}%
- Flashcards reviewed this week: {data.get('flashcards', {}).get('reviewed_this_week')} of {data.get('flashcards', {}).get('total')}
- Notable strengths: {data.get('top_strengths')}
- Focus areas: {data.get('top_focus_areas')}

Write the note as plain text. No markdown, no headers, no bullet list."""
    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return (msg.content[0].text or "").strip()
    except Exception:
        # Deterministic fallback so the page never breaks
        name = data.get("student_name") or "Your learner"
        avg = data.get("weekly_avg_score")
        streak = data.get("streak_days") or 0
        chapters = data.get("chapters_completed_recent", [])
        win = chapters[0]["title"] if chapters else "consistent practice"
        focus = (data.get("top_focus_areas") or ["broader review"])[0]
        return (
            f"{name} kept a {streak}-day streak going this week and made progress on {win}. "
            f"Their quiz average sits at {avg or 'still building'}%. "
            f"A short conversation about {focus} this weekend would help cement it. "
            f"Overall — steady, encouraging momentum."
        )
