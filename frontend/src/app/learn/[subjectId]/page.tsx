"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  order_index: number;
  title: string;
  description: string;
  status: string;
}

export default function SubjectPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjectName, setSubjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const subjectId = params.subjectId as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      fetchChapters();
    }
  }, [user, authLoading, router, subjectId]);

  async function fetchChapters() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/curriculum/${subjectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.subject_name) setSubjectName(data.subject_name);
        setChapters(data.chapters || []);
      }
    } catch (err) {
      console.error("Failed to fetch chapters:", err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--brand-blue-soft)] border-t-[var(--brand-blue)] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading chapters…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button
        onClick={() => router.push("/learn")}
        className="text-sm font-bold text-[var(--brand-blue)] hover:underline mb-4"
      >
        ← Back to subjects
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2 capitalize">
          {subjectName || "Chapters"} 📘
        </h1>
        <p className="text-[var(--text-muted)]">{chapters.length} chapters in your learning path</p>
      </div>

      <div className="space-y-3">
        {chapters.map((ch, i) => {
          const isExpanded = expandedId === ch.id;
          const isComplete = ch.status === "completed";
          const isInProgress = ch.status === "in_progress";
          const isLocked = ch.status === "locked";
          return (
            <div key={ch.id} className="bg-white border border-[var(--border)] rounded-2xl shadow-card overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                className="w-full p-5 hover:bg-[var(--bg-deep)] transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-base font-extrabold shrink-0",
                      isComplete
                        ? "bg-[var(--green-bg)] text-[var(--green)]"
                        : isInProgress
                        ? "bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]"
                        : isLocked
                        ? "bg-[var(--bg-deep)] text-[var(--text-muted)]"
                        : "bg-[var(--accent-soft)] text-[var(--accent)]"
                    )}
                  >
                    {isComplete ? "✓" : isLocked ? "🔒" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-0.5 truncate">{ch.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">{ch.description}</p>
                  </div>
                  <div
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap",
                      isComplete
                        ? "bg-[var(--green-bg)] text-[var(--green)]"
                        : isInProgress
                        ? "bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]"
                        : isLocked
                        ? "bg-[var(--bg-deep)] text-[var(--text-muted)]"
                        : "bg-[var(--accent-soft)] text-[var(--accent-dim)]"
                    )}
                  >
                    {isComplete ? "Complete" : isInProgress ? "In progress" : isLocked ? "Locked" : "Available"}
                  </div>
                  <span
                    className={cn(
                      "text-xs text-[var(--text-muted)] transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  >
                    ▼
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--border)] p-5 bg-[var(--bg-deep)]">
                  <p className="text-sm text-[var(--text-body)] mb-4">{ch.description}</p>
                  <div className="mb-4">
                    <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2">Topics covered</h4>
                    <div className="flex flex-wrap gap-2">
                      {["Fundamentals", "Applications", "Practice"].map((topic) => (
                        <span key={topic} className="px-3 py-1.5 bg-white border border-[var(--border)] rounded-full text-[11px] font-semibold text-[var(--text-body)]">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push(`/learn/${subjectId}/${ch.id}`)}
                      disabled={isLocked}
                      className={cn(
                        "flex-1 py-3 rounded-full font-bold text-sm transition-all",
                        isLocked
                          ? "bg-[var(--bg-deep)] text-[var(--text-muted)] cursor-not-allowed"
                          : "bg-[var(--accent)] text-white hover:opacity-90 hover:scale-[1.02] shadow-card"
                      )}
                    >
                      {isComplete ? "Review Lesson" : "🎙️ Start with AI Tutor"}
                    </button>
                    <button
                      onClick={() => router.push(`/learn/${subjectId}/${ch.id}/activity`)}
                      disabled={isLocked}
                      className={cn(
                        "flex-1 py-3 rounded-full font-bold text-sm transition-all border-2",
                        isLocked
                          ? "border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed"
                          : "border-[var(--brand-blue)] text-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)]"
                      )}
                    >
                      Take Quiz →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
