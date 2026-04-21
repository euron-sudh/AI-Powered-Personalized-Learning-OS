"""Wave 2: flashcard generation + SM-2 spaced repetition."""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import claude_client, openai_client
from app.models.chapter import Chapter
from app.models.flashcard import Flashcard

# Quality scale (Anki-style 4-button mapped to SM-2 0-5):
#   1 = Again (forgot)        → SM-2 quality 0
#   2 = Hard (barely)         → SM-2 quality 3
#   3 = Good (normal)         → SM-2 quality 4
#   4 = Easy (instant)        → SM-2 quality 5
QUALITY_MAP = {1: 0, 2: 3, 3: 4, 4: 5}

# XP rewards per review quality (rewards retention, punishes guessing)
XP_PER_QUALITY = {1: 0, 2: 2, 3: 5, 4: 10}


def sm2_update(card: Flashcard, ui_quality: int, today: date | None = None) -> None:
    """Mutates the card in-place using the classic SM-2 algorithm.

    ui_quality is the 1–4 button the user pressed; we map it to SM-2's 0–5.
    """
    today = today or date.today()
    q = QUALITY_MAP.get(ui_quality, 4)

    if q < 3:
        # Failed: reset progress, see again tomorrow at the latest
        card.repetitions = 0
        card.interval_days = 1
        card.total_lapses = (card.total_lapses or 0) + 1
    else:
        if card.repetitions == 0:
            card.interval_days = 1
        elif card.repetitions == 1:
            card.interval_days = 6
        else:
            card.interval_days = max(1, round((card.interval_days or 1) * (card.ease_factor or 2.5)))
        card.repetitions = (card.repetitions or 0) + 1

    # Ease adjustment (clamped at 1.3 to avoid 'ease hell')
    new_ease = (card.ease_factor or 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    card.ease_factor = max(1.3, new_ease)

    card.due_date = today + timedelta(days=max(1, card.interval_days))
    card.last_reviewed_at = datetime.utcnow()
    card.total_reviews = (card.total_reviews or 0) + 1


# ── Generation ──────────────────────────────────────────────────────────────

GEN_PROMPT = """You generate spaced-repetition flashcards from a lesson chapter.

Output 6-10 high-quality flashcards as STRICT JSON only — no prose around it.

Each card must:
- Have a sharp, single-fact "front" question (≤120 chars)
- Have a precise, complete "back" answer (≤300 chars)
- Optionally include a brief "hint" (≤80 chars) if the front is non-obvious
- Test understanding, not just rote recall — mix definitions, why-it-matters, and worked applications
- Stay tightly scoped to this chapter's content; no outside facts

Format:
{"cards": [{"front": "...", "back": "...", "hint": "..."}, ...]}

Chapter title: {title}
Grade level: {grade}
Key concepts: {key_concepts}
Chapter overview: {summary}
"""


async def _generate_card_payloads(
    chapter_title: str, key_concepts: list[str], summary: str, grade: str
) -> list[dict]:
    prompt = GEN_PROMPT.format(
        title=chapter_title,
        grade=grade,
        key_concepts=", ".join(key_concepts) or "(not provided)",
        summary=(summary or "")[:1500],
    )

    text = ""
    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text
    except Exception:
        try:
            resp = await openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.choices[0].message.content or ""
        except Exception:
            return []

    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        data = json.loads(text[start:end])
    except Exception:
        return []

    cards = data.get("cards", [])
    if not isinstance(cards, list):
        return []
    cleaned: list[dict] = []
    for c in cards:
        if not isinstance(c, dict):
            continue
        front = (c.get("front") or "").strip()
        back = (c.get("back") or "").strip()
        if not front or not back:
            continue
        cleaned.append({"front": front[:500], "back": back[:1000], "hint": (c.get("hint") or "").strip()[:200] or None})
    return cleaned


async def generate_for_chapter(
    db: AsyncSession,
    student_id: uuid.UUID,
    chapter_id: uuid.UUID,
    force: bool = False,
) -> int:
    """Generate flashcards for a (student, chapter). Returns count created.

    Idempotent: skips if cards already exist for this pair unless force=True.
    """
    if not force:
        existing = await db.execute(
            select(Flashcard.id)
            .where(Flashcard.student_id == student_id, Flashcard.chapter_id == chapter_id)
            .limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            return 0

    chapter = await db.get(Chapter, chapter_id)
    if not chapter or not chapter.content_json:
        return 0

    content = chapter.content_json or {}
    key_concepts = content.get("key_concepts") or []
    summary = content.get("summary") or chapter.description or ""

    # Look up grade for prompt context (best-effort)
    from app.models.student import Student
    student = await db.get(Student, student_id)
    grade = student.grade if student else "8"

    payloads = await _generate_card_payloads(
        chapter_title=chapter.title,
        key_concepts=key_concepts if isinstance(key_concepts, list) else [],
        summary=summary,
        grade=grade,
    )

    today = date.today()
    for p in payloads:
        db.add(Flashcard(
            student_id=student_id,
            chapter_id=chapter_id,
            front=p["front"],
            back=p["back"],
            hint=p.get("hint"),
            due_date=today,
        ))
    await db.commit()
    return len(payloads)


# ── Queue helpers ───────────────────────────────────────────────────────────

async def get_due_cards(
    db: AsyncSession, student_id: uuid.UUID, limit: int = 50
) -> list[Flashcard]:
    today = date.today()
    result = await db.execute(
        select(Flashcard)
        .where(Flashcard.student_id == student_id, Flashcard.due_date <= today)
        .order_by(Flashcard.due_date.asc(), Flashcard.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def deck_summary(db: AsyncSession, student_id: uuid.UUID) -> dict:
    today = date.today()
    all_cards = await db.execute(
        select(Flashcard).where(Flashcard.student_id == student_id)
    )
    cards = list(all_cards.scalars().all())
    due_today = sum(1 for c in cards if c.due_date <= today)
    new_cards = sum(1 for c in cards if c.repetitions == 0)
    return {
        "total": len(cards),
        "due_today": due_today,
        "new": new_cards,
        "learning": sum(1 for c in cards if 0 < c.repetitions < 3),
        "mature": sum(1 for c in cards if c.repetitions >= 3),
    }
