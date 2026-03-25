"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import VoiceChat from "@/app/learn/components/VoiceChat";
import type { ProgressResponse } from "@/types/student";

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

interface SubjectWithChapters {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

export default function VoicePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function loadSubjects() {
      try {
        const progress = await apiGet<ProgressResponse>(`/api/progress/${user!.id}`);
        const withChapters: SubjectWithChapters[] = [];
        for (const sub of progress.subjects) {
          if (sub.total_chapters > 0) {
            try {
              const curriculum = await apiGet<CurriculumResponse>(`/api/curriculum/${sub.subject_id}`);
              const available = curriculum.chapters.filter((c) => c.status !== "locked");
              if (available.length > 0) {
                withChapters.push({
                  subject_id: sub.subject_id,
                  subject_name: sub.subject_name,
                  chapters: available,
                });
              }
            } catch {
              // skip
            }
          }
        }
        setSubjects(withChapters);
      } catch {
        // silently handle
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
          ← Dashboard
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎤 Voice Assistant</h1>
          <p className="text-gray-500 mt-1">
            Speak with your AI tutor hands-free using real-time voice recognition.
          </p>
        </div>

        {/* Chapter selector */}
        <div className="bg-white rounded-2xl border shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Select a Chapter</h2>

          {loadingSubjects ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
              Loading subjects…
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">📚</div>
              <p className="text-sm text-gray-500 mb-3">No chapters available yet.</p>
              <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
                Generate a curriculum first →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((sub) => (
                <div key={sub.subject_id}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>{SUBJECT_EMOJIS[sub.subject_name] ?? "📚"}</span>
                    {sub.subject_name}
                  </p>
                  <div className="space-y-1.5">
                    {sub.chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => {
                          setSelectedChapterId(chapter.id);
                          setSelectedChapterTitle(chapter.title);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition border ${
                          selectedChapterId === chapter.id
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200"
                        }`}
                      >
                        <span className="text-xs opacity-60 mr-1">{chapter.order_index}.</span>
                        {chapter.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice chat panel */}
        {selectedChapterId ? (
          <div className="bg-white rounded-2xl border shadow-sm p-6" style={{ minHeight: "420px" }}>
            <div className="mb-3 pb-3 border-b">
              <p className="text-xs text-gray-500">Currently tutoring:</p>
              <p className="font-semibold text-gray-900">{selectedChapterTitle}</p>
            </div>
            <div className="flex flex-col" style={{ height: "380px" }}>
              <VoiceChat chapterId={selectedChapterId} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm p-10 text-center text-gray-400">
            <div className="text-5xl mb-4">🎙️</div>
            <p className="font-medium text-gray-500">Select a chapter above to start a voice session.</p>
            <p className="text-sm mt-1">
              The voice assistant will tutor you on that chapter topic.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
