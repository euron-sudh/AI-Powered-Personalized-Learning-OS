"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, apiPut } from "@/lib/api";
import LessonContent from "@/app/learn/components/LessonContent";
import VoiceChat from "@/app/learn/components/VoiceChat";
import VideoFeed from "@/app/learn/components/VideoFeed";
import SentimentIndicator from "@/components/SentimentIndicator";
import { useSentiment, type SentimentData } from "@/hooks/useSentiment";

interface LessonData {
  chapter_id: string;
  title: string;
  description: string;
  content_html: string;
  diagrams: string[];
  formulas: string[];
  key_concepts: string[];
  summary: string;
}

interface StudentProfile {
  name: string;
  grade: string;
  board: string;
}

interface ChatMessage {
  role: "student" | "tutor";
  content: string;
}

export default function LessonPage({
  params,
}: {
  params: { subjectId: string; chapterId: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"content" | "chat" | "voice" | "notes">("content");

  // Notes state
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sentiment (for showing indicator in the top bar only)
  const [currentSentiment, setCurrentSentiment] = useState<SentimentData | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    setLoading(true);
    Promise.all([
      apiGet<LessonData>(`/api/lessons/${params.chapterId}/content`),
      apiGet<StudentProfile>("/api/onboarding/profile").catch(() => null),
    ])
      .then(([data, prof]) => {
        setLesson(data);
        setProfile(prof);
        return apiGet<ChatMessage[]>(`/api/lessons/${params.chapterId}/history`, 0);
      })
      .then((history) => setMessages(history))
      .catch(() => setError("Failed to load lesson. Please go back and try again."))
      .finally(() => setLoading(false));

    // Fetch notes (non-blocking)
    apiGet<{ content: string }>(`/api/notes/${params.chapterId}`)
      .then((d) => setNotes(d.content))
      .catch(() => {});
  }, [user, authLoading, params.chapterId, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-save notes with 500ms debounce
  const saveNotes = useCallback(
    (content: string) => {
      apiPut(`/api/notes/${params.chapterId}`, { content })
        .then(() => {
          setNotesSaved(true);
          setTimeout(() => setNotesSaved(false), 2000);
        })
        .catch(() => {});
    },
    [params.chapterId]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSaved(false);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => saveNotes(value), 500);
  }

  async function sendMessage() {
    if (!chatInput.trim() || chatStreaming) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatStreaming(true);

    const newMessages: ChatMessage[] = [...messages, { role: "student", content: userMsg }];
    setMessages(newMessages);

    // Add empty tutor message placeholder
    setMessages((prev) => [...prev, { role: "tutor", content: "" }]);

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${params.chapterId}/chat`,
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
    } catch (err) {
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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center flex-col gap-3">
        <div className="animate-spin w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full" />
        <p className="text-gray-500 text-sm">Generating your lesson…</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error ?? "Lesson not found."}</p>
          <Link href={`/learn/${params.subjectId}`} className="text-blue-600 hover:underline">← Back to Subject</Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/learn/${params.subjectId}`} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold text-gray-900 truncate max-w-sm">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {currentSentiment && (
            <SentimentIndicator
              emotion={currentSentiment.emotion}
              confidence={currentSentiment.confidence}
            />
          )}
          <Link
            href={`/learn/${params.subjectId}/${params.chapterId}/activity`}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Take Quiz →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6 h-[calc(100vh-130px)]">
        {/* Left: Content / Chat / Voice tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab buttons */}
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
            {(["content", "chat", "voice", "notes"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                  activeTab === tab ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "content"
                  ? "📖 Lesson"
                  : tab === "chat"
                  ? "💬 Chat"
                  : tab === "voice"
                  ? "🎙️ Voice"
                  : "📝 Notes"}
              </button>
            ))}
          </div>

          {/* Content tab */}
          {activeTab === "content" && (
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border p-6">
              <LessonContent
                contentHtml={lesson.content_html}
                diagrams={lesson.diagrams}
                formulas={lesson.formulas}
                keyConcepts={lesson.key_concepts}
                summary={lesson.summary}
              />
            </div>
          )}

          {/* Chat tab */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col bg-white rounded-xl border overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="font-medium">Ask your AI tutor anything!</p>
                    <p className="text-sm mt-1">Questions about the lesson? Ask away.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
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

              {/* Adaptive sentiment action */}
              {currentSentiment?.action_taken && (
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-sm text-amber-800">
                  💡 {currentSentiment.action_taken}
                </div>
              )}

              <div className="border-t p-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask a question…"
                  disabled={chatStreaming}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatStreaming || !chatInput.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Voice tab */}
          {activeTab === "voice" && (
            <div className="flex-1 bg-white rounded-xl border p-6">
              <VoiceChat
                chapterId={params.chapterId}
                lessonTitle={lesson.title}
                chapterDescription={lesson.description}
                keyConcepts={lesson.key_concepts}
                summary={lesson.summary}
                grade={profile?.grade}
                board={profile?.board}
              />
            </div>
          )}

          {/* Notes tab */}
          {activeTab === "notes" && (
            <div className="flex-1 flex flex-col bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
                <span className="text-sm font-medium text-gray-700">📝 My Notes</span>
                {notesSaved && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <span>✓</span> Saved
                  </span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Take notes here… they're auto-saved."
                className="flex-1 resize-none p-4 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-0 border-0"
                style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
              />
            </div>
          )}
        </div>

        {/* Right sidebar: Video feed */}
        <div className="w-72 flex-shrink-0 hidden lg:block">
          <VideoFeed chapterId={params.chapterId} />
        </div>
      </div>
    </main>
  );
}
