from pydantic import BaseModel


class SubjectProgress(BaseModel):
    subject_id: str
    subject_name: str
    chapters_completed: int
    total_chapters: int
    average_score: float | None = None
    progress_percent: float = 0.0
    strengths: list[str] = []
    weaknesses: list[str] = []


class ProgressResponse(BaseModel):
    student_id: str
    subjects: list[SubjectProgress]
    total_xp: int = 0
    current_level: int = 1
    streak_days: int = 0
