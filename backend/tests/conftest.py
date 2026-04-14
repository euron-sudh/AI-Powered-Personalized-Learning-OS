"""Shared test fixtures for LearnOS backend tests."""

import json
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _async_text_generator(chunks: list[str]) -> AsyncGenerator[str, None]:
    for chunk in chunks:
        yield chunk


# ---------------------------------------------------------------------------
# Sample data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_student():
    return {
        "name": "Test Student",
        "grade": "10",
        "background": "Interested in science",
        "interests": ["Physics", "Mathematics"],
    }


@pytest.fixture
def sample_chapter():
    return {
        "title": "Newton's Laws of Motion",
        "description": "Understanding the three fundamental laws of motion",
        "order_index": 1,
        "subject_name": "Physics",
    }


@pytest.fixture
def sample_chapter_content():
    return {
        "content_html": "<h2>Introduction</h2><p>Newton's laws describe motion.</p>",
        "diagrams": ["graph TD\n    A[Force] --> B[Acceleration]"],
        "formulas": ["F = ma", "v = u + at"],
        "key_concepts": [
            "Inertia: tendency to resist change in motion",
            "Force: push or pull acting on an object",
            "Momentum: mass times velocity",
        ],
        "summary": "Newton's three laws form the foundation of classical mechanics.",
    }


@pytest.fixture
def sample_activity_prompt():
    return {
        "type": "quiz",
        "title": "Newton's Laws Assessment",
        "instructions": "Answer all questions carefully.",
        "questions": [
            {
                "id": "q1",
                "type": "multiple_choice",
                "question": "What does Newton's second law state?",
                "options": ["A) F=ma", "B) F=mv", "C) F=m/a", "D) F=a/m"],
                "correct_answer": "A",
                "explanation": "Force equals mass times acceleration.",
            },
            {
                "id": "q2",
                "type": "short_answer",
                "question": "Explain Newton's first law in your own words.",
                "expected_concepts": ["inertia", "rest", "motion"],
            },
        ],
    }


@pytest.fixture
def sample_student_responses():
    return {
        "q1": "A",
        "q2": "An object stays still or keeps moving unless a force acts on it.",
    }


# ---------------------------------------------------------------------------
# AI client mocks
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_claude_message_factory():
    """Return a helper that builds a mock Claude Message object."""
    def _make(text: str):
        content_block = MagicMock()
        content_block.text = text
        message = MagicMock()
        message.content = [content_block]
        return message
    return _make


_CLAUDE_PATCH_TARGETS = [
    "app.core.ai_client.claude_client",
    "app.services.activity_evaluator.claude_client",
    "app.services.curriculum_generator.claude_client",
    "app.services.teaching_engine.claude_client",
    "app.services.sentiment_analyzer.claude_client",
]

_OPENAI_PATCH_TARGETS = [
    "app.core.ai_client.openai_client",
    "app.services.activity_evaluator._openai_client",
    "app.services.teaching_engine.openai_client",
    "app.services.sentiment_analyzer.openai_client",
]


@pytest.fixture
def mock_claude_client(mock_claude_message_factory):
    """Patch claude_client everywhere services import it."""
    mock = MagicMock()
    mock.messages.create = AsyncMock(
        return_value=mock_claude_message_factory('{"chapters": []}')
    )
    stream_ctx = MagicMock()
    stream_ctx.__aenter__ = AsyncMock(return_value=stream_ctx)
    stream_ctx.__aexit__ = AsyncMock(return_value=False)
    stream_ctx.text_stream = _async_text_generator([])
    mock.messages.stream = MagicMock(return_value=stream_ctx)

    patchers = [patch(target, mock) for target in _CLAUDE_PATCH_TARGETS]
    for p in patchers:
        p.start()
    try:
        yield mock
    finally:
        for p in patchers:
            p.stop()


@pytest.fixture
def mock_openai_client():
    """Patch openai_client everywhere services import it."""
    mock = MagicMock()
    patchers = [patch(target, mock) for target in _OPENAI_PATCH_TARGETS]
    for p in patchers:
        p.start()
    try:
        yield mock
    finally:
        for p in patchers:
            p.stop()
