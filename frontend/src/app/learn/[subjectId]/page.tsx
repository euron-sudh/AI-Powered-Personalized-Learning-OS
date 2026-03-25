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
  locked:      { label: "Locked",      dot: "bg-slate-600",   text: "text-slate-500" },
  available:   { label: "Not started", dot: "bg-blue-400",    text: "text-blue-400" },
  in_progress: { label: "In progress", dot: "bg-amber-400",   text: "text-amber-400" },
  completed:   { label: "Completed",   dot: "bg-emerald-400", text: "text-emerald-400" },
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
      "bg-[#0d1424] rounded-2xl border transition-all duration-200",
      isOpen ? "border-white/[0.14]" : "border-white/[0.07] hover:border-white/[0.12] hover:-translate-y-px"
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
          isOpen ? "bg-blue-600 text-white" : "bg-white/[0.07] text-white/50 group-hover:bg-white/[0.1]"
        )}>
          {chapter.order_index}
        </div>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-semibold text-white text-sm leading-tight">
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
          <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{chapter.description}</p>
        </div>

        {/* Chevron */}
        <div className={cn(
          "shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-transform duration-200",
          isOpen ? "rotate-180 border-blue-500/40 bg-blue-600/10" : "border-white/10 bg-white/[0.04]"
        )}>
          <svg className="w-2.5 h-2.5 text-white/40" fill="none" viewBox="0 0 10 6">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/[0.06]">
          {contentLoading && (
            <div className="py-10 flex flex-col items-center gap-3 text-white/40">
              <div className="w-6 h-6 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin" />
              <p className="text-xs">Generating lesson content with AI…</p>
            </div>
          )}

          {contentError && (
            <div className="py-6 text-center">
              <p className="text-sm text-red-400 mb-2">Failed to load content.</p>
              <button
                onClick={() => { setContentError(false); loadContent(); }}
                className="text-xs text-blue-400 hover:underline"
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
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                    Key Concepts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {content.key_concepts.map((concept, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600/10 text-blue-400 border border-blue-500/20"
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
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                    Summary
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">{content.summary}</p>
                </div>
              )}

              {/* Formulas */}
              {content.formulas?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                    Formulas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {content.formulas.map((f, i) => (
                      <code
                        key={i}
                        className="text-xs bg-black/40 text-emerald-300 px-3 py-1.5 rounded-lg font-mono border border-white/[0.06]"
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
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">
                    Lesson Preview
                  </p>
                  <div
                    className="text-sm text-white/50 leading-relaxed line-clamp-6 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: content.content_html }}
                  />
                </div>
              )}

              {/* CTA row */}
              <div className="flex items-center gap-3 pt-1">
                <Link
                  href={`/learn/${subjectId}/${chapter.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors shadow-sm"
                >
                  Open Full Lesson
                  <span className="text-blue-200 text-xs">→</span>
                </Link>
                <Link
                  href={`/learn/${subjectId}/${chapter.id}/activity`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] text-white/70 text-sm font-medium rounded-xl border border-white/[0.1] hover:bg-white/[0.1] transition-colors"
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
      <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="h-4 w-24 bg-white/[0.07] rounded animate-pulse mb-8" />
          <div className="h-7 w-56 bg-white/[0.07] rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-white/[0.04] rounded animate-pulse mb-6" />
          <div className="h-2 bg-white/[0.04] rounded-full animate-pulse mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#0d1424] rounded-2xl border border-white/[0.07] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] bg-[#080d1a] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">← Back to Dashboard</Link>
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
    <div className="min-h-[calc(100vh-64px)] bg-[#080d1a]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Back link */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Courses
        </Link>

        {/* Subject header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {curriculum.subject_name}
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {completedCount} of {curriculum.chapters.length} chapters completed
          </p>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-white/40 shrink-0">{pct}%</span>
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
            <p className="text-sm text-white/40">No chapters found.</p>
            <Link href="/learn" className="mt-3 inline-block text-sm text-blue-400 hover:underline">
              Back to Courses
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
