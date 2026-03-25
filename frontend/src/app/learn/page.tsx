"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SubjectProgress, ProgressResponse } from "@/types/student";

// ─── Subject visuals (same as dashboard) ──────────────────────────────────────

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

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ subject }: { subject: SubjectProgress }) {
  const visual = getVisual(subject.subject_name);
  const pct = subject.total_chapters > 0
    ? Math.round((subject.chapters_completed / subject.total_chapters) * 100)
    : 0;

  return (
    <Link
      href={`/learn/${subject.subject_id}`}
      className="group bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.18] transition-all duration-200 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-0.5 block"
    >
      {/* Visual header */}
      <div className={cn("relative h-36 bg-gradient-to-br overflow-hidden", visual.bg)}>
        <div className="absolute inset-0 p-4">
          {visual.svg}
        </div>
        <div className="absolute bottom-3 left-4">
          <span className={cn("text-xs font-semibold uppercase tracking-wider", visual.accent)}>
            {subject.subject_name}
          </span>
        </div>
        {subject.total_chapters > 0 && (
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-white/70">
            {pct}%
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-white text-sm">{subject.subject_name}</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {subject.total_chapters > 0
              ? `${subject.chapters_completed} / ${subject.total_chapters} chapters`
              : "No chapters yet"}
          </p>
        </div>

        {/* Progress bar */}
        {subject.total_chapters > 0 && (
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Status badge */}
        <div className="flex items-center justify-between">
          {subject.total_chapters === 0 ? (
            <span className="text-xs text-white/30 italic">Curriculum pending</span>
          ) : pct === 100 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Completed
            </span>
          ) : subject.chapters_completed > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              In progress
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Not started
            </span>
          )}
          <span className="text-white/30 text-xs group-hover:text-white/60 transition-colors">
            View →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
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
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setSubjects([]);
        } else {
          setError("Failed to load courses.");
        }
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="h-7 w-40 bg-white/[0.07] rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-white/[0.04] rounded animate-pulse mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-white/[0.05]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-24 bg-white/[0.07] rounded" />
                  <div className="h-3 w-32 bg-white/[0.04] rounded" />
                  <div className="h-1 bg-white/[0.07] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#080d1a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">My Courses</h1>
          <p className="text-sm text-white/40 mt-1">
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""} enrolled
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
                <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-white/50 font-medium mb-1">No courses yet</p>
            <p className="text-sm text-white/30 mb-6">Complete onboarding to get started</p>
            <Link
              href="/onboarding"
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors"
            >
              Start Onboarding
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {subjects.map((subject) => (
              <CourseCard key={subject.subject_id} subject={subject} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
