export const DEFAULT_LEARNER_ID = "demo-learner";
const API_BASE = "/api/proxy";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type Workspace = {
  learner: {
    id: string;
    name: string;
    goal: string;
    pace_preference: string;
    difficulty_tolerance: number;
    preferred_styles: string[];
    xp: number;
    level: number;
    streak_days: number;
    last_activity_at: string | null;
  };
  today_plan: Array<{
    topic_id: string;
    title: string;
    domain: string;
    estimated_minutes: number;
    mastery_score: number;
    status: string;
    trend: string;
    mission: string;
  }>;
  roadmap: Array<{
    topic_id: string;
    title: string;
    domain: string;
    description: string;
    difficulty: string;
    estimated_minutes: number;
    status: string;
    priority: number;
    sequence_position: number;
    recommended_action: string;
    confidence: number;
    mastery_score: number;
    trend: string;
  }>;
  mastery_snapshot: Array<{
    topic_id: string;
    title: string;
    domain: string;
    score: number;
    trend: string;
    weak_signals: string[];
    strong_signals: string[];
  }>;
  analytics: {
    average_mastery: number;
    focus_topics: number;
    mastered_topics: number;
    active_documents: number;
    memory_events: number;
    plan_completion_signal: number;
  };
  recent_quizzes: Array<{
    quiz_id: string;
    title: string;
    score: number;
    duration_sec: number;
    created_at: string;
    remediation: string;
  }>;
  achievements: Array<{
    code: string;
    title: string;
    description: string;
    unlocked_at: string;
  }>;
  retrieval_library: Array<{
    document_id: string;
    title: string;
    source_type: string;
    chunk_count: number;
    created_at: string;
  }>;
  recommendations: string[];
};

export type GeneratedQuiz = {
  quiz_id: string;
  topic_id: string;
  title: string;
  questions: Array<{
    prompt: string;
    type: "mcq" | "short_answer";
    options?: string[];
    explanation: string;
  }>;
};

export type QuizEvaluation = {
  score: number;
  topic_id: string;
  remediation: string;
  coach_summary: string;
  items: Array<{
    prompt: string;
    answer: string;
    correct: boolean;
    score: number;
    expected: string;
    explanation: string;
  }>;
  achievements: Array<{
    code: string;
    title: string;
    description: string;
    unlocked_at: string;
  }>;
  workspace: Workspace;
};

export async function bootstrapLearner() {
  return request<{ learner: Workspace["learner"]; workspace: Workspace }>("/api/system/learners/bootstrap", {
    method: "POST",
    body: JSON.stringify({ learner_id: DEFAULT_LEARNER_ID }),
  });
}

export async function getWorkspace() {
  return request<Workspace>(`/api/system/workspace/${DEFAULT_LEARNER_ID}`);
}

export async function generateQuiz(topicId: string) {
  return request<GeneratedQuiz>("/api/system/quizzes/generate", {
    method: "POST",
    body: JSON.stringify({
      learner_id: DEFAULT_LEARNER_ID,
      topic_id: topicId,
      question_count: 3,
    }),
  });
}

export async function submitQuiz(quizId: string, answers: string[], durationSec: number) {
  return request<QuizEvaluation>("/api/system/quizzes/submit", {
    method: "POST",
    body: JSON.stringify({
      learner_id: DEFAULT_LEARNER_ID,
      quiz_id: quizId,
      duration_sec: durationSec,
      answers,
    }),
  });
}

export async function askTutor(topicId: string, question: string) {
  return request<{
    answer: string;
    follow_up_prompt: string;
    mode: string;
    retrieval_hits: Array<{ title: string; source_type: string; content: string; score: number }>;
  }>("/api/system/tutor/query", {
    method: "POST",
    body: JSON.stringify({
      learner_id: DEFAULT_LEARNER_ID,
      topic_id: topicId,
      question,
    }),
  });
}

export async function saveLessonFeedback(topicId: string, confidence: number, focusMinutes: number, friction: string, notes: string) {
  return request<{ updated_score: number; workspace: Workspace }>("/api/system/feedback/lesson", {
    method: "POST",
    body: JSON.stringify({
      learner_id: DEFAULT_LEARNER_ID,
      topic_id: topicId,
      confidence,
      focus_minutes: focusMinutes,
      friction,
      notes,
    }),
  });
}

export async function ingestDocument(title: string, content: string, sourceType: "notes" | "document" = "notes") {
  return request<{ document_id: string; workspace: Workspace }>("/api/system/library/ingest", {
    method: "POST",
    body: JSON.stringify({
      learner_id: DEFAULT_LEARNER_ID,
      title,
      content,
      source_type: sourceType,
    }),
  });
}

export async function searchLibrary(query: string) {
  return request<{ results: Array<{ title: string; source_type: string; content: string; score: number }> }>(
    `/api/system/library/search?learner_id=${DEFAULT_LEARNER_ID}&query=${encodeURIComponent(query)}`
  );
}
