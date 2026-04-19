import json
import hashlib

from app.core.ai_client import claude_client, openai_client
from app.core.redis_client import redis_client


async def analyze_frame(frame_base64: str, use_cache: bool = True) -> dict:
    """Analyze a video frame for student sentiment using Claude Vision.

    Detects: engagement, confusion, boredom, frustration, happiness, drowsiness.
    Returns emotion label and confidence score.
    Uses Redis caching to avoid re-analyzing identical frames.
    """
    # Check cache first
    if use_cache and redis_client:
        frame_hash = hashlib.sha256(frame_base64.encode()).hexdigest()
        cache_key = f"sentiment:frame:{frame_hash}"
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Cache miss or Redis error — proceed with analysis

    prompt = """Analyze this image of a student studying at their computer/desk.

IMPORTANT DEFAULTS:
- A student looking at their screen with a neutral or calm face = "engaged". This is the most common state.
- Do NOT classify neutral focus as "bored". Boredom requires clear active disengagement signals.
- When in doubt, default to "engaged".

Classify using ONLY these strict criteria:

"engaged" — Eyes on screen, sitting upright or leaning forward, calm or attentive expression. Neutral face = engaged. This should be the most frequent label.

"happy" — Visible smile, positive/excited expression, animated body language.

"confused" — Furrowed brow, head tilted, squinting at screen, scratching head, uncertain look directed at the content.

"frustrated" — Visible tension in face, frown, clenched jaw, hand pressed to face/forehead, visible irritation.

"bored" — ONLY if: eyes clearly looking away from screen for extended time, slouched with head drooping, completely disengaged posture, or glazed unfocused eyes clearly not looking at content. A neutral attentive face is NOT bored.

"drowsy" — Drooping/half-closed eyes, head nodding, yawning, clearly struggling to stay awake.

Return ONLY valid JSON (no markdown):
{
  "emotion": "engaged",
  "confidence": 0.85,
  "notes": "Student looking at screen with focused neutral expression"
}

The "confidence" must be a float 0.0–1.0. Return confidence < 0.4 if face is not clearly visible."""

    # Try Claude Vision first, fall back to GPT-4o Vision on any error
    try:
        message = await claude_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=256,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": frame_base64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        content = message.content[0].text
    except Exception:
        # Fall back to GPT-4o Vision
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=256,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{frame_base64}"},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        content = response.choices[0].message.content or ""

    start = content.find("{")
    end = content.rfind("}") + 1
    json_str = content[start:end]
    result = json.loads(json_str)

    # Cache the result for 5 minutes to avoid re-analyzing identical frames
    if use_cache and redis_client:
        frame_hash = hashlib.sha256(frame_base64.encode()).hexdigest()
        cache_key = f"sentiment:frame:{frame_hash}"
        try:
            await redis_client.setex(cache_key, 300, json.dumps(result))
        except Exception:
            pass  # Cache save failure doesn't block the response

    return result


def determine_adaptive_action(emotion: str, confidence: float) -> str | None:
    """Determine what adaptive action to take based on detected sentiment."""
    if confidence < 0.6:
        return None

    actions = {
        "bored": "Switching to a more interactive format. Try exploring the diagrams or asking a question about what interests you most!",
        "confused": "Let's slow down and approach this differently. Ask me to explain any concept in a new way!",
        "frustrated": "Take a breath — you're doing great! Let's break this down into smaller, simpler steps.",
        "drowsy": "Time for a quick 2-minute break! Stand up, stretch, and come back refreshed.",
        "engaged": None,
        "happy": None,
    }
    return actions.get(emotion)
