"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProgressResponse, SubjectProgress } from "@/types/student";

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 text-center">
      <p className={cn("text-4xl font-bold", color)}>{value}</p>
      <p className="text-xs text-white/40 mt-1.5 font-medium">{label}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    apiGet<ProgressResponse>(`/api/progress/${user.id}`)
      .then((data) => setSubjects(data.subjects))
      .catch(() => setError("Failed to load analytics. Please try again."))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] bg-[#080d1a] items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const activeSubjects = subjects.filter((s) => s.total_chapters > 0);
  const totalChaptersDone = subjects.reduce((sum, s) => sum + s.chapters_completed, 0);
  const totalChapters = subjects.reduce((sum, s) => sum + s.total_chapters, 0);
  const scoredSubjects = subjects.filter((s) => s.average_score !== null);
  const avgScore = scoredSubjects.length
    ? Math.round(scoredSubjects.reduce((sum, s) => sum + (s.average_score ?? 0), 0) / scoredSubjects.length)
    : null;

  const allStrengths = subjects.flatMap((s) => s.strengths ?? []);
  const allWeaknesses = subjects.flatMap((s) => s.weaknesses ?? []);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#080d1a] px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-6"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-sm text-white/40 mt-1">Track your learning progress across all subjects.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Stats row */}
        <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard value={activeSubjects.length} label="Active Subjects" color="text-blue-400" />
          <StatCard value={totalChaptersDone} label="Chapters Done" color="text-emerald-400" />
          <StatCard value={totalChapters} label="Total Chapters" color="text-violet-400" />
          <StatCard value={avgScore !== null ? `${avgScore}%` : "—"} label="Avg Score" color="text-amber-400" />
        </section>

        {/* Per-subject progress */}
        {activeSubjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Progress by Subject</h2>
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-6 space-y-5">
              {activeSubjects.map((s) => {
                const pct = s.total_chapters > 0 ? Math.round((s.chapters_completed / s.total_chapters) * 100) : 0;
                return (
                  <div key={s.subject_id} className="flex items-center gap-4">
                    <span className="text-xl w-8 flex-shrink-0">{SUBJECT_EMOJIS[s.subject_name] ?? "📚"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-white/80">{s.subject_name}</span>
                        <span className="text-white/40">{s.chapters_completed} / {s.total_chapters} chapters</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {s.average_score !== null && (
                      <span className="text-sm font-bold text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 rounded-full flex-shrink-0">
                        {Math.round(s.average_score)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sentiment history placeholder */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Sentiment History</h2>
          <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/30">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
              </svg>
            </div>
            <p className="font-medium text-white/60">Engagement Timeline</p>
            <p className="text-sm text-white/30 mt-1">
              Sentiment data will appear here once you start video-enabled learning sessions.
            </p>
            <Link
              href="/video-session"
              className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Start a video session →
            </Link>
          </div>
        </section>

        {/* Learning profile */}
        {(allStrengths.length > 0 || allWeaknesses.length > 0) && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Learning Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allStrengths.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {allStrengths.map((s, i) => (
                      <li key={i} className="text-sm text-white/60 flex gap-2 items-start">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {allWeaknesses.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3">Areas to Improve</h3>
                  <ul className="space-y-2">
                    {allWeaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-white/60 flex gap-2 items-start">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {subjects.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
                <path d="M2 12l3.5-4 3 2.5 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <p className="font-medium text-white/50">No data yet.</p>
            <p className="text-sm text-white/30 mt-1 mb-4">Generate a curriculum and start learning to see your analytics.</p>
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
