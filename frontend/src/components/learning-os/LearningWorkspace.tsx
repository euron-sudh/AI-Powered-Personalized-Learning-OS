"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  askTutor,
  bootstrapLearner,
  generateQuiz,
  getWorkspace,
  ingestDocument,
  saveLessonFeedback,
  searchLibrary,
  submitQuiz,
  type GeneratedQuiz,
  type QuizEvaluation,
  type Workspace,
} from "@/lib/learning-os";

type ViewMode = "dashboard" | "analytics" | "tutor";

type Props = {
  mode: ViewMode;
};

function toneForScore(score: number) {
  if (score >= 80) return "text-[var(--accent-2)]";
  if (score >= 60) return "text-[var(--accent)]";
  return "text-[var(--danger)]";
}

function scoreRing(score: number) {
  if (score >= 80) return "#2a9d8f";
  if (score >= 60) return "#f4a261";
  return "#e76f51";
}

export default function LearningWorkspace({ mode }: Props) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<QuizEvaluation | null>(null);
  const [tutorQuestion, setTutorQuestion] = useState("How should I approach this topic today?");
  const [tutorResult, setTutorResult] = useState<Awaited<ReturnType<typeof askTutor>> | null>(null);
  const [noteTitle, setNoteTitle] = useState("My revision notes");
  const [noteBody, setNoteBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("retrieval practice");
  const [searchResults, setSearchResults] = useState<Array<{ title: string; source_type: string; content: string; score: number }>>([]);
  const [feedbackConfidence, setFeedbackConfidence] = useState(0.7);
  const [feedbackFocus, setFeedbackFocus] = useState(30);
  const [feedbackFriction, setFeedbackFriction] = useState("medium");
  const [feedbackNotes, setFeedbackNotes] = useState("Need one more worked example.");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await bootstrapLearner();
        const nextWorkspace = await getWorkspace();
        setWorkspace(nextWorkspace);
        setSelectedTopicId(nextWorkspace.today_plan[0]?.topic_id ?? nextWorkspace.roadmap[0]?.topic_id ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const selectedTopic = useMemo(() => workspace?.roadmap.find((topic) => topic.topic_id === selectedTopicId) ?? workspace?.roadmap[0], [workspace, selectedTopicId]);
  const masteryChartData = useMemo(
    () => (workspace?.mastery_snapshot ?? []).map((item) => ({ name: item.title.replace(/ .*/, ""), score: item.score })),
    [workspace]
  );
  const missionProgress = useMemo(() => {
    if (!workspace) return 0;
    const total = workspace.roadmap.length || 1;
    return Math.round((workspace.analytics.mastered_topics / total) * 100);
  }, [workspace]);

  async function refreshWorkspace() {
    const nextWorkspace = await getWorkspace();
    setWorkspace(nextWorkspace);
  }

  async function handleGenerateQuiz() {
    if (!selectedTopic) return;
    setError(null);
    const generated = await generateQuiz(selectedTopic.topic_id);
    setQuiz(generated);
    setQuizAnswers(new Array(generated.questions.length).fill(""));
    setQuizResult(null);
  }

  async function handleSubmitQuiz() {
    if (!quiz) return;
    setError(null);
    try {
      const result = await submitQuiz(quiz.quiz_id, quizAnswers, 180);
      setQuizResult(result);
      setWorkspace(result.workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAskTutor() {
    if (!selectedTopic) return;
    setError(null);
    try {
      const result = await askTutor(selectedTopic.topic_id, tutorQuestion);
      setTutorResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleIngest() {
    if (!noteBody.trim()) return;
    setError(null);
    try {
      const result = await ingestDocument(noteTitle, noteBody);
      setWorkspace(result.workspace);
      setNoteBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSearch() {
    const result = await searchLibrary(searchQuery);
    setSearchResults(result.results);
  }

  async function handleFeedback() {
    if (!selectedTopic) return;
    setError(null);
    try {
      const result = await saveLessonFeedback(selectedTopic.topic_id, feedbackConfidence, feedbackFocus, feedbackFriction, feedbackNotes);
      startTransition(() => {
        setWorkspace(result.workspace);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">Loading adaptive workspace...</div>;
  }

  if (!workspace) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-[var(--danger)] sm:px-6">{error ?? "Workspace unavailable."}</div>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[var(--accent)]">{mode === "dashboard" ? "Adaptive workspace" : mode === "analytics" ? "Learning analytics" : "Tutor console"}</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">{workspace.learner.name}'s personalized learning OS</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--muted)]">{workspace.learner.goal}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Level {workspace.learner.level}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">XP {workspace.learner.xp}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">{workspace.learner.streak_days}-day streak</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Pace: {workspace.learner.pace_preference}</span>
            </div>
            {mode === "dashboard" && (
              <div className="mt-6 rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(42,157,143,0.2),rgba(10,30,43,0.55))] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Skills Up Next</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white">Mastery Challenge</span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white">{selectedTopic?.title ?? "Select a topic"}</span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white">Focus session: {selectedTopic?.estimated_minutes ?? 30} min</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Avg mastery", `${workspace.analytics.average_mastery}%`],
              ["Focus topics", String(workspace.analytics.focus_topics)],
              ["Library docs", String(workspace.analytics.active_documents)],
              ["Mastered", String(workspace.analytics.mastered_topics)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-[var(--muted)]">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
            <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted)]">Mission progress</p>
                  <p className="mt-2 text-xl font-semibold text-white">{missionProgress}% complete</p>
                </div>
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <svg viewBox="0 0 42 42" className="h-20 w-20 -rotate-90">
                    <circle cx="21" cy="21" r="16" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="4" />
                    <circle
                      cx="21"
                      cy="21"
                      r="16"
                      fill="none"
                      stroke={scoreRing(missionProgress)}
                      strokeWidth="4"
                      strokeDasharray={`${(missionProgress / 100) * 100.5} 100.5`}
                    />
                  </svg>
                  <span className="absolute text-sm font-semibold text-white">{missionProgress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="mt-4 rounded-2xl border border-[rgba(231,111,81,0.45)] bg-[rgba(231,111,81,0.12)] px-4 py-3 text-sm text-white">{error}</div>}

      {(mode === "dashboard" || mode === "analytics") && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Today's learning loop</h2>
              <span className="text-sm text-[var(--muted)]">Plan → Learn → Test → Adapt</span>
            </div>
            <div className="mt-5 grid gap-4">
              {workspace.today_plan.map((item) => (
                <button
                  key={item.topic_id}
                  onClick={() => setSelectedTopicId(item.topic_id)}
                  className={`rounded-[24px] border p-5 text-left transition ${selectedTopicId === item.topic_id ? "border-[rgba(244,162,97,0.45)] bg-[rgba(244,162,97,0.12)]" : "border-white/10 bg-white/5 hover:bg-white/[0.07]"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{item.domain}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.mission}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-semibold ${toneForScore(item.mastery_score)}`}>{item.mastery_score}%</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{item.trend}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Mastery snapshot</h2>
              <p className="text-sm text-[var(--muted)]">Topic-level confidence tracking</p>
            </div>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={masteryChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="name" stroke="#b7c4c7" />
                  <YAxis stroke="#b7c4c7" domain={[0, 100]} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#0d1f2a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16 }} />
                  <Bar dataKey="score" fill="#f4a261" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Roadmap orchestration</h2>
            <button onClick={() => refreshWorkspace()} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">Refresh</button>
          </div>
          <div className="mt-5 grid gap-4">
            {workspace.roadmap.map((topic) => (
              <div key={topic.topic_id} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">#{topic.sequence_position} {topic.domain}</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{topic.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{topic.description}</p>
                    <p className="mt-3 text-sm text-white/80">{topic.recommended_action}</p>
                  </div>
                  <div className="min-w-[110px] text-right">
                    <p className={`text-3xl font-semibold ${toneForScore(topic.mastery_score)}`}>{topic.mastery_score}%</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{topic.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          {(mode === "dashboard" || mode === "tutor") && (
            <div className="panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Tutor agent</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">Retrieval-aware coaching for the selected topic.</p>
                </div>
                <select value={selectedTopicId} onChange={(event) => setSelectedTopicId(event.target.value)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                  {workspace.roadmap.map((topic) => (
                    <option key={topic.topic_id} value={topic.topic_id}>{topic.title}</option>
                  ))}
                </select>
              </div>
              <textarea value={tutorQuestion} onChange={(event) => setTutorQuestion(event.target.value)} className="mt-4 min-h-[110px] w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 text-sm text-white outline-none" />
              <button onClick={handleAskTutor} className="mt-4 rounded-full bg-[var(--accent-2)] px-5 py-3 text-sm font-medium text-[var(--panel)] transition hover:translate-y-[-1px]">Ask tutor</button>
              {tutorResult && (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Mode: {tutorResult.mode}</p>
                  <p className="mt-3 text-sm leading-7 text-white/90">{tutorResult.answer}</p>
                  <p className="mt-4 text-sm text-[var(--accent)]">Follow-up: {tutorResult.follow_up_prompt}</p>
                </div>
              )}
            </div>
          )}

          {(mode === "dashboard" || mode === "analytics") && (
            <div className="panel p-6">
              <h2 className="text-2xl font-semibold text-white">Trend radar</h2>
              <div className="mt-4 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={masteryChartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="name" stroke="#b7c4c7" />
                    <Radar dataKey="score" stroke="#2a9d8f" fill="#2a9d8f" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </section>

      {mode === "dashboard" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="panel p-6 xl:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Quiz engine</h2>
              <button onClick={handleGenerateQuiz} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Generate</button>
            </div>
            {quiz ? (
              <div className="mt-5 space-y-4">
                {quiz.questions.map((question, index) => (
                  <div key={question.prompt} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-medium text-white">{question.prompt}</p>
                    {question.type === "mcq" ? (
                      <div className="mt-3 grid gap-2">
                        {question.options?.map((option) => (
                          <button key={option} onClick={() => setQuizAnswers((current) => current.map((value, valueIndex) => valueIndex === index ? option : value))} className={`rounded-2xl border px-3 py-2 text-left text-sm ${quizAnswers[index] === option ? "border-[rgba(244,162,97,0.45)] bg-[rgba(244,162,97,0.12)] text-white" : "border-white/10 bg-white/5 text-[var(--muted)]"}`}>
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea value={quizAnswers[index] ?? ""} onChange={(event) => setQuizAnswers((current) => current.map((value, valueIndex) => valueIndex === index ? event.target.value : value))} className="mt-3 min-h-[90px] w-full rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-3 text-sm text-white" />
                    )}
                  </div>
                ))}
                <button onClick={handleSubmitQuiz} className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--panel)]">Evaluate quiz</button>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[var(--muted)]">Generate a topic quiz to trigger the PLAN to LEARN to TEST to ANALYZE to ADAPT loop.</p>
            )}
            {quizResult && (
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-5">
                <p className={`text-4xl font-semibold ${toneForScore(quizResult.score)}`}>{quizResult.score}%</p>
                <p className="mt-2 text-sm text-white/90">{quizResult.coach_summary}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">{quizResult.remediation}</p>
              </div>
            )}
          </div>

          <div className="panel p-6 xl:col-span-1">
            <h2 className="text-2xl font-semibold text-white">Memory + RAG ingestion</h2>
            <input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} className="mt-4 w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" />
            <textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Paste class notes, summaries, or reference material here..." className="mt-4 min-h-[150px] w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 text-sm text-white" />
            <div className="mt-4 flex gap-3">
              <button onClick={handleIngest} className="rounded-full bg-[var(--accent-2)] px-5 py-3 text-sm font-medium text-[var(--panel)]">Ingest notes</button>
              <button onClick={handleSearch} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white">Search memory</button>
            </div>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="mt-4 w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" />
            <div className="mt-4 space-y-3">
              {(searchResults.length ? searchResults : workspace.retrieval_library.map((item) => ({ title: item.title, source_type: item.source_type, content: `${item.chunk_count} indexed chunks`, score: 0 }))).map((item) => (
                <div key={`${item.title}-${item.score}`} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{item.title}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{item.source_type}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-6 xl:col-span-1">
            <h2 className="text-2xl font-semibold text-white">Feedback loop</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Capture post-session confidence and friction so the planner can reprioritize.</p>
            <label className="mt-4 block text-sm text-[var(--muted)]">Confidence</label>
            <input type="range" min="0.2" max="1" step="0.05" value={feedbackConfidence} onChange={(event) => setFeedbackConfidence(Number(event.target.value))} className="mt-2 w-full" />
            <label className="mt-4 block text-sm text-[var(--muted)]">Focus minutes</label>
            <input type="number" min="5" max="120" value={feedbackFocus} onChange={(event) => setFeedbackFocus(Number(event.target.value))} className="mt-2 w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white" />
            <label className="mt-4 block text-sm text-[var(--muted)]">Friction</label>
            <select value={feedbackFriction} onChange={(event) => setFeedbackFriction(event.target.value)} className="mt-2 w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <textarea value={feedbackNotes} onChange={(event) => setFeedbackNotes(event.target.value)} className="mt-4 min-h-[120px] w-full rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-4 text-sm text-white" />
            <button onClick={handleFeedback} className="mt-4 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[var(--panel)]">Adapt roadmap</button>
            <div className="mt-5 space-y-3">
              {workspace.recommendations.map((recommendation) => (
                <div key={recommendation} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-[var(--muted)]">
                  {recommendation}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Mastery challenge queue</p>
              <div className="mt-3 space-y-2">
                {workspace.roadmap
                  .filter((topic) => topic.status !== "mastered")
                  .slice(0, 3)
                  .map((topic) => (
                    <div key={topic.topic_id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-sm">
                      <span className="text-white">{topic.title}</span>
                      <span className={toneForScore(topic.mastery_score)}>{topic.mastery_score}%</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {workspace.achievements.map((achievement) => (
                <div key={achievement.code} className="rounded-[22px] border border-[rgba(244,162,97,0.35)] bg-[rgba(244,162,97,0.12)] px-4 py-3">
                  <p className="font-medium text-white">{achievement.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {isPending && <div className="mt-4 text-sm text-[var(--muted)]">Refreshing adaptive state...</div>}
    </main>
  );
}
