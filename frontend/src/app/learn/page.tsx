"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Nav from "@/components/Nav";

interface Subject {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  chapters_completed: number;
  total_chapters: number;
  progress_percent: number;
  average_score?: number;
  color: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  mathematics: "#5b5eff",
  math: "#5b5eff",
  science: "#1d9e75",
  english: "#ef9f27",
  history: "#e24b4a",
  "computer science": "#00d4ff",
  arts: "#b366ff",
  music: "#ff6b9d",
};

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

      const res = await fetch(`/api/proxy/api/curriculum`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const subjectsData = (data.subjects || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status || "not_started",
          chapters_completed: s.chapters_completed || 0,
          total_chapters: s.total_chapters || 0,
          progress_percent: s.progress_percent || 0,
          average_score: s.average_score,
          color: SUBJECT_COLORS[s.name.toLowerCase()] || "#5b5eff",
        }));
        setSubjects(subjectsData);
      } else {
        setSubjects(getFallbackSubjects());
      }
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
      setSubjects(getFallbackSubjects());
    } finally {
      setLoading(false);
    }
  }

  function getFallbackSubjects(): Subject[] {
    return [
      { id: "1", name: "Mathematics", status: "in_progress", chapters_completed: 5, total_chapters: 8, progress_percent: 62, average_score: 85, color: "#5b5eff" },
      { id: "2", name: "Science", status: "not_started", chapters_completed: 0, total_chapters: 6, progress_percent: 0, color: "#1d9e75" },
      { id: "3", name: "English", status: "in_progress", chapters_completed: 3, total_chapters: 6, progress_percent: 50, average_score: 78, color: "#ef9f27" },
      { id: "4", name: "History", status: "not_started", chapters_completed: 0, total_chapters: 4, progress_percent: 0, color: "#e24b4a" },
    ];
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0d1117]">
        <Nav />
        <div className="flex items-center justify-center min-h-[calc(100vh-54px)]">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
            <p className="text-[#6b7280] text-sm">Loading your subjects…</p>
          </div>
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
        return { bg: "#0f2a1f", color: "#1d9e75", text: "Completed" };
      case "in_progress":
        return { bg: "#1a1f35", color: "#5b5eff", text: "In progress" };
      default:
        return { bg: "#1e2330", color: "#6b7280", text: "Not started" };
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Nav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Curriculum</h1>
          <p className="text-[#6b7280] text-sm">Master your subjects step by step</p>
        </div>

        {/* Progress overview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#c5c9d6]">Overall Progress</span>
            <span className="text-sm text-[#6b7280]">{completedChapters}/{totalChapters} chapters</span>
          </div>
          <div className="h-2 bg-[#1e2330] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5b5eff] transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Subject cards grid */}
        {subjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#6b7280] mb-4">No subjects available yet. Complete onboarding to generate your curriculum.</p>
            <Link
              href="/onboarding"
              className="inline-block px-6 py-2 bg-[#5b5eff] text-white rounded-xl hover:bg-[#3d3faa] transition"
            >
              Complete Onboarding
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((subject) => {
              const badge = getStatusBadge(subject.status);
              return (
                <Link
                  key={subject.id}
                  href={`/learn/${subject.id}`}
                  className="group bg-[#161b27] border border-[#1e2330] rounded-2xl p-6 hover:border-[#2a2d45] hover:bg-[#1a1f2e] transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{subject.name}</h3>
                      <p className="text-[12px] text-[#6b7280]">
                        {subject.chapters_completed} / {subject.total_chapters} chapters
                      </p>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.text}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-[#1e2330] rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          backgroundColor: subject.color,
                          width: `${subject.progress_percent}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Score if available */}
                  {subject.average_score && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#6b7280]">Average score</span>
                      <span className="text-[14px] font-semibold" style={{ color: subject.color }}>
                        {Math.round(subject.average_score)}%
                      </span>
                    </div>
                  )}

                  {subject.status !== "completed" && (
                    <div className="mt-4 text-[12px] text-[#5b5eff] font-medium group-hover:text-[#a8aaee] transition">
                      Continue →
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
