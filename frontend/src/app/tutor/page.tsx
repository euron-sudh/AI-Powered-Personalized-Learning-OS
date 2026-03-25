"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import type { ProgressResponse, SubjectProgress } from "@/types/student";

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

interface ChatMessage {
  role: "student" | "tutor";
  content: string;
}

interface SubjectWithChapters {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

export default function TutorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
              // skip subjects where curriculum fetch fails
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectChapter(subjectId: string, chapter: Chapter) {
    setSelectedSubjectId(subjectId);
    setSelectedChapterId(chapter.id);
    setSelectedChapterTitle(chapter.title);
    setMessages([]);
    setChatInput("");
  }

  async function sendMessage() {
    if (!chatInput.trim() || chatStreaming || !selectedChapterId) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatStreaming(true);

    const newMessages: ChatMessage[] = [...messages, { role: "student", content: userMsg }];
    setMessages(newMessages);
    setMessages((prev) => [...prev, { role: "tutor", content: "" }]);

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${selectedChapterId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: userMsg,
            conversation_history: newMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let tutorContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text) {
                  tutorContent += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "tutor", content: tutorContent };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "tutor",
          content: "Sorry, I had trouble responding. Please try again.",
        };
        return updated;
      });
    } finally {
      setChatStreaming(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Dashboard
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="font-semibold text-gray-900">🤖 AI Tutor</h1>
        {selectedChapterTitle && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600 text-sm truncate max-w-xs">{selectedChapterTitle}</span>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 113px)" }}>
        {/* Left sidebar */}
        <div className="w-72 flex-shrink-0 bg-gray-900 text-white overflow-y-auto flex flex-col">
          <div className="px-4 py-4 border-b border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select a Chapter</p>
          </div>

          {loadingSubjects ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-3xl mb-3">📚</div>
              <p className="text-sm text-gray-400 mb-3">No chapters available yet.</p>
              <Link
                href="/dashboard"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Generate a curriculum first →
              </Link>
            </div>
          ) : (
            <div className="flex-1 py-2">
              {subjects.map((sub) => (
                <div key={sub.subject_id}>
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span className="text-base">{SUBJECT_EMOJIS[sub.subject_name] ?? "📚"}</span>
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      {sub.subject_name}
                    </span>
                  </div>
                  {sub.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => selectChapter(sub.subject_id, chapter)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition ${
                        selectedChapterId === chapter.id
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="text-xs text-gray-500 mr-2">{chapter.order_index}.</span>
                      {chapter.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Chat panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {!selectedChapterId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400 max-w-sm px-4">
                <div className="text-6xl mb-4">🤖</div>
                <p className="font-semibold text-gray-600 text-lg mb-2">AI Tutor</p>
                <p className="text-sm">
                  Select a chapter from the sidebar to start a tutoring session.
                  Ask any question — your AI tutor uses the Socratic method to guide you.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="font-medium text-gray-600">Ready to help!</p>
                    <p className="text-sm mt-1">Ask anything about <strong>{selectedChapterTitle}</strong>.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "tutor" && (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">
                        🤖
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                        msg.role === "student"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {msg.content || (chatStreaming && i === messages.length - 1 ? (
                        <span className="flex gap-1">
                          <span className="animate-bounce">●</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                        </span>
                      ) : "…")}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4 flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`Ask about "${selectedChapterTitle}"…`}
                  disabled={chatStreaming}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatStreaming || !chatInput.trim()}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
