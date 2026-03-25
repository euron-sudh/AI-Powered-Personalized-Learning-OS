"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  order_index: number;
  title: string;
  description: string;
  status: "locked" | "available" | "in_progress" | "completed";
}

interface CurriculumResponse {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

interface ChapterContent {
  content_html: string;
  diagrams: string[];
  formulas: string[];
  key_concepts: string[];
  summary: string;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  locked:      { label: "Locked",      dot: "bg-slate-200",   text: "text-slate-400" },
  available:   { label: "Not started", dot: "bg-indigo-300",  text: "text-indigo-600" },
  in_progress: { label: "In progress", dot: "bg-amber-400",   text: "text-amber-600" },
  completed:   { label: "Completed",   dot: "bg-emerald-400", text: "text-emerald-600" },
} satisfies Record<string, { label: string; dot: string; text: string }>;

// ─── Chapter accordion item ───────────────────────────────────────────────────

function ChapterRow({
  chapter,
  subjectId,
  isOpen,
  onToggle,
}: {
  chapter: Chapter;
  subjectId: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState(false);

  const cfg = STATUS[chapter.status];

  // Lazy-load content on first open
  const loadContent = useCallback(async () => {
    if (content || contentLoading) return;
    setContentLoading(true);
    setContentError(false);
    try {
      const data = await apiGet<ChapterContent>(`/api/lessons/${chapter.id}/content`);
      setContent(data);
    } catch {
      setContentError(true);
    } finally {
      setContentLoading(false);
    }
  }, [chapter.id, content, contentLoading]);

  useEffect(() => {
    if (isOpen) loadContent();
  }, [isOpen, loadContent]);

  return (
    <div className={cn(
      "bg-white rounded-2xl border transition-all duration-200",
      isOpen ? "border-indigo-100 shadow-md" : "border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-px"
    )}>
      {/* ── Header row (always visible) ── */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4 group"
        aria-expanded={isOpen}
      >
        {/* Chapter number */}
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
          isOpen ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
        )}>
          {chapter.order_index}
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight">
              {chapter.title}
            </h3>
            <span className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium",
              cfg.text
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{chapter.description}</p>
        </div>

        {/* Chevron */}
        <div className={cn(
          "shrink-0 w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center transition-transform duration-200",
          isOpen ? "rotate-180 border-indigo-200 bg-indigo-50" : "bg-slate-50"
        )}>
          <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 10 6">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-slate-50">
          {contentLoading && (
            <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
              <p className="text-xs">Generating lesson content with AI…</p>
            </div>
          )}

          {contentError && (
            <div className="py-6 text-center">
              <p className="text-sm text-red-500 mb-2">Failed to load content.</p>
              <button
                onClick={() => { setContentError(false); loadContent(); }}
                className="text-xs text-indigo-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {content && (
            <div className="mt-4 space-y-5">
              {/* Key concepts */}
              {content.key_concepts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Key Concepts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {content.key_concepts.map((concept, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {content.summary && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Summary
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">{content.summary}</p>
                </div>
              )}

              {/* Formulas */}
              {content.formulas?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Formulas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {content.formulas.map((f, i) => (
                      <code
                        key={i}
                        className="text-xs bg-slate-900 text-emerald-300 px-3 py-1.5 rounded-lg font-mono"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Content preview */}
              {content.content_html && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Lesson Preview
                  </p>
                  <div
                    className="text-sm text-slate-600 leading-relaxed line-clamp-6 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.content_html }}
                  />
                </div>
              )}

              {/* CTA row */}
              <div className="flex items-center gap-3 pt-1">
                <Link
                  href={`/learn/${subjectId}/${chapter.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Open Full Lesson
                  <span className="text-slate-400 text-xs">→</span>
                </Link>
                <Link
                  href={`/learn/${subjectId}/${chapter.id}/activity`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Take Quiz
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubjectPage({ params }: { params: { subjectId: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [curriculum, setCurriculum] = useState<CurriculumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    apiGet<CurriculumResponse>(`/api/curriculum/${params.subjectId}`)
      .then((data) => {
        setCurriculum(data);
        // Auto-open the first available/in-progress chapter
        const first = data.chapters.find(
          (c) => c.status === "in_progress" || c.status === "available"
        );
        if (first) setOpenChapterId(first.id);
      })
      .catch(() => setError("Failed to load curriculum."))
      .finally(() => setLoading(false));
  }, [user, authLoading, params.subjectId, router]);

  function toggleChapter(id: string) {
    setOpenChapterId((prev) => (prev === id ? null : id));
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-8" />
          <div className="h-7 w-56 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-slate-100 rounded animate-pulse mb-6" />
          <div className="h-2 bg-slate-100 rounded-full animate-pulse mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Link href="/dashboard" className="text-sm text-indigo-600 hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!curriculum) return null;

  const completedCount = curriculum.chapters.filter((c) => c.status === "completed").length;
  const pct = curriculum.chapters.length > 0
    ? Math.round((completedCount / curriculum.chapters.length) * 100)
    : 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-8"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </Link>

        {/* Subject header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {curriculum.subject_name}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {completedCount} of {curriculum.chapters.length} chapters completed
          </p>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 shrink-0">{pct}%</span>
          </div>
        </div>

        {/* Chapter list */}
        <div className="space-y-3">
          {curriculum.chapters.map((chapter) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              subjectId={params.subjectId}
              isOpen={openChapterId === chapter.id}
              onToggle={() => toggleChapter(chapter.id)}
            />
          ))}
        </div>

        {curriculum.chapters.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-slate-400">No chapters found.</p>
            <Link href="/dashboard" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
              Back to Dashboard
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
