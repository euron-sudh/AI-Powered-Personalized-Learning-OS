"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SubjectProgress, ProgressResponse, StudentProfile } from "@/types/student";

// ─── Subject visual backgrounds ───────────────────────────────────────────────

const SUBJECT_VISUALS: Record<string, { bg: string; accent: string; svg: React.ReactNode }> = {
  Mathematics: {
    bg: "from-blue-950/80 to-indigo-950/80",
    accent: "text-blue-400",
    svg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-30">
        <path d="M0 80 Q50 20 100 60 Q150 100 200 40" stroke="#60a5fa" strokeWidth="2" fill="none" />
        <path d="M0 100 Q50 40 100 80 Q150 120 200 60" stroke="#818cf8" strokeWidth="1.5" fill="none" />
        <path d="M0 60 Q50 0 100 40 Q150 80 200 20" stroke="#38bdf8" strokeWidth="1" fill="none" />
        <circle cx="100" cy="60" r="4" fill="#60a5fa" />
        <circle cx="50" cy="35" r="2.5" fill="#818cf8" />
        <circle cx="150" cy="85" r="2.5" fill="#38bdf8" />
      </svg>
    ),
  },
  Physics: {
    bg: "from-violet-950/80 to-purple-950/80",
    accent: "text-violet-400",
    svg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-30">
        <ellipse cx="100" cy="60" rx="80" ry="30" stroke="#a78bfa" strokeWidth="1.5" />
        <ellipse cx="100" cy="60" rx="80" ry="30" stroke="#c4b5fd" strokeWidth="1" transform="rotate(60 100 60)" />
        <ellipse cx="100" cy="60" rx="80" ry="30" stroke="#7c3aed" strokeWidth="1" transform="rotate(120 100 60)" />
        <circle cx="100" cy="60" r="8" fill="#a78bfa" opacity="0.8" />
        <circle cx="180" cy="60" r="4" fill="#c4b5fd" />
        <circle cx="20" cy="60" r="3" fill="#7c3aed" />
      </svg>
    ),
  },
  Chemistry: {
    bg: "from-emerald-950/80 to-teal-950/80",
    accent: "text-emerald-400",
    svg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-30">
        <hexagon />
        <path d="M80 60 L100 30 L120 60 L120 90 L100 105 L80 90 Z" stroke="#34d399" strokeWidth="1.5" fill="none" />
        <path d="M100 30 L100 10" stroke="#34d399" strokeWidth="1.5" />
        <path d="M120 60 L140 50" stroke="#34d399" strokeWidth="1.5" />
        <path d="M120 90 L140 100" stroke="#34d399" strokeWidth="1.5" />
        <path d="M80 90 L60 100" stroke="#34d399" strokeWidth="1.5" />
        <path d="M80 60 L60 50" stroke="#34d399" strokeWidth="1.5" />
        <circle cx="100" cy="10" r="4" fill="#6ee7b7" />
        <circle cx="144" cy="50" r="4" fill="#6ee7b7" />
        <circle cx="144" cy="100" r="4" fill="#6ee7b7" />
        <circle cx="56" cy="100" r="4" fill="#6ee7b7" />
        <circle cx="56" cy="50" r="4" fill="#6ee7b7" />
        <circle cx="100" cy="110" r="4" fill="#6ee7b7" />
      </svg>
    ),
  },
  English: {
    bg: "from-amber-950/80 to-orange-950/80",
    accent: "text-amber-400",
    svg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-30">
        <rect x="50" y="15" width="100" height="90" rx="4" stroke="#fbbf24" strokeWidth="1.5" />
        <path d="M100 15 L100 105" stroke="#f59e0b" strokeWidth="1" />
        <path d="M65 40 L95 40M65 55 L95 55M65 70 L95 70M65 85 L88 85" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M105 40 L135 40M105 55 L135 55M105 70 L128 70" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  Biology: {
    bg: "from-green-950/80 to-lime-950/80",
    accent: "text-green-400",
    svg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-30">
        <path d="M100 10 Q140 30 140 60 Q140 90 100 110 Q60 90 60 60 Q60 30 100 10Z" stroke="#4ade80" strokeWidth="1.5" fill="none" />
        <path d="M100 10 Q60 30 60 60 Q60 90 100 110" stroke="#86efac" strokeWidth="1" />
        <path d="M100 35 Q120 50 120 60 Q120 70 100 85" stroke="#4ade80" strokeWidth="1" fill="none" />
        <circle cx="100" cy="60" r="5" fill="#4ade80" opacity="0.8" />
      </svg>
    ),
  },
  "Computer Science": {
    bg: "from-cyan-950/80 to-sky-950/80",
    accent: "text-cyan-400",
    svg: (
      <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-30">
        <rect x="30" y="25" width="140" height="80" rx="6" stroke="#22d3ee" strokeWidth="1.5" />
        <path d="M55 65 L75 45 L90 60 L105 40 L120 55 L135 35 L150 50" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="75" cy="45" r="2.5" fill="#67e8f9" />
        <circle cx="105" cy="40" r="2.5" fill="#67e8f9" />
        <circle cx="135" cy="35" r="2.5" fill="#67e8f9" />
      </svg>
    ),
  },
};

const DEFAULT_VISUAL = {
  bg: "from-slate-900/80 to-slate-800/80",
  accent: "text-slate-400",
  svg: (
    <svg viewBox="0 0 200 120" fill="none" className="w-full h-full opacity-20">
      <path d="M40 90 L80 40 L120 70 L160 30" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="40" r="4" fill="#94a3b8" />
      <circle cx="120" cy="70" r="4" fill="#94a3b8" />
      <circle cx="160" cy="30" r="4" fill="#94a3b8" />
    </svg>
  ),
};

function getVisual(name: string) {
  return SUBJECT_VISUALS[name] ?? DEFAULT_VISUAL;
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ value, label, icon, color }: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-white/40 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  onGenerate,
  generating,
}: {
  subject: SubjectProgress;
  onGenerate: (name: string) => void;
  generating: string | null;
}) {
  const visual = getVisual(subject.subject_name);
  const pct = subject.total_chapters > 0
    ? Math.round((subject.chapters_completed / subject.total_chapters) * 100)
    : 0;
  const isReady = subject.total_chapters > 0;
  const isGenerating = generating === subject.subject_name;

  return (
    <div className="group bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-all duration-200 hover:shadow-xl hover:shadow-black/30">
      {/* Visual header */}
      <div className={cn("relative h-32 bg-gradient-to-br overflow-hidden", visual.bg)}>
        <div className="absolute inset-0 p-4">
          {visual.svg}
        </div>
        <div className="absolute bottom-3 left-4">
          <span className={cn("text-xs font-semibold uppercase tracking-wider", visual.accent)}>
            {subject.subject_name}
          </span>
        </div>
        {isReady && (
          <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-white/70">
            {pct}%
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {isReady ? (
          <>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-white/40">
                {subject.chapters_completed} / {subject.total_chapters} chapters
              </span>
              {subject.average_score !== null && (
                <span className="text-xs font-semibold text-white/60">
                  Score: {Math.round(subject.average_score)}%
                </span>
              )}
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <Link
              href={`/learn/${subject.subject_id}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white transition-colors duration-150"
            >
              {pct === 0 ? "Start Learning" : "Continue"} →
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs text-white/30 mb-3">
              {isGenerating ? "Building your curriculum…" : "Curriculum not generated yet"}
            </p>
            <button
              onClick={() => onGenerate(subject.subject_name)}
              disabled={isGenerating}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                "bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Generating…
                </>
              ) : (
                <><span className="opacity-70">✦</span> Build Curriculum</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function load() {
      // Fire profile + progress in parallel — saves one full round-trip
      const [profResult, progressResult] = await Promise.allSettled([
        apiGet<StudentProfile>("/api/onboarding/profile", 60_000),
        apiGet<ProgressResponse>(`/api/progress/${user!.id}`, 20_000),
      ]);

      // Handle profile
      if (profResult.status === "rejected") {
        const err = profResult.reason;
        if (err instanceof ApiError) {
          if (err.status === 404) { router.push("/onboarding"); return; }
          if (err.status === 401) { router.push("/login"); return; }
        }
        setError("Failed to load profile. Please refresh.");
        setLoading(false);
        return;
      }
      const prof = profResult.value;
      setProfile(prof);
      if (!prof.onboarding_completed) { router.push("/onboarding"); return; }

      // Handle progress
      let progressSubjects: SubjectProgress[] = [];
      if (progressResult.status === "fulfilled") {
        progressSubjects = progressResult.value.subjects;
        setSubjects(progressSubjects);
      } else {
        const err = progressResult.reason;
        if (!(err instanceof ApiError && err.status === 404)) {
          setError("Failed to load progress. Please refresh.");
        }
      }

      setLoading(false);

      // Auto-generate chapters for subjects with 0 chapters (uses seeded syllabus — instant)
      const needsGeneration = progressSubjects.filter((s) => s.total_chapters === 0);
      if (needsGeneration.length > 0 && prof) {
        const results = await Promise.allSettled(
          needsGeneration.map((s) =>
            apiPost("/api/curriculum/generate", {
              subject_name: s.subject_name,
              difficulty_level: "beginner",
              board: prof!.board ?? null,
              grade: prof!.grade ?? null,
            })
          )
        );
        if (results.some((r) => r.status === "fulfilled")) {
          try {
            const updated = await apiGet<ProgressResponse>(`/api/progress/${user!.id}`);
            setSubjects(updated.subjects);
          } catch { /* silent */ }
        }
      }
    }

    load();
  }, [user, authLoading, router]);

  // Supabase Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`progress:${user.id}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "student_progress",
        filter: `student_id=eq.${user.id}`,
      }, async () => {
        try {
          const progress = await apiGet<ProgressResponse>(`/api/progress/${user.id}`);
          setSubjects(progress.subjects);
        } catch { /* silent */ }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function handleGenerateCurriculum(subjectName: string) {
    setGenerating(subjectName);
    setError(null);
    try {
      await apiPost("/api/curriculum/generate", {
        subject_name: subjectName,
        difficulty_level: "beginner",
        board: profile?.board ?? null,
        grade: profile?.grade ?? null,
      });
      const progress = await apiGet<ProgressResponse>(`/api/progress/${user!.id}`);
      setSubjects(progress.subjects);
    } catch {
      setError(`Failed to generate curriculum for ${subjectName}. Please try again.`);
    } finally {
      setGenerating(null);
    }
  }

  // Derived stats
  const totalChapters = subjects.reduce((s, x) => s + x.chapters_completed, 0);
  const activeSubjects = subjects.filter((s) => s.total_chapters > 0).length;
  const avgScore = (() => {
    const scored = subjects.filter((s) => s.average_score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, s) => sum + (s.average_score ?? 0), 0) / scored.length);
  })();

  // Most recent in-progress subject for hero
  const inProgress = subjects.filter((s) => s.chapters_completed > 0 && s.chapters_completed < s.total_chapters);
  const heroSubject = inProgress[0] ?? subjects.find((s) => s.total_chapters > 0);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
          <div className="h-52 rounded-3xl bg-white/[0.03] animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            <span>⚠</span> {error}
          </div>
        )}

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1530] via-[#0f1a38] to-[#0a1020] border border-white/[0.07] p-8 md:p-10">
          {/* Background glow */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center gap-8">
            {/* Left content */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-xs font-medium text-blue-400">Personalized Track</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
                {heroSubject
                  ? "Continue your learning momentum"
                  : `Welcome back${profile?.name ? `, ${profile.name}` : ""}!`}
              </h1>
              <p className="text-white/50 text-sm md:text-base leading-relaxed mb-6 max-w-lg">
                {heroSubject
                  ? "Your AI tutor has prepared the next lesson sequence with focused practice and recap activities."
                  : "Your personalized curriculum is ready. Pick a subject and start learning."}
              </p>

              <div className="flex flex-wrap gap-3">
                {heroSubject ? (
                  <>
                    <Link
                      href={`/learn/${heroSubject.subject_id}`}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-900/40"
                    >
                      Resume Lesson
                    </Link>
                    <Link
                      href="/tutor"
                      className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Ask AI Tutor
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/tutor"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Open AI Tutor
                  </Link>
                )}
              </div>
            </div>

            {/* Right panel — current focus */}
            {heroSubject && (
              <div className="md:w-64 shrink-0">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                  <div className={cn("h-32 bg-gradient-to-br relative overflow-hidden", getVisual(heroSubject.subject_name).bg)}>
                    <div className="absolute inset-0 p-3">
                      {getVisual(heroSubject.subject_name).svg}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Current Focus</p>
                    <p className="text-sm font-semibold text-white">{heroSubject.subject_name}</p>
                    <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.round((heroSubject.chapters_completed / heroSubject.total_chapters) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-white/30 mt-1.5">
                      {heroSubject.chapters_completed}/{heroSubject.total_chapters} chapters
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            value={activeSubjects}
            label="Subjects"
            color="bg-blue-500/15"
            icon={
              <svg className="text-blue-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.8" />
                <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.5" />
                <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.5" />
                <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.8" />
              </svg>
            }
          />
          <StatCard
            value={totalChapters}
            label="Chapters Done"
            color="bg-violet-500/15"
            icon={
              <svg className="text-violet-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L2 7l8 5 8-5-8-5z" fill="currentColor" opacity="0.8" />
                <path d="M2 13l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
              </svg>
            }
          />
          <StatCard
            value={subjects.reduce((s, x) => s + x.total_chapters, 0)}
            label="Total Chapters"
            color="bg-cyan-500/15"
            icon={
              <svg className="text-cyan-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M7 10h6M7 7h4M7 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
          />
          <StatCard
            value={avgScore !== null ? `${avgScore}%` : "—"}
            label="Average Score"
            color="bg-amber-500/15"
            icon={
              <svg className="text-amber-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 14l3.5-4 3 2.5 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
        </div>

        {/* ── Continue Learning ── */}
        {subjects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Continue Learning</h2>
                <p className="text-xs text-white/40 mt-0.5">Pick up exactly where you paused</p>
              </div>
              <Link
                href="/learn"
                className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
              >
                View all <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.subject_id}
                  subject={subject}
                  onGenerate={handleGenerateCurriculum}
                  generating={generating}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Progress by subject ── */}
        {subjects.filter((s) => s.total_chapters > 0).length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-5">Progress Overview</h2>
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-6 space-y-5">
              {subjects.filter((s) => s.total_chapters > 0).map((s) => {
                const pct = Math.round((s.chapters_completed / s.total_chapters) * 100);
                const visual = getVisual(s.subject_name);
                return (
                  <div key={s.subject_id} className="flex items-center gap-4">
                    <span className="text-lg w-7 text-center shrink-0">
                      {SUBJECT_EMOJIS[s.subject_name] ?? "📚"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-white/80 truncate">{s.subject_name}</span>
                        <span className="text-xs text-white/30 ml-2 shrink-0">
                          {s.chapters_completed}/{s.total_chapters}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", visual.accent === "text-blue-400" ? "from-blue-600 to-blue-400" : visual.accent === "text-violet-400" ? "from-violet-600 to-violet-400" : visual.accent === "text-emerald-400" ? "from-emerald-600 to-emerald-400" : "from-blue-600 to-indigo-400")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white/40 w-10 text-right shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {subjects.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-3xl mx-auto mb-5">
              📚
            </div>
            <p className="font-semibold text-white text-lg">No subjects yet</p>
            <p className="text-sm text-white/40 mt-2">Complete onboarding to add your subjects.</p>
            <Link
              href="/onboarding"
              className="mt-5 inline-flex items-center gap-2 text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors"
            >
              Go to onboarding →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
