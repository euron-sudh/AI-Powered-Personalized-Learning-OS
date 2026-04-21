"""Wave 4: Study Buddy room — an AI study partner that quizzes you on due cards
and chats about whatever you're struggling with.

Lightweight: a single "session" endpoint that returns the next prompt
(card or open question) and grades the answer.
"""
from __future__ import annotations

import json
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import claude_client
from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.flashcard import Flashcard
from app.models.student import Student
from app.services.adaptive import build_learning_memory
from app.services.flashcards import sm2_update, get_due_cards

router = APIRouter()


class BuddyAnswerRequest(BaseModel):
    card_id: str | None = None
    question: str | None = None  # AI-asked question (free-form)
    answer: str


@router.get("/next")
async def next_prompt(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """What does the buddy ask next? Prefers due flashcards; falls back to AI free-form."""
    student_id = uuid.UUID(user["sub"])
    cards = await get_due_cards(db, student_id, limit=1)
    if cards:
        c = cards[0]
        return {
            "type": "card",
            "card_id": str(c.id),
            "buddy_says": _buddy_intro_for_card(c.front),
            "front": c.front,
            "hint": c.hint,
        }

    # Free-form: ask AI to come up with a quick checking question based on memory
    memory = await build_learning_memory(db, student_id)
    topic = (memory.get("struggles") or memory.get("recent_chapters") or ["a recent topic"])[0]
    student = await db.get(Student, student_id)
    grade = student.grade if student else "8"

    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": (
                f"You're a friendly study buddy for a grade {grade} student. "
                f"In 1-2 sentences, ask them a single short check-for-understanding "
                f"question about: {topic}. Be warm and casual. No preamble, no quotes."
            )}],
        )
        question = (msg.content[0].text or "").strip()
    except Exception:
        question = f"Quick one — can you explain {topic} in your own words?"

    return {
        "type": "open",
        "buddy_says": question,
        "topic": topic,
    }


@router.post("/answer")
async def answer(
    data: BuddyAnswerRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Grade the student's answer. For a card, runs SM-2; otherwise AI-graded."""
    student_id = uuid.UUID(user["sub"])

    if data.card_id:
        try:
            cid = uuid.UUID(data.card_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="bad card id")
        card = await db.get(Flashcard, cid)
        if not card or card.student_id != student_id:
            raise HTTPException(status_code=404, detail="card not found")

        verdict = await _grade_card_answer(card.front, card.back, data.answer)
        sm2_update(card, verdict["quality"])
        await db.commit()
        return {
            "buddy_says": verdict["buddy_says"],
            "correct": verdict["quality"] >= 3,
            "expected": card.back,
            "quality": verdict["quality"],
        }

    # Open-question grading — give qualitative AI feedback
    feedback = await _grade_open_answer(data.question or "", data.answer)
    return {
        "buddy_says": feedback,
        "correct": True,
        "quality": None,
    }


def _buddy_intro_for_card(front: str) -> str:
    intros = [
        "Okay, your turn!",
        "Quick one for you:",
        "Let's see if this stuck:",
        "Try this:",
        "Here we go:",
    ]
    # Cheap deterministic pick (don't import random — keep ssr-stable)
    intro = intros[len(front) % len(intros)]
    return f"{intro} {front}"


async def _grade_card_answer(front: str, expected: str, given: str) -> dict:
    """Returns {quality: 1..4, buddy_says: str}."""
    prompt = f"""You are a warm, encouraging study buddy grading a single flashcard answer.

Card front (the question): {front}
Card back (the expected answer): {expected}
Student's answer: {given}

Rate the student's answer on a 1-4 Anki scale:
1 = Again (incorrect or blank)
2 = Hard (partial / fuzzy)
3 = Good (correct)
4 = Easy (correct, complete, nuanced)

Then write a short (≤2 sentences) buddy-style response: confirm correctness if right, gently fix if not.
Always include the missing nuance the student missed (if any). No greetings.

Reply as STRICT JSON: {{"quality": <1-4>, "buddy_says": "..."}}"""
    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text or ""
        s = text.find("{")
        e = text.rfind("}") + 1
        data = json.loads(text[s:e])
        q = int(data.get("quality") or 3)
        if q < 1: q = 1
        if q > 4: q = 4
        return {"quality": q, "buddy_says": (data.get("buddy_says") or "Nice attempt.").strip()}
    except Exception:
        # Heuristic fallback: substring match
        ok = bool(given.strip()) and any(
            tok.lower() in given.lower() for tok in expected.split()[:5] if len(tok) > 3
        )
        return {
            "quality": 3 if ok else 1,
            "buddy_says": "Got it!" if ok else f"Close — the key idea was: {expected[:200]}",
        }


async def _grade_open_answer(question: str, given: str) -> str:
    if not given.strip():
        return "No worries — take a sec and try again. Even a rough idea is fine."
    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": (
                f"You're a warm study buddy. Question you asked: {question or '(free chat)'}\n"
                f"Student said: {given}\n\n"
                f"Reply in ≤3 sentences. Affirm what they got right, gently correct or extend "
                f"what's missing, and end with a tiny follow-up question to keep momentum. No preamble."
            )}],
        )
        return (msg.content[0].text or "").strip()
    except Exception:
        return "Solid start! Want to dig one layer deeper into the why?"
