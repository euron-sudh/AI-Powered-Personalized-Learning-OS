"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getWorkspace,
  bootstrapLearner,
  generateQuiz,
  submitQuiz,
  askTutor,
  ingestDocument,
  searchLibrary,
  saveLessonFeedback,
  DEFAULT_LEARNER_ID,
  type Workspace,
  type GeneratedQuiz,
  type QuizEvaluation,
} from "@/lib/learning-os";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { cn } from "@/lib/utils";

type View = "plan" | "quiz" | "tutor" | "library" | "feedback";

const TREND_ICON: Record<string, string> = { improving: "↑", declining: "↓", steady: "→" };
const TREND_COLOR: Record<string, string> = {
  improving: "text-emerald-400",
  declining: "text-red-400",
  steady: "text-white/40",
};
const DIFF_COLOR: Record<string, string> = {
  beginner: "text-emerald-400",
  intermediate: "text-amber-400",
  advanced: "text-red-400",
};

function scoreColor(v: number) {
  return v >= 75 ? "text-emerald-400" : v >= 50 ? "text-amber-400" : "text-red-400";
}

const TABS: { id: View; label: string }[] = [
  { id: "plan", label: "Today's Plan" },
  { id: "quiz", label: "Quiz Engine" },
  { id: "tutor", label: "AI Tutor" },
  { id: "library", label: "Library" },
  { id: "feedback", label: "Feedback" },
];

export default function AdaptiveOSPanel() {
  const { user } = useSupabaseAuth();
  const learnerId = user?.id ?? DEFAULT_LEARNER_ID;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("plan");

  // Quiz
  const [quizTopic, setQuizTopic] = useState<{ id: string; title: string } | null>(null);
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<QuizEvaluation | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizStart, setQuizStart] = useState(0);

  // Tutor
  const [tutorTopicId, setTutorTopicId] = useState("");
  const [question, setQuestion] = useState("How should I approach this topic today?");
  const [tutorResult, setTutorResult] = useState<Awaited<ReturnType<typeof askTutor>> | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Library
  const [noteTitle, setNoteTitle] = useState("My revision notes");
  const [noteBody, setNoteBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ title: string; source_type: string; content: string; score: number }>
  >([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  // Feedback
  const [fbTopicId, setFbTopicId] = useState("");
  const [fbConfidence, setFbConfidence] = useState(0.7);
  const [fbFocus, setFbFocus] = useState(30);
  const [fbFriction, setFbFriction] = useState("medium");
  const [fbNotes, setFbNotes] = useState("");
  const [fbLoading, setFbLoading] = useState(false);

  // ── Load workspace ───────────────────────────────────────────────────────────
  const loadWorkspace = useCallback(async () => {
    try {
      const ws = await getWorkspace(learnerId);
      setWorkspace(ws);
      const first = ws.today_plan[0]?.topic_id ?? ws.roadmap[0]?.topic_id ?? "";
      setTutorTopicId((prev) => prev || first);
      setFbTopicId((prev) => prev || first);
    } catch {
      try {
        const res = await bootstrapLearner(learnerId);
        setWorkspace(res.workspace);
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }, [learnerId]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  // ── Quiz handlers ────────────────────────────────────────────────────────────
  async function startQuiz(topicId: string, title: string) {
    setQuizTopic({ id: topicId, title });
    setQuiz(null); setQuizAnswers([]); setQuizResult(null);
    setQuizLoading(true); setView("quiz");
    try {
      const q = await generateQuiz(topicId, learnerId);
      setQuiz(q);
      setQuizAnswers(Array(q.questions.length).fill(""));
      setQuizStart(Date.now());
    } catch { setView("plan"); }
    finally { setQuizLoading(false); }
  }

  async function submitQuizHandler() {
    if (!quiz) return;
    setQuizLoading(true);
    try {
      const dur = Math.round((Date.now() - quizStart) / 1000);
      const res = await submitQuiz(quiz.quiz_id, quizAnswers, dur, learnerId);
      setQuizResult(res); setWorkspace(res.workspace);
    } catch { /* silent */ }
    finally { setQuizLoading(false); }
  }

  // ── Tutor handler ────────────────────────────────────────────────────────────
  async function askTutorHandler() {
    if (!tutorTopicId || !question.trim()) return;
    setTutorLoading(true); setTutorResult(null);
    try { setTutorResult(await askTutor(tutorTopicId, question.trim(), learnerId)); }
    catch { /* silent */ }
    finally { setTutorLoading(false); }
  }

  // ── Library handlers ─────────────────────────────────────────────────────────
  async function ingestHandler() {
    if (!noteBody.trim()) return;
    setLibraryLoading(true);
    try { const r = await ingestDocument(noteTitle, noteBody, "notes", learnerId); setWorkspace(r.workspace); setNoteBody(""); }
    catch { /* silent */ }
    finally { setLibraryLoading(false); }
  }

  async function searchHandler() {
    if (!searchQuery.trim()) return;
    setLibraryLoading(true);
    try { setSearchResults((await searchLibrary(searchQuery, learnerId)).results); }
    catch { /* silent */ }
    finally { setLibraryLoading(false); }
  }

  async function reindexHandler() {
    setReindexing(true);
    try {
      await fetch(`/api/proxy/api/system/library/reindex?learner_id=${learnerId}`, { method: "POST" });
      await loadWorkspace();
    } catch { /* silent */ }
    finally { setReindexing(false); }
  }

  // ── Feedback handler ─────────────────────────────────────────────────────────
  async function feedbackHandler() {
    if (!fbTopicId) return;
    setFbLoading(true);
    try { const r = await saveLessonFeedback(fbTopicId, fbConfidence, fbFocus, fbFriction, fbNotes, learnerId); setWorkspace(r.workspace); }
    catch { /* silent */ }
    finally { setFbLoading(false); }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="mt-2 space-y-4">
        <div className="h-6 w-52 rounded-lg bg-white/[0.04] animate-pulse" />
        <div className="h-64 rounded-2xl bg-white/[0.03] animate-pulse" />
      </section>
    );
  }

  if (!workspace) return null;

  const { learner, today_plan, mastery_snapshot, analytics, achievements, roadmap, retrieval_library, recommendations } = workspace;
  const tutorTopic = roadmap.find((t) => t.topic_id === tutorTopicId);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Your AI Learning Coach
          </h2>
          <p className="text-xs text-white/40 mt-0.5">🟢 AI Active · AI Learning Plan · Updated after every session</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-col sm:flex-row">
          <div className="w-full sm:w-auto">
            <p className="text-xs text-white/40 font-medium mb-1.5">Level {learner.level} · {learner.xp} / {learner.level * 120} XP</p>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                style={{ width: `${Math.min((learner.xp / (learner.level * 120)) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badges (XP, Streak, Achievements) */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs font-medium text-amber-400">
          ⚡ {learner.xp} XP
        </span>
          {learner.streak_days > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 text-xs font-medium text-orange-400">
              🔥 {learner.streak_days}-day streak
            </span>
          )}
        {achievements.length > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 text-xs font-medium text-violet-400">
            🏆 {achievements.length} badge{achievements.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0",
              view === id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════
          TODAY'S PLAN
      ═══════════════════════════════════════ */}
      {view === "plan" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Queue */}
          <div className="lg:col-span-2 bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Recommended Today — Plan → Learn → Test → Adapt
            </p>
            {today_plan.length === 0 && (
              <p className="text-sm text-white/40 py-4">All caught up! Check back tomorrow.</p>
            )}
            {today_plan.map((item) => {
              const masteryBadge = item.mastery_score < 50 ? "⚠ Weak area" : item.mastery_score < 80 ? "📈 Improving" : "✅ Strong";
              const masteryColor = item.mastery_score < 50 ? "text-yellow-400" : item.mastery_score < 80 ? "text-blue-400" : "text-emerald-400";
              return (
                <div
                  key={item.topic_id}
                  className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-all"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className={cn("text-xs font-medium mt-1", masteryColor)}>{masteryBadge}</p>
                  </div>
                  <p className="text-xs text-white/60">🎯 {item.mission}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <span>⏱ {item.estimated_minutes} min</span>
                      <span className={cn("font-medium", TREND_COLOR[item.trend] ?? "text-white/40")}>
                        {TREND_ICON[item.trend] ?? "→"} {item.trend}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startQuiz(item.topic_id, item.title)}
                        className="text-xs bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 px-2.5 py-1.5 rounded-lg transition-all"
                      >Quiz</button>
                      <button
                        onClick={() => { setTutorTopicId(item.topic_id); setView("tutor"); }}
                        className="text-xs bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 px-2.5 py-1.5 rounded-lg transition-all"
                      >Tutor</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Avg Mastery", value: `${analytics.average_mastery}%` },
                { label: "Mastered", value: String(analytics.mastered_topics) },
                { label: "Focus Topics", value: String(analytics.focus_topics) },
                { label: "Library Docs", value: String(analytics.active_documents) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#0d1424] border border-white/[0.07] rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-xs text-white/40 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Mastery Snapshot</p>
              {mastery_snapshot.slice(0, 5).map((m) => (
                <button
                  key={m.topic_id}
                  onClick={() => startQuiz(m.topic_id, m.title)}
                  className="w-full text-left hover:bg-white/[0.04] p-1 rounded-lg transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white/70 truncate max-w-[70%] font-medium">{m.title}</span>
                    <span className={cn("text-xs font-semibold", scoreColor(m.score))}>
                      {m.score}% {TREND_ICON[m.trend]}
                    </span>
                  </div>
                  <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        m.score >= 75 ? "bg-emerald-500" : m.score >= 50 ? "bg-amber-500" : "bg-red-500/70"
                      )}
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          QUIZ ENGINE
      ═══════════════════════════════════════ */}
      {view === "quiz" && (
        <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5">

          {/* Topic picker */}
          {!quizTopic && (
            <div>
              <p className="text-sm text-white/60 mb-4">
                Select a topic — triggers the PLAN → LEARN → TEST → ANALYZE → ADAPT loop
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roadmap.slice(0, 8).map((item) => (
                  <button
                    key={item.topic_id}
                    onClick={() => startQuiz(item.topic_id, item.title)}
                    className="text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group"
                  >
                    <p className="text-sm font-medium text-white group-hover:text-violet-300">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-xs", DIFF_COLOR[item.difficulty] ?? "text-white/40")}>
                        {item.difficulty}
                      </span>
                      <span className="text-xs text-white/30">·</span>
                      <span className={cn("text-xs font-semibold", scoreColor(item.mastery_score))}>
                        {item.mastery_score}% mastery
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generating */}
          {quizTopic && quizLoading && !quiz && (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-violet-500/50 border-t-violet-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/50">
                Generating quiz for <span className="text-white/80">{quizTopic.title}</span>…
              </p>
            </div>
          )}

          {/* Active quiz */}
          {quiz && !quizResult && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">{quiz.title}</h3>
                <button
                  onClick={() => { setQuizTopic(null); setQuiz(null); }}
                  className="text-xs text-white/40 hover:text-white/70"
                >Cancel</button>
              </div>
              {quiz.questions.map((q, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-sm text-white/80">{i + 1}. {q.prompt}</p>
                  {q.type === "mcq" && q.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            const next = [...quizAnswers];
                            next[i] = opt.charAt(0);
                            setQuizAnswers(next);
                          }}
                          className={cn(
                            "text-left text-sm px-3 py-2.5 rounded-xl border transition-all",
                            quizAnswers[i] === opt.charAt(0)
                              ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                              : "border-white/[0.07] bg-white/[0.03] text-white/70 hover:border-white/20"
                          )}
                        >{opt}</button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      value={quizAnswers[i]}
                      onChange={(e) => {
                        const next = [...quizAnswers];
                        next[i] = e.target.value;
                        setQuizAnswers(next);
                      }}
                      placeholder="Your answer…" rows={2}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 resize-none"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={submitQuizHandler}
                disabled={quizLoading || quizAnswers.some((a) => !a.trim())}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
              >{quizLoading ? "Evaluating…" : "Evaluate quiz"}</button>
            </div>
          )}

          {/* Results */}
          {quizResult && (
            <div className="space-y-4">
              <div className={cn(
                "rounded-xl p-5 border text-center",
                quizResult.score >= 75
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : quizResult.score >= 50
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-red-500/10 border-red-500/20"
              )}>
                <p className={cn("text-4xl font-bold", scoreColor(quizResult.score))}>{quizResult.score}%</p>
                <p className="text-sm text-white/70 mt-2">{quizResult.coach_summary}</p>
              </div>
              {quizResult.remediation && (
                <p className="text-xs text-white/50 italic leading-relaxed">{quizResult.remediation}</p>
              )}
              <div className="space-y-2">
                {quizResult.items.map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3 rounded-xl border text-sm",
                      item.correct ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
                    )}
                  >
                    <p className="text-white/80 font-medium">{item.prompt}</p>
                    <p className={cn("mt-1 text-xs", item.correct ? "text-emerald-400" : "text-red-400")}>
                      Your answer: {item.answer}{" "}
                      {item.correct ? "✓" : `✗  (expected: ${item.expected})`}
                    </p>
                    {item.explanation && (
                      <p className="mt-1 text-xs text-white/40">{item.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
              {quizResult.achievements?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {quizResult.achievements.map((a) => (
                    <span
                      key={a.code}
                      className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs font-medium text-amber-400"
                    >🏆 {a.title}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setQuizTopic(null); setQuiz(null); setQuizResult(null); }}
                className="w-full py-2 rounded-xl border border-white/[0.08] text-white/60 hover:text-white text-sm transition-all"
              >Take another quiz</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          AI TUTOR
      ═══════════════════════════════════════ */}
      {view === "tutor" && (
        <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-4">
          {/* Topic dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/40 shrink-0">Topic</label>
            <select
              value={tutorTopicId}
              onChange={(e) => setTutorTopicId(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              {roadmap.map((t) => (
                <option key={t.topic_id} value={t.topic_id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Context line */}
          {tutorTopic && (
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className={cn("font-semibold", scoreColor(tutorTopic.mastery_score))}>
                {tutorTopic.mastery_score}% mastery
              </span>
              <span>·</span>
              <span>{tutorTopic.recommended_action}</span>
            </div>
          )}

          {/* Question textarea */}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about this topic…"
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
          />
          <button
            onClick={askTutorHandler}
            disabled={!tutorTopicId || !question.trim() || tutorLoading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
          >{tutorLoading ? "Thinking…" : "Ask tutor"}</button>

          {/* Answer */}
          {tutorResult && (
            <div className="space-y-3">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Tutor</span>
                  <span className="text-xs text-white/30">· mode: {tutorResult.mode}</span>
                </div>
                <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{tutorResult.answer}</p>
                {tutorResult.follow_up_prompt && (
                  <p className="mt-3 text-xs text-blue-400 italic">
                    Follow-up: {tutorResult.follow_up_prompt}
                  </p>
                )}
              </div>
              {tutorResult.retrieval_hits?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Sources retrieved</p>
                  {tutorResult.retrieval_hits.map((hit, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-white/70">{hit.title}</span>
                        <span className="text-xs text-white/30">{hit.source_type} · {hit.score.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-white/40 line-clamp-2">{hit.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link
            href="/tutor"
            className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Open full tutor console →
          </Link>
        </div>
      )}

      {/* ═══════════════════════════════════════
          LIBRARY  (Memory + RAG ingestion)
      ═══════════════════════════════════════ */}
      {view === "library" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ingest + search form */}
          <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Memory + RAG Ingestion
            </p>
            <input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Document title"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
            />
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Paste class notes, summaries, or reference material here…"
              rows={6}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={ingestHandler}
                disabled={libraryLoading || !noteBody.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold transition-all"
              >{libraryLoading ? "Ingesting…" : "Ingest notes"}</button>
              <button
                onClick={reindexHandler}
                disabled={reindexing}
                title="Re-embed all docs with current model (run after enabling OpenAI key)"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-sm transition-all disabled:opacity-40"
              >{reindexing ? "Reindexing…" : "Reindex"}</button>
            </div>

            {/* Search bar */}
            <div className="pt-2 border-t border-white/[0.05] space-y-2">
              <p className="text-xs text-white/30">Search memory</p>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchHandler()}
                  placeholder="retrieval practice, forces, algebra…"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40"
                />
                <button
                  onClick={searchHandler}
                  disabled={libraryLoading || !searchQuery.trim()}
                  className="px-4 py-2 rounded-xl border border-white/[0.08] text-white/60 hover:text-white text-sm transition-all disabled:opacity-40"
                >Search</button>
              </div>
            </div>
          </div>

          {/* Document listing */}
          <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              {searchResults.length > 0 ? `Results for "${searchQuery}"` : "Indexed documents"}
            </p>
            {(searchResults.length > 0
              ? searchResults
              : retrieval_library.map((item) => ({
                  title: item.title,
                  source_type: item.source_type,
                  content: `${item.chunk_count} indexed chunk${item.chunk_count !== 1 ? "s" : ""}`,
                  score: 0,
                }))
            ).map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <span className="text-xs uppercase tracking-wider text-white/30 shrink-0">
                    {item.source_type}
                  </span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed line-clamp-3">{item.content}</p>
                {item.score > 0 && (
                  <p className="text-xs text-emerald-400 mt-1.5">score: {item.score.toFixed(3)}</p>
                )}
              </div>
            ))}
            {retrieval_library.length === 0 && searchResults.length === 0 && (
              <p className="text-sm text-white/30 py-4">
                No documents yet. Ingest your notes to power RAG search.
              </p>
            )}
            {searchResults.length > 0 && (
              <button
                onClick={() => setSearchResults([])}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >Clear results</button>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          FEEDBACK LOOP
      ═══════════════════════════════════════ */}
      {view === "feedback" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Post-session Feedback</p>
              <p className="text-xs text-white/35 mt-1 leading-relaxed">
                Capture confidence and friction so the planner can reprioritize your roadmap.
              </p>
            </div>

            {/* Topic */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Topic</label>
              <select
                value={fbTopicId}
                onChange={(e) => setFbTopicId(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
              >
                {roadmap.map((t) => (
                  <option key={t.topic_id} value={t.topic_id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/50">Confidence</label>
                <span className="text-xs font-semibold text-amber-400">{Math.round(fbConfidence * 100)}%</span>
              </div>
              <input
                type="range" min="0.2" max="1" step="0.05"
                value={fbConfidence}
                onChange={(e) => setFbConfidence(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Focus minutes */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Focus minutes</label>
              <input
                type="number" min="5" max="120"
                value={fbFocus}
                onChange={(e) => setFbFocus(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
              />
            </div>

            {/* Friction */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Friction</label>
              <select
                value={fbFriction}
                onChange={(e) => setFbFriction(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Notes (optional)</label>
              <textarea
                value={fbNotes}
                onChange={(e) => setFbNotes(e.target.value)}
                placeholder="Need one more worked example."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/40 resize-none"
              />
            </div>

            <button
              onClick={feedbackHandler}
              disabled={fbLoading || !fbTopicId}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-sm font-bold transition-all"
            >{fbLoading ? "Adapting…" : "Adapt roadmap"}</button>
          </div>

          {/* Right column: recommendations + challenge queue + achievements */}
          <div className="space-y-4">
            {recommendations.length > 0 && (
              <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">AI Recommendations</p>
                {recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-sm text-white/60 leading-relaxed">
                    {rec}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                Mastery Challenge Queue
              </p>
              {roadmap.filter((t) => t.status !== "mastered").slice(0, 3).map((t) => (
                <div key={t.topic_id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/20 text-sm">
                  <span className="text-white/80">{t.title}</span>
                  <span className={cn("font-semibold", scoreColor(t.mastery_score))}>{t.mastery_score}%</span>
                </div>
              ))}
            </div>

            {achievements.length > 0 && (
              <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 space-y-3">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Achievements</p>
                {achievements.map((a) => (
                  <div key={a.code} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <p className="text-sm font-semibold text-white">🏆 {a.title}</p>
                    <p className="text-xs text-white/45 mt-0.5">{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
