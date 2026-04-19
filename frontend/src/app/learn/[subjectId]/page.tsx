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
      <div className="flex min-h-[calc(100vh-54px)] items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading chapters…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-54px)] bg-[var(--bg-base)] flex">
      {/* Sidebar */}
      <div className="w-[200px] bg-[var(--bg-deep)] border-r border-[var(--border)] flex flex-col shrink-0 p-5">
        <button onClick={() => router.push("/learn")} className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-body)] mb-6 flex items-center gap-1">
          ← Back to subjects
        </button>
        <div className="space-y-1">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setExpandedId(expandedId === ch.id ? null : ch.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-[12px] rounded transition-all text-left",
                ch.status === "completed"
                  ? "text-[#1d9e75]"
                  : ch.status === "in_progress"
                  ? "bg-[#111520] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-body)]"
              )}
            >
              <span className="text-[10px]">
                {ch.status === "completed" ? "✓" : ch.status === "in_progress" ? "▶" : "○"}
              </span>
              <span className="flex-1 truncate">{ch.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl">
          <button onClick={() => router.push("/learn")} className="text-[12px] text-[var(--accent)] hover:text-[var(--accent)] mb-6">
            ← Back
          </button>
          <h1 className="text-2xl font-[500] text-white mb-6">Chapters</h1>
          <div className="space-y-3">
            {chapters.map((ch) => (
              <div key={ch.id}>
                <button
                  onClick={() => setExpandedId(expandedId === ch.id ? null : ch.id)}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 hover:border-[#3d3faa] transition-all text-left"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-[500] text-white mb-2">{ch.title}</h3>
                      <p className="text-[12px] text-[var(--text-muted)]">{ch.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-[500] whitespace-nowrap",
                          ch.status === "completed"
                            ? "bg-[#0f2a1f] text-[#5dcaa5]"
                            : ch.status === "in_progress"
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--bg-raised)] text-[var(--text-muted)]"
                        )}
                      >
                        {ch.status === "completed" ? "Complete" : ch.status === "in_progress" ? "In progress" : "Locked"}
                      </div>
                      <span className={cn(
                        "text-[12px] text-[var(--text-muted)] transition-transform",
                        expandedId === ch.id && "rotate-180"
                      )}>
                        ▼
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedId === ch.id && (
                  <div className="bg-[#0f1218] border-l border-r border-b border-[var(--border)] rounded-b-3xl p-6">
                    <div className="mb-6">
                      <h4 className="text-[12px] font-[500] text-[var(--accent)] mb-3">Topics covered</h4>
                      <div className="flex flex-wrap gap-2">
                        {["Fundamentals", "Applications", "Practice"].map((topic) => (
                          <span key={topic} className="px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full text-[11px] text-[var(--text-body)]">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => router.push(`/learn/${subjectId}/${ch.id}`)}
                        disabled={ch.status === "locked"}
                        className={cn(
                          "flex-1 py-3 rounded-2xl font-[500] text-[13px] transition-all",
                          ch.status === "locked"
                            ? "bg-[var(--bg-raised)] text-[var(--text-muted)] cursor-not-allowed"
                            : "bg-[var(--accent)] text-white hover:bg-[#3d3faa]"
                        )}
                      >
                        {ch.status === "completed" ? "Review Lesson" : "Open Lesson"}
                      </button>
                      <button
                        onClick={() => router.push(`/learn/${subjectId}/${ch.id}/activity`)}
                        disabled={ch.status === "locked"}
                        className={cn(
                          "flex-1 py-3 rounded-2xl font-[500] text-[13px] transition-all",
                          ch.status === "locked"
                            ? "bg-[var(--bg-raised)] text-[var(--text-muted)] cursor-not-allowed"
                            : "bg-[var(--accent-soft)] text-[var(--accent)] border border-[#3d3faa] hover:bg-[var(--bg-raised)]"
                        )}
                      >
                        Take Quiz →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
