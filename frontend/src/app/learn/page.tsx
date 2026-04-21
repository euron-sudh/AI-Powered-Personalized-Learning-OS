"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Subject {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  chapters_completed: number;
  total_chapters: number;
  progress_percent: number;
  average_score?: number;
}

const SUBJECT_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  mathematics: { color: "var(--subject-math)", bg: "var(--subject-math-bg)", icon: "➕" },
  math: { color: "var(--subject-math)", bg: "var(--subject-math-bg)", icon: "➕" },
  science: { color: "var(--subject-science)", bg: "var(--subject-science-bg)", icon: "🧪" },
  english: { color: "var(--subject-english)", bg: "var(--subject-english-bg)", icon: "📖" },
  history: { color: "var(--subject-history)", bg: "var(--subject-history-bg)", icon: "🏛️" },
  "computer science": { color: "var(--subject-coding)", bg: "var(--subject-coding-bg)", icon: "💻" },
  coding: { color: "var(--subject-coding)", bg: "var(--subject-coding-bg)", icon: "💻" },
  arts: { color: "var(--subject-arts)", bg: "var(--subject-arts-bg)", icon: "🎨" },
  music: { color: "var(--subject-music)", bg: "var(--subject-music-bg)", icon: "🎵" },
};

function styleFor(name: string) {
  return SUBJECT_STYLE[name.toLowerCase()] ?? { color: "var(--brand-blue)", bg: "var(--brand-blue-soft)", icon: "📚" };
}

export default function LearnPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      fetchSubjects();
    }
  }, [user, authLoading, router]);

  async function fetchSubjects() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/onboarding/subjects`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const subjectsData = (data.subjects || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status || "not_started",
          chapters_completed: s.chapters_completed || 0,
          total_chapters: s.chapter_count ?? s.total_chapters ?? 0,
          progress_percent: s.progress_percent || 0,
          average_score: s.average_score,
        }));
        setSubjects(subjectsData);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--brand-blue-soft)] border-t-[var(--brand-blue)] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading your subjects…</p>
        </div>
      </div>
    );
  }

  const totalChapters = subjects.reduce((sum, s) => sum + s.total_chapters, 0);
  const completedChapters = subjects.reduce((sum, s) => sum + s.chapters_completed, 0);
  const overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "var(--green-bg)", color: "var(--green)", text: "Completed" };
      case "in_progress":
        return { bg: "var(--brand-blue-soft)", color: "var(--brand-blue)", text: "In progress" };
      default:
        return { bg: "var(--bg-deep)", color: "var(--text-muted)", text: "Not started" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">Your Curriculum 📚</h1>
        <p className="text-[var(--text-muted)]">Master your subjects step by step</p>
      </div>

      {/* Progress overview */}
      {subjects.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-card mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-[var(--text-primary)]">Overall Progress</span>
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {completedChapters}/{totalChapters} chapters
            </span>
          </div>
          <div className="h-3 bg-[var(--bg-deep)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--brand-blue)] transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">{overallProgress}% complete — keep going!</p>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-12 text-center shadow-card">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-[var(--text-muted)] mb-5">No subjects available yet. Complete onboarding to generate your curriculum.</p>
          <Link
            href="/onboarding"
            className="inline-block px-6 py-3 bg-[var(--accent)] text-white rounded-full font-bold text-sm hover:opacity-90 transition"
          >
            Complete Onboarding
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map((subject) => {
            const style = styleFor(subject.name);
            const badge = getStatusBadge(subject.status);
            return (
              <Link
                key={subject.id}
                href={`/learn/${subject.id}`}
                className="group bg-white border border-[var(--border)] rounded-2xl p-6 shadow-card hover:-translate-y-1 hover:shadow-elevated transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl text-white shadow-card"
                    style={{ background: style.color }}
                  >
                    {style.icon}
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {badge.text}
                  </div>
                </div>

                <h3 className="text-xl font-extrabold capitalize mb-1" style={{ color: style.color }}>
                  {subject.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-semibold mb-4">
                  {subject.chapters_completed} / {subject.total_chapters} chapters
                </p>

                <div className="h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ background: style.color, width: `${subject.progress_percent}%` }}
                  />
                </div>

                {subject.average_score && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-[var(--text-muted)] font-semibold">Average score</span>
                    <span className="text-[14px] font-extrabold" style={{ color: style.color }}>
                      {Math.round(subject.average_score)}%
                    </span>
                  </div>
                )}

                {subject.status !== "completed" && (
                  <div className="text-[13px] font-bold mt-2 transition" style={{ color: style.color }}>
                    Continue learning →
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
