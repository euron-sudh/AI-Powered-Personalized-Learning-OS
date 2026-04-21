import json

from app.core.ai_client import claude_client
from app.services.syllabus_data import get_syllabus

# Board-specific content generation guidelines
BOARD_CONTENT_GUIDELINES: dict[str, str] = {
    "CBSE": """Board-specific requirements (CBSE/NCERT):
- Structure content exactly as NCERT textbooks: definitions → examples → applications
- Use Indian context examples (rupees, Indian cities, cricket, Bollywood, etc.)
- Include NCERT-style solved examples with "Given / Find / Solution" format
- Highlight key terms exactly as NCERT bold them
- Cover all NCERT in-text and exercise topics for this chapter
- Mention NCERT chapter reference where applicable""",

    "ICSE": """Board-specific requirements (ICSE/CISCE):
- Follow Selina Concise / Frank textbook depth and analytical style
- ICSE expects deeper conceptual treatment than CBSE — go into "why" not just "what"
- Include proof-based and logical derivation steps where applicable
- Use Indian context with wider international breadth
- Questions should align with ICSE long-answer patterns (analytical, not rote)""",

    "Cambridge IGCSE": """Board-specific requirements (Cambridge IGCSE/CAIE):
- Align content strictly to Cambridge syllabus learning outcomes
- Use internationally diverse, non-region-specific examples
- Structure around Cambridge assessment objectives: Knowledge, Understanding, Analysis
- Use Cambridge notation and terminology throughout
- Include command words: describe, explain, calculate, evaluate, compare""",

    "IB": """Board-specific requirements (IB MYP/Diploma):
- Frame content around IB Key Concepts and Related Concepts
- Connect to Global Contexts (e.g., Globalization, Scientific Innovation, etc.)
- Promote inquiry: pose essential questions and encourage student reflection
- Include ATL skill connections (Thinking, Research, Communication)
- Use concept-based learning structure rather than topic-by-topic coverage
- Encourage TOK connections where applicable""",

    "Common Core": """Board-specific requirements (Common Core/CCSS):
- Align content explicitly to relevant CCSS standards
- For Math: emphasise conceptual understanding, procedural skill, and application
- Use US units (inches, feet, miles, °F, dollars, oz, lb)
- Apply Standards for Mathematical Practice where relevant
- Structure for US grade-level expectations and assessment formats""",
}


async def generate_curriculum(
    subject_name: str,
    grade: str,
    board: str | None,
    background: str | None,
    difficulty_level: str,
) -> dict:
    """Return curriculum chapters.

    If a matching board+subject+grade exists in the official syllabus data,
    those hardcoded chapters are used directly (AI only fills descriptions).
    Otherwise falls back to Claude-generated chapter list.
    """
    chapters = []

    syllabus = get_syllabus(board, subject_name, grade) if board else None

    if syllabus:
        # Use official chapter list — chapters are dicts (TypedDict)
        for ch in syllabus:
            chapters.append(
                {
                    "order_index": ch["order_index"],
                    "title": ch["title"],
                    "description": ch["description"],
                    "learning_objectives": ch.get("learning_objectives", []),
                    "estimated_difficulty": ch.get("estimated_difficulty") or difficulty_level,
                }
            )
        return {"chapters": chapters, "board": board, "source": "official_syllabus"}

    # Fallback: ask Claude to generate chapter list
    background_info = f"\nStudent background: {background}" if background else ""
    board_info = f"\nBoard / curriculum framework: {board}" if board else ""

    prompt = f"""You are an expert K-12 curriculum designer. Create a comprehensive, well-structured curriculum for:

Subject: {subject_name}
Grade Level: {grade}
Difficulty: {difficulty_level}{board_info}{background_info}

CRITICAL REQUIREMENT: The chapters MUST follow a strict logical and chronological progression.
- For History: Follow a strict timeline (e.g., "Stone Age" MUST come before "Indus Valley", which must come before "Vedic Age"). 
- For Science/Math: Ensure foundations and prerequisites are introduced before advanced topics.
- Chapter 1 should usually be an introduction or "Foundations" of the subject.

Generate 8-12 chapters. Each chapter should:
- Have a clear, engaging title
- Include a 1-sentence scannable description (max 15 words)
- BREAK DOWN into 3-5 atomic CONCEPTS (the smallest teachable units)
- Each CONCEPT must have a title and a difficulty_level (easy, medium, hard)

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "chapters": [
    {{
      "order_index": 1,
      "title": "Chapter Title",
      "description": "Short 1-sentence hook",
      "estimated_difficulty": "beginner",
      "concepts": [
        {{
          "order_index": 1,
          "title": "Concept Title",
          "difficulty_level": "easy"
        }}
      ]
    }}
  ]
}}"""

    message = await claude_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    content = message.content[0].text
    start = content.find("{")
    end = content.rfind("}") + 1
    json_str = content[start:end]
    data = json.loads(json_str)
    data["board"] = board
    data["source"] = "ai_generated"
    return data


def _parse_content_json(raw: str) -> dict:
    """Extract and parse JSON from AI response, stripping any markdown fences."""
    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


async def generate_chapter_content(
    chapter_title: str,
    chapter_description: str,
    subject_name: str,
    grade: str,
    student_background: str | None,
    board: str | None = None,
) -> dict:
    """Generate detailed content for a single chapter.

    Returns content with explanatory text, diagrams (Mermaid.js),
    formulas (LaTeX), key concepts, and summary.
    Falls back to GPT-4o if Claude is unavailable.
    """
    from app.core.ai_client import openai_client

    background_info = f"\nStudent background: {student_background}" if student_background else ""
    board_guidelines = BOARD_CONTENT_GUIDELINES.get(board or "", "")
    board_section = f"\n\n{board_guidelines}" if board_guidelines else (f"\nBoard / curriculum framework: {board}" if board else "")

    prompt = f"""You are an expert K-12 educator. Generate comprehensive, engaging lesson content for:

Subject: {subject_name}
Grade: {grade}
Chapter: {chapter_title}
Description: {chapter_description}{board_section}{background_info}

Create detailed, accurate educational content appropriate for grade {grade} students.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{{
  "content_html": "<h2>Introduction</h2><p>Full HTML lesson content with headings, paragraphs, bullet lists, real-world examples, step-by-step explanations...</p>",
  "diagrams": [
    "graph TD\\n    A[Concept A] --> B[Sub-concept B]\\n    B --> C[Result C]"
  ],
  "formulas": [
    "F = ma",
    "v = u + at"
  ],
  "key_concepts": [
    "Key concept 1: brief definition",
    "Key concept 2: brief definition"
  ],
  "summary": "A comprehensive 2-3 paragraph summary of the chapter covering all main points."
}}

Guidelines:
- content_html: Rich HTML with h2/h3 headings, paragraphs, ul/ol lists, bold key terms. Make it engaging and thorough (600-900 words). Use real-world examples and analogies.
- diagrams: Mermaid.js syntax ONLY. Include 1-3 relevant diagrams if they add value. Use empty array [] if diagrams don't apply.
- formulas: LaTeX math notation. Include relevant equations. Use empty array [] if no formulas apply.
- key_concepts: 4-6 key concepts students MUST understand to master this chapter.
- summary: Concise but complete recap of the chapter."""

    # Try Claude first, fall back to GPT-4o only on API errors (not parse errors)
    raw = ""
    claude_failed = False
    try:
        message = await claude_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
    except Exception:
        claude_failed = True

    if not claude_failed:
        return _parse_content_json(raw)

    response = await openai_client.chat.completions.create(
        model="gpt-4o",
        max_tokens=8192,
        messages=[
            {"role": "system", "content": "You are an expert K-12 educator. Always respond with valid JSON only."},
            {"role": "user", "content": prompt},
        ],
    )
    raw = response.choices[0].message.content or ""
    return _parse_content_json(raw)


BOARD_ACTIVITY_GUIDELINES: dict[str, str] = {
    "CBSE": "Design questions matching CBSE exam patterns: 1 mark (VSA), 2-3 mark (SA), 5 mark (LA). Use NCERT exercise style.",
    "ICSE": "Design questions requiring analytical reasoning and conceptual depth, matching ICSE long-answer style.",
    "Cambridge IGCSE": "Design questions using Cambridge command words (describe, explain, evaluate, calculate). Include mark allocations.",
    "IB": "Design inquiry-based questions that require analysis and evaluation. Include at least one extended-response question.",
    "Common Core": "Align questions to CCSS standards. Include multi-step problems requiring mathematical reasoning and real-world application.",
}


async def adjust_curriculum_order(
    chapters: list[dict],
    weak_topics: list[str],
    recent_scores: list[int],
    start_index: int = 1,
) -> dict:
    """Re-prioritise remaining (unlocked/available) chapters based on student performance.

    Uses Claude to move chapters that address the student's weak areas earlier in the
    sequence while keeping prerequisite order sensible.

    Args:
        chapters: List of {"id": str, "order_index": int, "title": str, "description": str}
        weak_topics: Weaknesses from the student's progress record.
        recent_scores: Last few activity scores (0-100).
        start_index: The order_index to start re-numbering from.

    Returns:
        {"chapters": [{"id": ..., "order_index": ..., "title": ...}], "reasoning": str}
    """
    if not chapters:
        return {"chapters": [], "reasoning": "No chapters to reorder."}

    avg_score = sum(recent_scores) / len(recent_scores) if recent_scores else 0

    prompt = f"""You are an expert K-12 curriculum designer personalising a student's learning path.

Student performance summary:
- Average score on completed chapters: {avg_score:.0f}%
- Topics needing more work: {", ".join(weak_topics) if weak_topics else "none identified yet"}

Remaining chapters to sequence (JSON):
{json.dumps(chapters, indent=2)}

Task: Re-order these chapters to best support this student:
1. Move chapters that directly address the weak topics EARLIER so the student revisits fundamentals sooner.
2. Keep prerequisite chapters before the chapters that depend on them.
3. Maintain a logical learning progression overall.
4. Do NOT add or remove chapters — only change order_index values.
5. Re-number order_index starting from {start_index} with no gaps.

Return ONLY valid JSON, no markdown:
{{
  "chapters": [
    {{"id": "chapter-uuid-string", "order_index": {start_index}, "title": "chapter title"}}
  ],
  "reasoning": "One or two sentences explaining why you ordered them this way."
}}"""

    message = await claude_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    content = message.content[0].text
    start = content.find("{")
    end = content.rfind("}") + 1
    return json.loads(content[start:end])


async def generate_activities(
    chapter_title: str,
    chapter_content: dict,
    subject_name: str,
    grade: str,
    board: str | None = None,
    difficulty: str = "standard",
    weak_topics: list[str] | None = None,
    prior_chapter_titles: list[str] | None = None,
) -> dict:
    """Generate activities for a chapter after the lesson content.

    Returns a set of activities including quiz, problem set, etc.

    `difficulty` is one of "easier", "standard", "harder" (Wave 3 adaptive).
    `weak_topics` and `prior_chapter_titles` let the quiz weave callbacks to
    things the student previously struggled with or already mastered.
    """
    from app.services.adaptive import DIFFICULTY_GUIDANCE

    key_concepts = chapter_content.get("key_concepts", [])
    summary = chapter_content.get("summary", "")
    board_instruction = BOARD_ACTIVITY_GUIDELINES.get(board or "", "")
    board_section = f"\nBoard: {board}\nActivity style: {board_instruction}" if board_instruction else (f"\nBoard: {board}" if board else "")

    difficulty_section = ""
    if difficulty in DIFFICULTY_GUIDANCE:
        difficulty_section = f"\n\n{DIFFICULTY_GUIDANCE[difficulty]}"

    callback_section = ""
    if weak_topics:
        callback_section += (
            "\n\nThe student has previously struggled with: "
            + "; ".join(weak_topics[:5])
            + ". If this chapter relates to any of these, include ONE question that "
              "explicitly revisits the connection (a memory callback)."
        )
    if prior_chapter_titles:
        callback_section += (
            "\n\nPreviously completed chapters in this subject: "
            + "; ".join(prior_chapter_titles[:5])
            + ". Where natural, include ONE question that links the current chapter "
              "to a prior one to reinforce cumulative understanding."
        )

    prompt = f"""You are an expert K-12 educator. Generate a set of activities to assess student understanding of:

Subject: {subject_name}
Grade: {grade}
Chapter: {chapter_title}
Key Concepts: {", ".join(key_concepts)}
Chapter Summary: {summary}{board_section}{difficulty_section}{callback_section}

Create a varied activity set that tests different levels of understanding.

Return ONLY valid JSON in this exact format (no markdown):
{{
  "type": "quiz",
  "title": "Chapter Assessment: {chapter_title}",
  "instructions": "Answer the following questions to the best of your ability.",
  "questions": [
    {{
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why A is correct"
    }},
    {{
      "id": "q2",
      "type": "short_answer",
      "question": "Explain in your own words...",
      "expected_concepts": ["concept 1", "concept 2"]
    }},
    {{
      "id": "q3",
      "type": "problem",
      "question": "Solve this problem step by step...",
      "hint": "Think about the formula...",
      "expected_concepts": ["formula", "calculation"]
    }}
  ]
}}

Include 4-6 questions mixing multiple choice, short answer, and problem-solving types."""

    message = await claude_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    content = message.content[0].text
    start = content.find("{")
    end = content.rfind("}") + 1
    json_str = content[start:end]
    return json.loads(json_str)
