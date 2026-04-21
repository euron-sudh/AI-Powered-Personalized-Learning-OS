"""Wave 5: immersive content — story mode, audio podcast, doubt scanner, career glimpse."""
from __future__ import annotations

import base64
import logging
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import claude_client, openai_client
from app.core.database import get_db_session
from app.dependencies import get_current_user
from app.models.chapter import Chapter
from app.models.student import Student
from app.models.subject import Subject

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Story mode ────────────────────────────────────────────────────────────

@router.get("/story/{chapter_id}")
async def chapter_as_story(
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Re-cast a chapter as a short illustrated narrative for a grade-appropriate reader."""
    try:
        cid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="bad chapter id")
    chapter = await db.get(Chapter, cid)
    if not chapter:
        raise HTTPException(status_code=404, detail="chapter not found")
    student = await db.get(Student, uuid.UUID(user["sub"]))
    grade = student.grade if student else "8"

    content = chapter.content_json or {}
    summary = content.get("summary") or chapter.description or ""
    key_concepts = ", ".join(content.get("key_concepts") or [])

    prompt = f"""Recast this chapter as a short, vivid story for a grade {grade} student.

Chapter: {chapter.title}
Key concepts: {key_concepts}
Overview: {summary[:1500]}

Return STRICT JSON in this shape:
{{
  "title": "...",
  "scenes": [
    {{"heading": "Scene 1: ...", "narrative": "2-4 sentences in story form",
      "concept": "the underlying concept this scene teaches"}},
    ... (4-6 scenes)
  ],
  "moral": "1-2 sentences tying the story back to the real concept"
}}

Tone: warm, curious, age-appropriate. Use named characters and a simple setting.
Each scene must teach one of the key concepts. No prose outside the JSON."""
    async def _gen(model: str, max_tokens: int):
        return await claude_client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
            timeout=30.0,
        )

    last_err: Exception | None = None
    for model, max_tokens in (("claude-sonnet-4-6", 1400), ("claude-haiku-4-5-20251001", 1400)):
        try:
            msg = await _gen(model, max_tokens)
            text = msg.content[0].text or ""
            import json as _json
            s = text.find("{"); e = text.rfind("}") + 1
            return _json.loads(text[s:e])
        except Exception as exc:
            last_err = exc
            continue
    raise HTTPException(status_code=502, detail=f"story generation failed: {last_err}")


# ── Audio podcast (TTS) ───────────────────────────────────────────────────

class PodcastRequest(BaseModel):
    chapter_id: str
    voice: Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"] = "nova"


@router.post("/podcast")
async def chapter_podcast(
    data: PodcastRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Generate an MP3 podcast-style narration of a chapter."""
    try:
        cid = uuid.UUID(data.chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="bad chapter id")
    chapter = await db.get(Chapter, cid)
    if not chapter:
        raise HTTPException(status_code=404, detail="chapter not found")
    student = await db.get(Student, uuid.UUID(user["sub"]))
    grade = student.grade if student else "8"

    content = chapter.content_json or {}
    summary = content.get("summary") or chapter.description or ""
    key_concepts = content.get("key_concepts") or []

    logger.info(f"[PODCAST] start chapter={chapter.title!r} voice={data.voice}")

    # Compose the script via Claude (≤500 words for cost control)
    script_prompt = (
        f"Write a 60-90 second podcast script narrating this chapter for a grade {grade} student. "
        f"Conversational, warm, one host voice. Open with a hook, walk through the 2-3 most important "
        f"ideas with everyday examples, end with a one-line takeaway. No music cues, no SFX, no headings.\n\n"
        f"Chapter: {chapter.title}\nKey concepts: {', '.join(key_concepts)}\nOverview: {summary[:1200]}"
    )
    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=900,
            messages=[{"role": "user", "content": script_prompt}],
            timeout=25.0,
        )
        script = (msg.content[0].text or "").strip()
        logger.info(f"[PODCAST] script ok len={len(script)}")
    except Exception as exc:
        logger.info(f"[PODCAST] claude failed, using fallback: {exc}")
        script = f"Here's a quick walk through {chapter.title}. {summary[:600]}"

    if not script:
        logger.info("[PODCAST] empty script after fallback")
        raise HTTPException(status_code=502, detail="empty script")

    # OpenAI TTS → MP3 bytes
    try:
        logger.info(f"[PODCAST] calling TTS script_len={len(script)}")
        resp = await openai_client.audio.speech.create(
            model="tts-1",
            voice=data.voice,
            input=script[:4000],
        )
        logger.info(f"[PODCAST] TTS returned type={type(resp).__name__}")
        if hasattr(resp, "aread"):
            audio_bytes = await resp.aread()
        else:
            audio_bytes = resp.content
        logger.info(f"[PODCAST] read {len(audio_bytes)} mp3 bytes")
    except Exception as exc:
        import traceback
        logger.info(f"[PODCAST][ERROR] TTS failed: {exc}\n{traceback.format_exc()}")
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}")

    if not audio_bytes:
        logger.info("[PODCAST][ERROR] empty audio_bytes after read")
        raise HTTPException(status_code=502, detail="TTS returned empty audio")

    logger.info(f"[PODCAST] returning Response ({len(audio_bytes)} bytes)")
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "X-Script-Length": str(len(script)),
            "Content-Length": str(len(audio_bytes)),
        },
    )


# ── Doubt scanner ─────────────────────────────────────────────────────────

@router.post("/scan-doubt")
async def scan_doubt(
    image: UploadFile = File(...),
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Take a photo of a homework problem; return a step-by-step explanation."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image required")

    raw = await image.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="image too large (max 8MB)")
    b64 = base64.b64encode(raw).decode()

    student = await db.get(Student, uuid.UUID(user["sub"]))
    grade = student.grade if student else "8"
    media_type = image.content_type or "image/jpeg"

    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1200,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            f"You are a patient tutor for a grade {grade} student. "
                            f"Read the problem in this image, then return STRICT JSON:\n"
                            f"{{\"problem\": \"...\", \"subject\": \"...\", "
                            f"\"steps\": [\"step 1\", \"step 2\", ...], "
                            f"\"final_answer\": \"...\", "
                            f"\"concept\": \"the key concept this problem tests\"}}\n"
                            f"Use Socratic phrasing in steps when possible. No prose outside JSON."
                        ),
                    },
                ],
            }],
        )
        text = msg.content[0].text or ""
        import json as _json
        s = text.find("{"); e = text.rfind("}") + 1
        return _json.loads(text[s:e])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"vision parse failed: {exc}")


# ── Career glimpse (Wave 6) ───────────────────────────────────────────────

@router.get("/career-glimpse/{chapter_id}")
async def career_glimpse(
    chapter_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """One-paragraph 'where does this show up in real careers?' for a chapter."""
    try:
        cid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="bad chapter id")
    chapter = await db.get(Chapter, cid)
    if not chapter:
        raise HTTPException(status_code=404, detail="chapter not found")
    subject = await db.get(Subject, chapter.subject_id) if chapter else None
    student = await db.get(Student, uuid.UUID(user["sub"]))
    grade = student.grade if student else "8"
    interests = ", ".join(student.interests or []) if student else ""

    prompt = (
        f"In one short paragraph (≤4 sentences), tell a grade {grade} student where the topic "
        f"'{chapter.title}' (subject: {subject.name if subject else 'general'}) shows up in real "
        f"careers. Name 2-3 specific roles. Keep it concrete and inspiring, no clichés. "
        f"{('Lean toward ' + interests + ' if a connection exists.') if interests else ''}"
    )
    try:
        msg = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"glimpse": (msg.content[0].text or "").strip()}
    except Exception:
        return {
            "glimpse": (
                f"{chapter.title} comes up everywhere from data scientists to engineers to "
                f"product designers — anyone who turns ideas into systems uses this kind of thinking."
            )
        }
