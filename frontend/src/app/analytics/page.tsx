"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import ProgressBar from "@/components/ProgressBar";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import type { ProgressResponse, SubjectProgress } from "@/types/student";

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
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading analytics…</p>
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
    <main className="min-h-[calc(100vh-64px)] bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
          ← Dashboard
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Analytics</h1>
          <p className="text-gray-500 mt-1">Track your learning progress across all subjects.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats row */}
        <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
            <p className="text-4xl font-bold text-blue-600">{activeSubjects.length}</p>
            <p className="text-xs text-gray-500 mt-1.5">Active Subjects</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
            <p className="text-4xl font-bold text-green-600">{totalChaptersDone}</p>
            <p className="text-xs text-gray-500 mt-1.5">Chapters Done</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
            <p className="text-4xl font-bold text-purple-600">{totalChapters}</p>
            <p className="text-xs text-gray-500 mt-1.5">Total Chapters</p>
          </div>
          <div className="bg-white rounded-2xl border p-5 text-center shadow-sm">
            <p className="text-4xl font-bold text-amber-600">{avgScore !== null ? `${avgScore}%` : "—"}</p>
            <p className="text-xs text-gray-500 mt-1.5">Avg Score</p>
          </div>
        </section>

        {/* Per-subject progress */}
        {activeSubjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Progress by Subject</h2>
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
              {activeSubjects.map((s) => (
                <div key={s.subject_id} className="flex items-center gap-4">
                  <span className="text-xl w-8 flex-shrink-0">{SUBJECT_EMOJIS[s.subject_name] ?? "📚"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm text-gray-700 mb-1.5">
                      <span className="font-medium">{s.subject_name}</span>
                      <span className="text-gray-500">{s.chapters_completed} / {s.total_chapters} chapters</span>
                    </div>
                    <ProgressBar
                      value={s.chapters_completed}
                      max={s.total_chapters}
                    />
                  </div>
                  {s.average_score !== null && (
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex-shrink-0">
                      {Math.round(s.average_score)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sentiment history placeholder */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Sentiment History</h2>
          <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">😊</div>
            <p className="font-medium text-gray-700">Engagement Timeline</p>
            <p className="text-sm text-gray-400 mt-1">
              Sentiment data will appear here once you start video-enabled learning sessions.
            </p>
            <Link
              href="/video-session"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline"
            >
              Start a video session →
            </Link>
          </div>
        </section>

        {/* Learning profile */}
        {(allStrengths.length > 0 || allWeaknesses.length > 0) && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Learning Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allStrengths.length > 0 && (
                <div className="bg-green-50 rounded-2xl border border-green-100 p-5 shadow-sm">
                  <h3 className="font-semibold text-green-900 mb-3 text-sm uppercase tracking-wide">Strengths</h3>
                  <ul className="space-y-2">
                    {allStrengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-800 flex gap-2 items-start">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {allWeaknesses.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 shadow-sm">
                  <h3 className="font-semibold text-amber-900 mb-3 text-sm uppercase tracking-wide">Areas to Improve</h3>
                  <ul className="space-y-2">
                    {allWeaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-amber-800 flex gap-2 items-start">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>
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
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">📊</div>
            <p className="font-medium">No data yet.</p>
            <p className="text-sm mt-1 mb-4">Generate a curriculum and start learning to see your analytics.</p>
            <Link href="/dashboard" className="inline-block text-blue-600 hover:underline text-sm">
              Go to Dashboard →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
