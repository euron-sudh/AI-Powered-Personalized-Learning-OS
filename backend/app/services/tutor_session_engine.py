"""
TutorSessionEngine — LangGraph-based AI Tutor Brain

Orchestrates multi-agent tutoring logic with adaptive routing based on student emotion + mastery.
"""

import uuid
from typing import TypedDict, Literal, Any
from datetime import datetime
import asyncio

from langgraph.graph import StateGraph, END
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import claude_client, openai_client
from app.models import Student, Chapter, StudentProgress
from app.services.teaching_engine import stream_teaching_response
from app.services.sentiment_analyzer import determine_adaptive_action


# =====================
# TYPED STATE
# =====================

class TutorState(TypedDict, total=False):
    """Shared state across LangGraph nodes"""
    session_id: str
    student_id: str
    chapter_id: str
    student: Student
    chapter: Chapter
    progress: StudentProgress

    topic: str
    stage: Literal["TEACH", "SIMPLIFY", "ENGAGE", "CHALLENGE", "ENCOURAGE", "BREAK", "END"]
    emotion: str
    emotion_confidence: float

    mastery: float
    confusion_count: int
    engagement_score: float

    last_input: str
    last_action: str
    created_at: str


# =====================
# AGENT NODES
# =====================

class TeacherAgent:
    """Explains concepts to the student"""

    async def run(self, state: TutorState, db_session: AsyncSession) -> dict:
        """Stream teaching response based on state"""
        try:
            chapter = state["chapter"]
            student = state["student"]
            student_background = student.background if hasattr(student, "background") else None

            # Build teaching context
            recent_messages = []  # In a real implementation, fetch from chat_messages table

            # Stream teaching response
            response_text = ""
            async for chunk in stream_teaching_response(
                chapter_content={"title": chapter.title, "description": chapter.description},
                student_message=state.get("last_input", "Please explain this concept"),
                conversation_history=recent_messages,
                student_grade=student.grade,
                student_background=student_background,
                board=student.board if hasattr(student, "board") else None,
                subject_name="",
            ):
                response_text += chunk

            return {
                "stage": "TEACH",
                "last_action": "EXPLAIN",
                "engagement_score": state.get("engagement_score", 0.5),
            }
        except Exception as e:
            print(f"TeacherAgent error: {e}")
            return {"stage": "TEACH", "last_action": "EXPLAIN_ERROR"}


class EmotionAgent:
    """Analyzes student emotion from input and determines adaptive action"""

    async def run(self, state: TutorState, db_session: AsyncSession) -> dict:
        """Evaluate emotional state and determine routing"""
        emotion = state.get("emotion", "neutral")
        confidence = state.get("emotion_confidence", 0.0)

        # Skip routing if emotion not strong enough
        if confidence < 0.65:
            return {"emotion": emotion, "emotion_confidence": confidence}

        # Determine next stage based on emotion
        if emotion == "confused":
            return {"emotion": emotion, "emotion_confidence": confidence, "next_stage": "simplify"}
        elif emotion == "bored":
            return {"emotion": emotion, "emotion_confidence": confidence, "next_stage": "engage"}
        elif emotion == "engaged":
            return {"emotion": emotion, "emotion_confidence": confidence, "next_stage": "challenge"}
        elif emotion == "frustrated":
            return {"emotion": emotion, "emotion_confidence": confidence, "next_stage": "encourage"}
        elif emotion == "drowsy":
            return {"emotion": emotion, "emotion_confidence": confidence, "next_stage": "break"}
        else:  # neutral, happy
            return {"emotion": emotion, "emotion_confidence": confidence, "next_stage": "teach"}


class ExaminerAgent:
    """Evaluates student understanding with questions"""

    async def run(self, state: TutorState, db_session: AsyncSession) -> dict:
        """Generate comprehension check"""
        return {
            "stage": "CHECK",
            "last_action": "ASK_QUESTION",
        }


class CoachAgent:
    """Adjusts difficulty based on mastery"""

    async def run(self, state: TutorState, db_session: AsyncSession) -> dict:
        """Determine appropriate difficulty level"""
        mastery = state.get("mastery", 0.3)

        if mastery < 0.4:
            difficulty = "easy"
        elif mastery > 0.8:
            difficulty = "hard"
        else:
            difficulty = "medium"

        return {"difficulty": difficulty}


class MemoryAgent:
    """Stores and recalls student learning progress"""

    async def run(self, state: TutorState, db_session: AsyncSession) -> dict:
        """Update student learning memory"""
        student_id = state["student_id"]

        # In a real implementation, update student.learning_memory JSONB
        return {"memory_updated": True}


# =====================
# NODE FUNCTIONS (for LangGraph)
# =====================

async def teach_node(state: TutorState, agent: TeacherAgent, db_session: AsyncSession) -> dict:
    """Teaching phase"""
    result = await agent.run(state, db_session)
    return result


async def emotion_check_node(state: TutorState, agent: EmotionAgent, db_session: AsyncSession) -> str:
    """Emotion evaluation — conditional routing"""
    result = await agent.run(state, db_session)
    next_stage = result.get("next_stage", "teach")

    # Return the routing decision
    if next_stage == "simplify":
        return "simplify"
    elif next_stage == "engage":
        return "engage"
    elif next_stage == "challenge":
        return "challenge"
    elif next_stage == "encourage":
        return "encourage"
    elif next_stage == "break":
        return "break"
    else:
        return "teach"


async def simplify_node(state: TutorState, agent: TeacherAgent, db_session: AsyncSession) -> dict:
    """Simplify explanation when confused"""
    return {
        "stage": "SIMPLIFY",
        "last_action": "REPEAT_EXPLANATION",
        "confusion_count": state.get("confusion_count", 0) + 1,
    }


async def engage_node(state: TutorState, agent: ExaminerAgent, db_session: AsyncSession) -> dict:
    """Engage with question when bored"""
    return {
        "stage": "ENGAGE",
        "last_action": "ASK_QUESTION",
    }


async def challenge_node(state: TutorState, agent: ExaminerAgent, db_session: AsyncSession) -> dict:
    """Challenge with harder content when engaged"""
    return {
        "stage": "CHALLENGE",
        "last_action": "INCREASE_DIFFICULTY",
    }


async def encourage_node(state: TutorState, agent: TeacherAgent, db_session: AsyncSession) -> dict:
    """Encourage and simplify when frustrated"""
    return {
        "stage": "ENCOURAGE",
        "last_action": "OFFER_SUPPORT",
        "confusion_count": state.get("confusion_count", 0) + 1,
    }


async def break_node(state: TutorState) -> dict:
    """Suggest a break when drowsy"""
    return {
        "stage": "BREAK",
        "last_action": "SUGGEST_BREAK",
    }


# =====================
# LANGGRAPH STATE MACHINE
# =====================

class TutorSessionEngine:
    """
    LangGraph-based tutor orchestrator.
    Manages session state and routes between teaching agents.
    """

    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.teacher = TeacherAgent()
        self.emotion = EmotionAgent()
        self.examiner = ExaminerAgent()
        self.coach = CoachAgent()
        self.memory = MemoryAgent()

        # Build the LangGraph
        self.graph = self._build_graph()

    def _build_graph(self) -> Any:
        """Build the state machine graph"""
        graph = StateGraph(TutorState)

        # Add nodes — wrap async functions as async lambdas
        graph.add_node("teach", lambda s: teach_node(s, self.teacher, self.db_session))
        graph.add_node("emotion_check", lambda s: emotion_check_node(s, self.emotion, self.db_session))
        graph.add_node("simplify", lambda s: simplify_node(s, self.teacher, self.db_session))
        graph.add_node("engage", lambda s: engage_node(s, self.examiner, self.db_session))
        graph.add_node("challenge", lambda s: challenge_node(s, self.examiner, self.db_session))
        graph.add_node("encourage", lambda s: encourage_node(s, self.teacher, self.db_session))
        graph.add_node("break", lambda s: break_node(s))

        # Set entry point
        graph.set_entry_point("teach")

        # Add edges
        graph.add_edge("teach", "emotion_check")

        # Conditional edges based on emotion
        graph.add_conditional_edges(
            "emotion_check",
            lambda s: emotion_check_node(s, self.emotion, self.db_session),
            {
                "teach": "teach",
                "simplify": "simplify",
                "engage": "engage",
                "challenge": "challenge",
                "encourage": "encourage",
                "break": "break",
            }
        )

        # Terminal edges
        graph.add_edge("simplify", "teach")
        graph.add_edge("engage", "teach")
        graph.add_edge("challenge", "teach")
        graph.add_edge("encourage", "teach")
        graph.add_edge("break", END)

        return graph.compile()

    async def step(self, state: TutorState) -> TutorState:
        """
        Run one step of the state machine.
        In async context, invoke the graph asynchronously.
        """
        result = await self.graph.ainvoke(state)
        return result

    async def create_session(
        self, student_id: str, chapter_id: str, db_session: AsyncSession
    ) -> str:
        """Create a new tutor session in the database"""
        from app.models import Student, Chapter

        session_id = str(uuid.uuid4())

        # 1. Fetch student
        student = await db_session.get(Student, uuid.UUID(student_id))
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # 2. Fetch chapter
        try:
            chapter_uuid = uuid.UUID(chapter_id)
        except ValueError:
            raise ValueError(f"Chapter '{chapter_id}' not found")

        chapter = await db_session.get(Chapter, chapter_uuid)
        if not chapter:
            raise ValueError(f"Chapter '{chapter_id}' not found")

        topic_title = chapter.title

        # 3. Insert into learning_sessions table
        from sqlalchemy import text
        await db_session.execute(
            text("""
                INSERT INTO learning_sessions
                (id, student_id, chapter_id, topic, stage, emotion, mastery, confusion_count, engagement_score, created_at)
                VALUES (:id, :student_id, :chapter_id, :topic, :stage, :emotion, :mastery, :confusion_count, :engagement_score, :created_at)
            """),
            {
                "id": session_id,
                "student_id": student_id,
                "chapter_id": chapter_id,
                "topic": topic_title,
                "stage": "TEACH",
                "emotion": "neutral",
                "mastery": 0.3,
                "confusion_count": 0,
                "engagement_score": 0.5,
                "created_at": datetime.utcnow(),
            }
        )
        await db_session.commit()

        return session_id

    async def log_event(
        self, session_id: str, event_type: str, payload: dict, db_session: AsyncSession
    ) -> None:
        """Log an AI decision event to tutor_events"""
        from sqlalchemy import text
        import json

        await db_session.execute(
            text("""
                INSERT INTO tutor_events (session_id, event_type, payload, created_at)
                VALUES (:session_id, :event_type, :payload, :created_at)
            """),
            {
                "session_id": session_id,
                "event_type": event_type,
                "payload": json.dumps(payload),
                "created_at": datetime.utcnow(),
            }
        )
        await db_session.commit()
