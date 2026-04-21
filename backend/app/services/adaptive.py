"""Wave 3: adaptive difficulty + weakness aggregation + memory callbacks.

Pure helpers — no router dependencies. Composable by activities.py, lessons.py
and progress.py.
"""
from __future__ import annotations

import uuid
from collections import Counter
from datetime import date, datetime, timedelta
from typing import Literal

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivitySubmission, Activity
from app.models.chapter import Chapter
from app.models.flashcard import Flashcard
from app.models.progress import StudentProgress

Difficulty = Literal["easier", "standard", "harder"]


async def compute_difficulty(
    db: AsyncSession, student_id: uuid.UUID, subject_id: uuid.UUID
) -> Difficulty:
    """Pick the next quiz's difficulty based on recent performance in this subject.

    Heuristic — recent 5 submissions in this subject:
      avg < 55  → easier
      avg > 85  → harder
      else      → standard
    Falls back to standard if no history.
    """
    result = await db.execute(
        select(ActivitySubmission.score)
        .join(Activity, ActivitySubmission.activity_id == Activity.id)
        .join(Chapter, Activity.chapter_id == Chapter.id)
        .where(
            ActivitySubmission.student_id == student_id,
            Chapter.subject_id == subject_id,
            ActivitySubmission.score.is_not(None),
        )
        .order_by(desc(ActivitySubmission.submitted_at))
        .limit(5)
    )
    scores = [s for (s,) in result.all() if s is not None]
    if not scores:
        return "standard"
    avg = sum(scores) / len(scores)
    if avg < 55:
        return "easier"
    if avg > 85:
        return "harder"
    return "standard"


# ── Weakness aggregation ───────────────────────────────────────────────────

async def aggregate_weaknesses(
    db: AsyncSession, student_id: uuid.UUID
) -> dict:
    """Roll up student weakness data across subjects for the radar UI.

    Returns:
      {
        "subjects": [
          {"subject_id": ..., "subject_name": ..., "score": 0-100,
           "chapters_completed": int, "weak_topics": [{"topic": str, "count": int}]},
        ...],
        "top_weaknesses": [{"topic": str, "count": int}, ...]   # top 8 across subjects
      }
    """
    from app.models.subject import Subject

    result = await db.execute(
        select(Subject, StudentProgress)
        .outerjoin(StudentProgress, Subject.id == StudentProgress.subject_id)
        .where(Subject.student_id == student_id)
    )
    rows = result.all()

    subjects_payload = []
    global_counter: Counter[str] = Counter()

    for subject, prog in rows:
        weak_list: list[str] = (prog.weaknesses if prog and prog.weaknesses else []) or []
        local_counter = Counter(t.strip().lower() for t in weak_list if t and t.strip())
        # Preserve original casing for the most-recent occurrence
        casing: dict[str, str] = {}
        for t in weak_list:
            key = t.strip().lower()
            if key:
                casing[key] = t.strip()
        weak_topics = [
            {"topic": casing[k], "count": v}
            for k, v in local_counter.most_common(8)
        ]
        global_counter.update(local_counter)

        subjects_payload.append({
            "subject_id": str(subject.id),
            "subject_name": subject.name,
            "score": round(prog.average_score) if (prog and prog.average_score) else None,
            "chapters_completed": prog.chapters_completed if prog else 0,
            "total_chapters": prog.total_chapters if prog else 0,
            "weak_topics": weak_topics,
        })

    top_weaknesses = [
        {"topic": k.title(), "count": v}
        for k, v in global_counter.most_common(8)
    ]
    return {"subjects": subjects_payload, "top_weaknesses": top_weaknesses}


# ── Memory callbacks (for tutor) ───────────────────────────────────────────

async def build_learning_memory(
    db: AsyncSession,
    student_id: uuid.UUID,
    current_chapter_id: uuid.UUID | None = None,
) -> dict:
    """Snapshot of what the student has previously learned, won at, and tripped on.

    Used by the tutor system prompt so it can naturally reference prior work.
    Cheap — three small reads. Always returns a dict (possibly empty fields).
    """
    out: dict = {
        "recent_chapters": [],
        "strengths": [],
        "struggles": [],
        "lapsed_cards": [],
    }

    current_subject_id: uuid.UUID | None = None
    if current_chapter_id:
        chapter = await db.get(Chapter, current_chapter_id)
        if chapter:
            current_subject_id = chapter.subject_id

    # Recent completed chapters in the same subject (excluding the current one)
    if current_subject_id:
        result = await db.execute(
            select(Chapter.title)
            .where(
                Chapter.subject_id == current_subject_id,
                Chapter.status == "completed",
                Chapter.id != current_chapter_id,
            )
            .order_by(Chapter.order_index.desc())
            .limit(5)
        )
        out["recent_chapters"] = [t for (t,) in result.all() if t]

    # Strengths + struggles, only for the current subject if we have it
    prog_q = select(StudentProgress.strengths, StudentProgress.weaknesses).where(
        StudentProgress.student_id == student_id
    )
    if current_subject_id:
        prog_q = prog_q.where(StudentProgress.subject_id == current_subject_id)
    prog_result = await db.execute(prog_q)
    strengths_acc: list[str] = []
    weaknesses_acc: list[str] = []
    for s, w in prog_result.all():
        if s:
            strengths_acc.extend(s)
        if w:
            weaknesses_acc.extend(w)
    out["strengths"] = list(dict.fromkeys(strengths_acc))[-5:]
    out["struggles"] = list(dict.fromkeys(weaknesses_acc))[-5:]

    # Recently lapsed flashcards (cards where the student forgot recently)
    cutoff = datetime.utcnow() - timedelta(days=14)
    lapse_q = (
        select(Flashcard.front)
        .where(
            Flashcard.student_id == student_id,
            Flashcard.last_reviewed_at.is_not(None),
            Flashcard.last_reviewed_at >= cutoff,
            Flashcard.total_lapses > 0,
        )
        .order_by(Flashcard.last_reviewed_at.desc())
        .limit(5)
    )
    lapse_result = await db.execute(lapse_q)
    out["lapsed_cards"] = [f for (f,) in lapse_result.all() if f]

    return out


def memory_to_prompt_block(memory: dict) -> str:
    """Render the memory dict as a system-prompt section. Empty string if nothing useful."""
    parts: list[str] = []
    if memory.get("recent_chapters"):
        parts.append("Recently completed chapters: " + "; ".join(memory["recent_chapters"]))
    if memory.get("strengths"):
        parts.append("The student has shown strength in: " + "; ".join(memory["strengths"]))
    if memory.get("struggles"):
        parts.append("The student has previously struggled with: " + "; ".join(memory["struggles"]))
    if memory.get("lapsed_cards"):
        parts.append("Recently forgotten flashcards (good callback opportunities): "
                    + "; ".join(memory["lapsed_cards"]))
    if not parts:
        return ""
    return (
        "\n\n══════════════════════════════════════════\n"
        "STUDENT LEARNING MEMORY (use naturally — don't list it back)\n"
        "══════════════════════════════════════════\n"
        + "\n".join(f"- {p}" for p in parts)
        + "\nWhen relevant, reference past wins ('like when you nailed X') or callbacks "
          "('this is just like the trick you learned in Y') — but only if it actually fits."
    )


DIFFICULTY_GUIDANCE: dict[str, str] = {
    "easier": (
        "DIFFICULTY MODE: easier. The student is struggling — keep questions concrete, "
        "avoid trick questions, prefer recall and definition over multi-step problems, "
        "and ensure at least half are confidence-builders."
    ),
    "harder": (
        "DIFFICULTY MODE: harder. The student is excelling — push beyond rote: include "
        "applied scenarios, multi-step reasoning, and at least one stretch question that "
        "connects this chapter to prior topics."
    ),
}
