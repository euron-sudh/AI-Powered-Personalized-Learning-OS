"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, apiPut } from "@/lib/api";
import VideoFeed from "@/app/learn/components/VideoFeed";
import { AIContentCard } from "@/app/learn/components/AIContentCard";
import SentimentIndicator from "@/components/SentimentIndicator";
import { useSentiment, type SentimentData } from "@/hooks/useSentiment";
import { useTutorSession } from "@/hooks/useTutorSession";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface LessonData {
  status?: string;
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

type AIContentItem =
  | { id: string; type: "youtube"; videoId: string; title: string; concept: string }
  | { id: string; type: "diagram"; mermaidCode: string; title: string }
  | { id: string; type: "question"; question: string; hint?: string; answered?: string }
  | { id: string; type: "stage_change"; stage: string; emotion: string };

export default function LessonPage({
  params,
}: {
  params: { subjectId: string; chapterId: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  // Lesson data
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [notes, setNotes] = useState("");
  const [notesSaveState, setNotesSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [notesOpen, setNotesOpen] = useState(true);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sentiment — lifted to page level, passed to VideoFeed & voice
  const {
    currentSentiment,
    history,
    analyzing,
    sendFrame,
    connect: connectSentiment,
    disconnect: disconnectSentiment
  } = useSentiment();

  // Tutor session — tracks stage, emotion, mastery; handles event streaming
  const { sessionId, pushEmotion } = useTutorSession(params.chapterId);

  // Tool call handler — wired to voice chat via ref
  const onToolCallRef = useRef<(name: string, args: Record<string, unknown>) => void>();

  // Voice chat — auto-initiates after session starts; handles tool calls
  // NOTE: chapterId passed via options, not connect() which takes no params
  const voiceChat = useVoiceChat({
    chapterId: params.chapterId,
    lessonTitle: lesson?.title,
    chapterDescription: lesson?.description,
    keyConcepts: lesson?.key_concepts,
    summary: lesson?.summary,
    grade: profile?.grade,
    board: profile?.board,
    onToolCall: (name, args) => onToolCallRef.current?.(name, args),
  });

  // AI Content feed — populated by tool calls (YouTube, diagrams, questions, stage changes)
  const [aiContent, setAiContent] = useState<AIContentItem[]>([]);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Sentiment injection debouncing — prevents spam; skips positive emotions
  const lastInjectedRef = useRef<{ emotion: string; time: number } | null>(null);

  // Auth guard + load lesson data
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    setLoading(true);
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function applyLesson(data: LessonData) {
      setLesson(data);
      setLoading(false);
    }

    async function loadLesson() {
      try {
        const [data, prof] = await Promise.all([
          apiGet<LessonData>(`/api/lessons/${params.chapterId}/content`, 0),
          apiGet<StudentProfile>("/api/onboarding/profile").catch(() => null),
        ]);
        setProfile(prof);

        if (data.status !== "generating") {
          await applyLesson(data);
          return;
        }

        // Backend is generating — poll every 6s
        pollTimer = setInterval(async () => {
          try {
            const polled = await apiGet<LessonData>(`/api/lessons/${params.chapterId}/content`, 0);
            if (polled.status !== "generating") {
              clearInterval(pollTimer!);
              pollTimer = null;
              await applyLesson(polled);
            }
          } catch {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            setError("Failed to load lesson. Please go back and try again.");
            setLoading(false);
          }
        }, 6000);
      } catch {
        setError("Failed to load lesson. Please go back and try again.");
        setLoading(false);
      }
    }

    loadLesson();
    return () => { if (pollTimer) clearInterval(pollTimer); };
  }, [user, authLoading, params.chapterId, router]);

  // Load notes independently
  useEffect(() => {
    if (!user) return;
    apiGet<{ content: string }>(`/api/notes/${params.chapterId}`, 0)
      .then((d) => setNotes(d.content ?? ""))
      .catch(() => {});
  }, [user, params.chapterId]);

  // Auto-connect voice + sentiment after lesson & session load
  useEffect(() => {
    if (!lesson || !sessionId || !profile) return;
    voiceChat.connect();
    connectSentiment(params.chapterId);
    return () => {
      voiceChat.disconnect();
      disconnectSentiment();
    };
  }, [lesson, sessionId, profile, params.chapterId, connectSentiment, disconnectSentiment]);

  // Wire sentiment changes → inject context into voice + push emotion to tutor session
  useEffect(() => {
    if (!currentSentiment) return;
    const { emotion, confidence } = currentSentiment;

    // Only inject if confidence is high enough
    if (confidence < 0.65) return;

    // Skip positive emotions (engaged, happy)
    if (['engaged', 'happy'].includes(emotion)) return;

    const now = Date.now();
    // Debounce per emotion type: don't re-inject same emotion within 60s
    if (lastInjectedRef.current?.emotion === emotion && now - lastInjectedRef.current.time < 60000) return;

    // Send hidden system context to voice session
    voiceChat.injectSentimentContext(emotion, confidence);

    // Push emotion to tutor session state machine
    pushEmotion(emotion, confidence);

    lastInjectedRef.current = { emotion, time: now };
  }, [currentSentiment, pushEmotion]);

  // Auto-scroll feed to bottom when new content arrives
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiContent]);

  // Save notes with 800ms debounce
  const saveNotes = useCallback(
    (content: string) => {
      setNotesSaveState("saving");
      apiPut(`/api/notes/${params.chapterId}`, { content })
        .then(() => {
          setNotesSaveState("saved");
          setTimeout(() => setNotesSaveState("idle"), 2500);
        })
        .catch(() => setNotesSaveState("idle"));
    },
    [params.chapterId]
  );

  function handleNotesChange(value: string) {
    setNotes(value);
    setNotesSaveState("idle");
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    notesDebounceRef.current = setTimeout(() => saveNotes(value), 800);
  }

  function downloadNotes() {
    const blob = new Blob([notes], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lesson?.title ?? "notes"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Handle tool calls from voice chat (YouTube, diagrams, questions)
  const handleToolCall = useCallback((toolName: string, toolInput: Record<string, unknown>) => {
    const id = `tool-${Date.now()}`;

    if (toolName === "show_youtube_video") {
      setAiContent((prev) => [...prev, {
        id,
        type: "youtube",
        videoId: toolInput.video_id as string,
        title: toolInput.title as string,
        concept: toolInput.concept as string || "",
      }]);
    } else if (toolName === "show_diagram") {
      setAiContent((prev) => [...prev, {
        id,
        type: "diagram",
        mermaidCode: toolInput.mermaid_code as string,
        title: toolInput.title as string,
      }]);
    } else if (toolName === "ask_comprehension_question") {
      setAiContent((prev) => [...prev, {
        id,
        type: "question",
        question: toolInput.question as string,
        hint: toolInput.hint as string | undefined,
      }]);
    }
  }, []);

  // Wire handler to ref after it's defined
  useEffect(() => {
    onToolCallRef.current = handleToolCall;
  }, [handleToolCall]);

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
    <main className="min-h-[calc(100vh-64px)] bg-[#0d1424] text-white">
      {/* Top bar */}
      <div className="bg-[#0d1424] border-b border-white/[0.07] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/learn/${params.subjectId}`} className="text-white/50 hover:text-white/70 text-sm">
            ← Back
          </Link>
          <span className="text-white/20">|</span>
          <h1 className="font-semibold text-white truncate max-w-sm">{lesson.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {currentSentiment && (
            <SentimentIndicator
              emotion={currentSentiment.emotion}
              confidence={currentSentiment.confidence}
            />
          )}
          <span className="text-xs text-white/30">
            {voiceChat.isConnected ? "🎙️ Live" : "○ Offline"}
          </span>
          <Link
            href={`/learn/${params.subjectId}/${params.chapterId}/activity`}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 transition"
          >
            Take Quiz →
          </Link>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6 flex gap-4 h-[calc(100vh-130px)]">
        {/* Left: Unified session feed */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto bg-[#0d1424] rounded-xl border border-white/[0.07] p-4 space-y-4">
            {aiContent.length === 0 && (
              <div className="text-center text-white/40 py-12">
                <div className="text-4xl mb-3">🤖</div>
                <p className="font-medium">AI tutor initializing…</p>
                <p className="text-sm mt-1">Lesson content and voice will appear here shortly.</p>
              </div>
            )}

            {aiContent.map((item) => (
              <AIContentCard
                key={item.id}
                id={item.id}
                type={item.type}
                {...(item.type === "youtube" && {
                  videoId: item.videoId,
                  title: item.title,
                  concept: item.concept,
                })}
                {...(item.type === "diagram" && {
                  mermaidCode: item.mermaidCode,
                  title: item.title,
                })}
                {...(item.type === "question" && {
                  question: item.question,
                  hint: item.hint,
                })}
                {...(item.type === "stage_change" && {
                  stage: item.stage,
                  emotion: item.emotion,
                })}
              />
            ))}

            <div ref={feedEndRef} />
          </div>

          {/* Voice controls */}
          <div className="mt-3 bg-[#0d1424] border border-white/[0.07] rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-white/50">
              {voiceChat.isConnected ? "🎙️ Voice active · Speak naturally" : "⏸ Voice paused"}
            </span>
            <button
              onClick={() =>
                voiceChat.isConnected ? voiceChat.disconnect() : voiceChat.connect()
              }
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                voiceChat.isConnected
                  ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  : "bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20"
              }`}
            >
              {voiceChat.isConnected ? "End Session" : "Start Voice"}
            </button>
          </div>
        </div>

        {/* Right sidebar: Video + Notes (stacked) */}
        <div className="w-80 flex-shrink-0 hidden lg:flex flex-col gap-4">
          {/* Video feed */}
          <div className="flex-1 min-h-0">
            <VideoFeed
              chapterId={params.chapterId}
              externalSentiment={{
                currentSentiment,
                sendFrame,
                analyzing,
                history,
                connect: connectSentiment,
                disconnect: disconnectSentiment,
              }}
            />
          </div>

          {/* Notes (collapsible) */}
          <div className="bg-[#0d1424] border border-white/[0.07] rounded-xl overflow-hidden flex flex-col max-h-48">
            <button
              onClick={() => setNotesOpen(!notesOpen)}
              className="px-3 py-2 bg-white/[0.04] border-b border-white/[0.07] text-xs font-medium text-white/70 hover:text-white flex items-center justify-between"
            >
              📝 Notes
              <span
                className={`text-white/40 transition ${notesOpen ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>

            {notesOpen && (
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Take notes here…"
                className="flex-1 resize-none p-3 text-xs bg-[#0d1424] text-white/80 focus:outline-none focus:ring-0 border-0"
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
