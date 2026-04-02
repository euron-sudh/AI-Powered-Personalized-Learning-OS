"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
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
        const progress = await apiGet<ProgressResponse>(`/api/progress/${user!.id}`, 20_000);
        const eligible = progress.subjects.filter((s) => s.total_chapters > 0);

        // Fetch all curricula in parallel
        const results = await Promise.allSettled(
          eligible.map((sub) =>
            apiGet<CurriculumResponse>(`/api/curriculum/${sub.subject_id}`, 120_000)
              .then((curriculum) => ({ sub, curriculum }))
          )
        );

        const withChapters: SubjectWithChapters[] = [];
        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const { sub, curriculum } = r.value;
          const seen = new Set<number>();
          const available = curriculum.chapters.filter((c) => {
            if (c.status === "locked" || seen.has(c.order_index)) return false;
            seen.add(c.order_index);
            return true;
          });
          if (available.length > 0) {
            withChapters.push({ subject_id: sub.subject_id, subject_name: sub.subject_name, chapters: available });
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
        `/api/proxy/api/lessons/${selectedChapterId}/chat`,
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
                } else if (parsed.error) {
                  tutorContent = `Sorry, I couldn't respond: ${parsed.error}`;
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
      <div className="flex min-h-[calc(100vh-64px)] bg-[#080d1a] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="h-[calc(100vh-64px)] bg-[#080d1a] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link
          href="/dashboard"
          className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </Link>
        <span className="text-white/[0.12]">|</span>
        <h1 className="font-semibold text-white text-sm">AI Tutor</h1>
        {selectedChapterTitle && (
          <>
            <span className="text-white/[0.12]">|</span>
            <span className="text-white/50 text-sm truncate max-w-xs">{selectedChapterTitle}</span>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left sidebar */}
        <div className="w-72 flex-shrink-0 bg-[#080d1a] border-r border-white/[0.06] overflow-y-auto flex flex-col">
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Select a Chapter</p>
          </div>

          {loadingSubjects ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/30">
                  <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6z" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-white/40 mb-3">No chapters available yet.</p>
              <Link href="/dashboard" className="text-xs text-blue-400 hover:text-blue-300">
                Generate a curriculum first →
              </Link>
            </div>
          ) : (
            <div className="flex-1 py-2">
              {subjects.map((sub) => (
                <div key={sub.subject_id}>
                  <div className="px-4 py-2.5 flex items-center gap-2">
                    <span className="text-base">{SUBJECT_EMOJIS[sub.subject_name] ?? "📚"}</span>
                    <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">
                      {sub.subject_name}
                    </span>
                  </div>
                  {sub.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => selectChapter(sub.subject_id, chapter)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-all",
                        selectedChapterId === chapter.id
                          ? "bg-blue-600/20 text-blue-300 border-r-2 border-blue-500"
                          : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                      )}
                    >
                      <span className="text-white/20 mr-2 text-xs">{chapter.order_index}.</span>
                      {chapter.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Chat panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#080d1a]">
          {!selectedChapterId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm px-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 16 16" fill="none" className="text-blue-400">
                    <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                    <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor" />
                    <circle cx="8" cy="6.5" r="0.8" fill="currentColor" />
                    <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor" />
                  </svg>
                </div>
                <p className="font-semibold text-white text-base mb-2">AI Tutor</p>
                <p className="text-sm text-white/40">
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
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-blue-400">
                        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                        <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor" />
                        <circle cx="8" cy="6.5" r="0.8" fill="currentColor" />
                        <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor" />
                      </svg>
                    </div>
                    <p className="font-medium text-white/60">Ready to help!</p>
                    <p className="text-sm text-white/30 mt-1">Ask anything about <span className="text-white/50">{selectedChapterTitle}</span>.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "student" ? "justify-end" : "justify-start")}>
                    {msg.role === "tutor" && (
                      <div className="w-7 h-7 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="text-blue-400">
                          <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                          <circle cx="5.5" cy="6.5" r="0.7" fill="currentColor" />
                          <circle cx="8" cy="6.5" r="0.7" fill="currentColor" />
                          <circle cx="10.5" cy="6.5" r="0.7" fill="currentColor" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                        msg.role === "student"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white/[0.07] text-white/80 rounded-bl-sm border border-white/[0.06]"
                      )}
                    >
                      {msg.content || (chatStreaming && i === messages.length - 1 ? (
                        <span className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </span>
                      ) : "…")}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-white/[0.06] p-4 flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`Ask about "${selectedChapterTitle}"…`}
                  disabled={chatStreaming}
                  className="flex-1 rounded-xl bg-white/[0.06] border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatStreaming || !chatInput.trim()}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors shadow-lg shadow-blue-900/30"
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
