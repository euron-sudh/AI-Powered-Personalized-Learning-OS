"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { SkeletonCard, SkeletonStat } from "@/components/ui/SkeletonCard";
import type { SubjectProgress, ProgressResponse, StudentProfile } from "@/types/student";

// ─── Feature card definitions ────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "✦",
    label: "AI Tutor",
    desc: "Socratic chat with your personal tutor",
    href: "/tutor",
    accent: "from-indigo-500 to-blue-500",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    ring: "ring-indigo-100",
  },
  {
    icon: "◎",
    label: "Voice",
    desc: "Speak naturally, learn hands-free",
    href: "/voice",
    accent: "from-violet-500 to-purple-500",
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-100",
  },
  {
    icon: "▣",
    label: "Video",
    desc: "Emotion-aware adaptive sessions",
    href: "/video-session",
    accent: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-100",
  },
  {
    icon: "◈",
    label: "Analytics",
    desc: "Track scores, progress, and trends",
    href: "/analytics",
    accent: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-100",
  },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name }: { name?: string | null }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold select-none shadow-sm">
      {initials}
    </div>
  );
}

function FeatureCard({ icon, label, desc, href, accent, bg, text, ring }: typeof FEATURES[number]) {
  return (
    <Link href={href} className="group block">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5 ring-1",
        ring
      )}>
        {/* Gradient accent strip */}
        <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", accent)} />

        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold mb-3 transition-transform duration-200 group-hover:scale-110",
          bg, text
        )}>
          {icon}
        </div>

        <p className="font-semibold text-slate-800 text-sm leading-tight">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>

        <div className={cn(
          "mt-3 inline-flex items-center gap-1 text-xs font-medium transition-colors duration-150",
          text
        )}>
          Open <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </div>
      </div>
    </Link>
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
  const pct = subject.total_chapters > 0
    ? Math.round((subject.chapters_completed / subject.total_chapters) * 100)
    : 0;
  const isNew = subject.total_chapters === 0;

  return (
    <div className={cn(
      "group bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all duration-200",
      "hover:shadow-md hover:-translate-y-0.5"
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl">
            {SUBJECT_EMOJIS[subject.subject_name] ?? "📚"}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm leading-tight">
              {subject.subject_name}
            </h3>
            {!isNew ? (
              <p className="text-xs text-slate-400 mt-0.5">
                {subject.chapters_completed} of {subject.total_chapters} chapters
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">Ready to generate</p>
            )}
          </div>
        </div>
        {subject.average_score !== null && subject.total_chapters > 0 && (
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {Math.round(subject.average_score)}%
          </span>
        )}
      </div>

      {/* Progress or empty */}
      {!isNew ? (
        <>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-400">Progress</span>
              <span className="text-xs font-medium text-slate-600">{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <Link
            href={`/learn/${subject.subject_id}`}
            className={cn(
              "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              pct === 0
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {pct === 0 ? "Start Learning" : "Continue"}
            <span className="text-xs opacity-60">→</span>
          </Link>
        </>
      ) : (
        <button
          onClick={() => onGenerate(subject.subject_name)}
          disabled={generating === subject.subject_name}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mt-2",
            "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {generating === subject.subject_name ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <span className="text-indigo-300">✦</span>
              Build Curriculum with AI
            </>
          )}
        </button>
      )}
    </div>
  );
}

function PendingSubjectCard({
  name,
  onGenerate,
  generating,
}: {
  name: string;
  onGenerate: (n: string) => void;
  generating: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-5 hover:border-slate-300 transition-colors duration-150">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl">
          {SUBJECT_EMOJIS[name] ?? "📚"}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">No curriculum yet</p>
        </div>
      </div>
      <button
        onClick={() => onGenerate(name)}
        disabled={generating === name}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {generating === name ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <span className="text-indigo-300">✦</span>
            Build Curriculum with AI
          </>
        )}
      </button>
    </div>
  );
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className={cn("text-3xl font-bold tracking-tight", accent)}>{value}</p>
      <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-wide">{label}</p>
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
      try {
        const prof = await apiGet<StudentProfile>("/api/onboarding/profile");
        setProfile(prof);
        if (!prof.onboarding_completed) { router.push("/onboarding"); return; }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) { router.push("/onboarding"); return; }
          if (err.status === 401) { router.push("/login"); return; }
        }
        setError("Failed to load profile. Please refresh.");
        setLoading(false);
        return;
      }

      try {
        const progress = await apiGet<ProgressResponse>(`/api/progress/${user!.id}`);
        setSubjects(progress.subjects);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          setError("Failed to load progress. Please refresh.");
        }
      }

      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  // Supabase Realtime — re-fetch on progress changes
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

  const pendingSubjects = profile?.interests?.filter(
    (interest) => !subjects.some((s) => s.subject_name === interest)
  ) ?? [];

  const allStrengths = subjects.flatMap((s) => s.strengths ?? []);
  const allWeaknesses = subjects.flatMap((s) => s.weaknesses ?? []);

  const avgScore = (() => {
    const scored = subjects.filter((s) => s.average_score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, s) => sum + (s.average_score ?? 0), 0) / scored.length);
  })();

  // ─── Loading skeleton ───────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>

          {/* Feature cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
            ))}
          </div>

          {/* Subject cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            <span className="text-red-400 mt-0.5">⚠</span>
            {error}
          </div>
        )}

        {/* ── Header ── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={profile?.name} />
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {profile?.name ? `Hello, ${profile.name}` : "Welcome back"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {profile?.grade && (
                  <span className="text-sm text-slate-400">Grade {profile.grade}</span>
                )}
                {profile?.board && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {profile.board}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick stat pill */}
          {subjects.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white border border-slate-100 shadow-sm rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-slate-600">
                {subjects.reduce((s, x) => s + x.chapters_completed, 0)} chapters completed
              </span>
            </div>
          )}
        </header>

        {/* ── Feature cards ── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURES.map((f) => <FeatureCard key={f.label} {...f} />)}
          </div>
        </section>

        {/* ── Subjects ── */}
        {(subjects.length > 0 || pendingSubjects.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Your Subjects</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {subjects.filter(s => s.total_chapters > 0).length} active
                  {pendingSubjects.length > 0 && ` · ${pendingSubjects.length} pending`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.subject_id}
                  subject={subject}
                  onGenerate={handleGenerateCurriculum}
                  generating={generating}
                />
              ))}
              {pendingSubjects.map((name) => (
                <PendingSubjectCard
                  key={name}
                  name={name}
                  onGenerate={handleGenerateCurriculum}
                  generating={generating}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {subjects.length === 0 && pendingSubjects.length === 0 && !error && (
          <section className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl mx-auto mb-4">
              📚
            </div>
            <p className="font-semibold text-slate-700">No subjects yet</p>
            <p className="text-sm text-slate-400 mt-1">Complete onboarding to add your subjects.</p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              Go to onboarding →
            </Link>
          </section>
        )}

        {/* ── Stats ── */}
        {subjects.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-5">Overview</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <StatCard
                value={subjects.filter(s => s.total_chapters > 0).length}
                label="Active subjects"
                accent="text-indigo-600"
              />
              <StatCard
                value={subjects.reduce((s, x) => s + x.chapters_completed, 0)}
                label="Chapters done"
                accent="text-emerald-600"
              />
              <StatCard
                value={subjects.reduce((s, x) => s + x.total_chapters, 0)}
                label="Total chapters"
                accent="text-violet-600"
              />
              <StatCard
                value={avgScore !== null ? `${avgScore}%` : "—"}
                label="Avg score"
                accent="text-amber-600"
              />
            </div>

            {/* Per-subject bars */}
            {subjects.filter(s => s.total_chapters > 0).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">Progress by subject</h3>
                {subjects.filter(s => s.total_chapters > 0).map((s) => {
                  const pct = Math.round((s.chapters_completed / s.total_chapters) * 100);
                  return (
                    <div key={s.subject_id} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center shrink-0">
                        {SUBJECT_EMOJIS[s.subject_name] ?? "📚"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-medium text-slate-600 truncate">{s.subject_name}</span>
                          <span className="text-xs text-slate-400 ml-2 shrink-0">
                            {s.chapters_completed}/{s.total_chapters}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      {s.average_score !== null && (
                        <span className="text-xs font-semibold text-slate-500 w-10 text-right shrink-0">
                          {Math.round(s.average_score)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Learning profile ── */}
        {(allStrengths.length > 0 || allWeaknesses.length > 0) && (
          <section>
            <h2 className="text-base font-semibold text-slate-800 mb-5">Learning Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allStrengths.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <span className="text-emerald-500 text-xs">✓</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {allStrengths.map((s, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm text-slate-600">
                        <span className="text-emerald-400 mt-0.5 text-xs shrink-0">●</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {allWeaknesses.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <span className="text-amber-500 text-xs">↑</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Areas to Improve</h3>
                  </div>
                  <ul className="space-y-2">
                    {allWeaknesses.map((w, i) => (
                      <li key={i} className="flex gap-2 items-start text-sm text-slate-600">
                        <span className="text-amber-400 mt-0.5 text-xs shrink-0">●</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
