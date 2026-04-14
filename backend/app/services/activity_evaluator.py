import json

from app.core.ai_client import claude_client, openai_client as _openai_client


async def evaluate_submission(
    activity_prompt: dict,
    student_response: dict,
    student_grade: str,
    chapter_content: dict | None = None,
) -> dict:
    """Evaluate a student's activity submission using Claude.

    Returns correctness assessment, per-question feedback, chapter references,
    score (0-100), and a specific study plan.
    """
    key_concepts = ""
    chapter_summary = ""
    chapter_title = ""
    if chapter_content:
        key_concepts = ", ".join(chapter_content.get("key_concepts", []))
        chapter_summary = chapter_content.get("summary", "")
        chapter_title = chapter_content.get("title", "")

    chapter_context = ""
    if chapter_content:
        chapter_context = f"""
Chapter being tested: {chapter_title}
Key concepts from this chapter: {key_concepts}
Chapter summary: {chapter_summary}
"""

    prompt = f"""You are an expert K-12 evaluator. Carefully evaluate this student's quiz submission.

Grade level: {student_grade}
{chapter_context}
Quiz Questions:
{json.dumps(activity_prompt, indent=2)}

Student's Responses:
{json.dumps(student_response, indent=2)}

Return ONLY valid JSON (no markdown):
{{
  "score": 85,
  "correctness": {{
    "overall": "good",
    "details": {{
      "q1": "correct",
      "q2": "incorrect",
      "q3": "partial"
    }}
  }},
  "question_feedback": [
    {{
      "question_id": "q1",
      "status": "correct",
      "correct_answer": "The correct answer is...",
      "explanation": "This is correct because...",
      "student_answer_note": "You correctly identified..."
    }},
    {{
      "question_id": "q2",
      "status": "incorrect",
      "correct_answer": "The correct answer is...",
      "explanation": "The key concept here is...",
      "student_answer_note": "You answered X, but the correct idea is Y because..."
    }}
  ],
  "feedback": "2-3 encouraging sentences summarising overall performance.",
  "guidance": "1-2 sentences on the most important thing to improve.",
  "chapter_references": [
    {{
      "topic": "Exact concept name from the chapter",
      "why": "You missed questions about this",
      "what_to_do": "Re-read the section on X, focus on understanding Y"
    }}
  ],
  "study_plan": [
    "Step 1: Re-read the definition of [concept] and note the key distinctions",
    "Step 2: Practise solving [type] problems by...",
    "Step 3: Try explaining [concept] in your own words"
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "areas_for_improvement": ["Area 1", "Area 2"]
}}

Rules:
- question_feedback: one entry per question. status is "correct", "incorrect", or "partial". Always state the correct answer clearly.
- chapter_references: only include topics the student got wrong or partially correct. Reference actual key concepts from the chapter. Empty array if all correct.
- study_plan: 2-4 concrete, actionable steps referencing the chapter content. Skip if score >= 90.
- Be encouraging. Acknowledge effort even for wrong answers."""

    content = ""
    claude_failed = False
    try:
        message = await claude_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        content = message.content[0].text
    except Exception:
        claude_failed = True

    if claude_failed:
        # Fallback to GPT-4o if Claude is unavailable or overloaded
        response = await _openai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content or ""

    start = content.find("{")
    end = content.rfind("}") + 1
    json_str = content[start:end]
    return json.loads(json_str)
