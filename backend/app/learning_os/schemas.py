from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LearnerBootstrapRequest(BaseModel):
    learner_id: str = Field(default="demo-learner")
    name: str = Field(default="Ava")
    goal: str = Field(default="Become confident in math, science, and problem solving over the next 8 weeks.")
    pace_preference: Literal["steady", "accelerated", "deep-focus"] = "steady"
    difficulty_tolerance: float = Field(default=0.62, ge=0, le=1)
    preferred_styles: list[str] = Field(default_factory=lambda: ["worked examples", "quizzes", "concept maps"])


class TutorQueryRequest(BaseModel):
    learner_id: str
    topic_id: str
    question: str


class QuizGenerateRequest(BaseModel):
    learner_id: str
    topic_id: str
    question_count: int = Field(default=3, ge=1, le=5)


class QuizSubmitRequest(BaseModel):
    learner_id: str
    quiz_id: str
    duration_sec: float = Field(default=240, ge=5)
    answers: list[str]


class LessonFeedbackRequest(BaseModel):
    learner_id: str
    topic_id: str
    confidence: float = Field(ge=0, le=1)
    focus_minutes: float = Field(ge=1, le=240)
    friction: Literal["low", "medium", "high"]
    notes: str = ""


class IngestDocumentRequest(BaseModel):
    learner_id: str
    title: str
    content: str = Field(min_length=20)
    source_type: Literal["notes", "document", "system"] = "notes"
    source_path: str | None = None


class WorkspaceResponse(BaseModel):
    learner: dict
    today_plan: list[dict]
    roadmap: list[dict]
    mastery_snapshot: list[dict]
    analytics: dict
    recent_quizzes: list[dict]
    achievements: list[dict]
    retrieval_library: list[dict]
    recommendations: list[str]


class SearchResponse(BaseModel):
    results: list[dict]
