import httpx
from fastapi import HTTPException

from app.config import settings


async def create_realtime_session(
    chapter_title: str = "",
    subject_name: str = "",
    grade: str = "",
    board: str = "",
    student_name: str = "",
) -> dict:
    """Create an OpenAI Realtime API session with ephemeral token.

    Configures server VAD for turn detection and
    appropriate silence duration for natural pauses.
    Optionally injects lesson context into the system instructions.
    """
    # Build context-aware instructions if chapter info provided
    instructions = "You are an expert AI tutor for K-12 students."
    if chapter_title:
        instructions = f"""You are an expert {subject_name or 'general'} tutor for a grade {grade or '10'} student ({board or 'standard'} curriculum).
You are currently teaching: {chapter_title}.
Student name: {student_name or 'Student'}.
Use the Socratic method — ask guiding questions rather than giving answers directly.
Speak clearly at an appropriate pace for the student's grade level."""

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview",
                    "voice": "alloy",
                    "modalities": ["audio", "text"],
                    "instructions": instructions,
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "silence_duration_ms": 800,
                    },
                },
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create OpenAI Realtime session: {e.response.status_code} {e.response.text}"
        )
