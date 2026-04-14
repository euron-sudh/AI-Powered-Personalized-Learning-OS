from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.learning_os.schemas import (
    IngestDocumentRequest,
    LearnerBootstrapRequest,
    LessonFeedbackRequest,
    QuizGenerateRequest,
    QuizSubmitRequest,
    SearchResponse,
    TutorQueryRequest,
    WorkspaceResponse,
)
from app.learning_os.service import learning_os_service

router = APIRouter(prefix="/api/system", tags=["learning-os"])


@router.post("/learners/bootstrap")
def bootstrap_learner(payload: LearnerBootstrapRequest):
    learner = learning_os_service.bootstrap_learner(
        learner_id=payload.learner_id,
        name=payload.name,
        goal=payload.goal,
        pace_preference=payload.pace_preference,
        difficulty_tolerance=payload.difficulty_tolerance,
        preferred_styles=payload.preferred_styles,
    )
    return {"learner": learner, "workspace": learning_os_service.get_workspace(payload.learner_id)}


@router.get("/workspace/{learner_id}", response_model=WorkspaceResponse)
def get_workspace(learner_id: str):
    return learning_os_service.get_workspace(learner_id)


@router.post("/quizzes/generate")
def generate_quiz(payload: QuizGenerateRequest):
    try:
        return learning_os_service.generate_quiz(payload.learner_id, payload.topic_id, payload.question_count)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/quizzes/submit")
def submit_quiz(payload: QuizSubmitRequest):
    try:
        return learning_os_service.submit_quiz(payload.learner_id, payload.quiz_id, payload.answers, payload.duration_sec)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/tutor/query")
def tutor_query(payload: TutorQueryRequest):
    try:
        return learning_os_service.tutor(payload.learner_id, payload.topic_id, payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/feedback/lesson")
def lesson_feedback(payload: LessonFeedbackRequest):
    return learning_os_service.capture_feedback(
        learner_id=payload.learner_id,
        topic_id=payload.topic_id,
        confidence=payload.confidence,
        focus_minutes=payload.focus_minutes,
        friction=payload.friction,
        notes=payload.notes,
    )


@router.post("/library/ingest")
def ingest_document(payload: IngestDocumentRequest):
    try:
        return learning_os_service.ingest_document(
            learner_id=payload.learner_id,
            title=payload.title,
            content=payload.content,
            source_type=payload.source_type,
            source_path=payload.source_path,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/library/search", response_model=SearchResponse)
def search_library(learner_id: str = Query(...), query: str = Query(..., min_length=2)):
    return {"results": learning_os_service.search_library(learner_id, query)}


@router.post("/library/reindex")
def reindex_library(learner_id: str = Query(...)):
    """Re-embed all documents for a learner using the current embed model.

    Call this after setting OPENAI_API_KEY to upgrade stale hash-based
    embeddings (192-dim) to OpenAI text-embedding-3-small vectors (512-dim).
    """
    return learning_os_service.retrieval_agent.reindex_all(learner_id)


@router.post("/library/reindex/{document_id}")
def reindex_document(document_id: str, learner_id: str = Query(...)):
    """Re-embed a single document. Use after updating its content."""
    try:
        return learning_os_service.retrieval_agent.reindex_document(document_id, learner_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
