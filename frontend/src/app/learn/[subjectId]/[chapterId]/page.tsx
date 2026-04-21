"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Briefcase, Headphones } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface Chapter {
  id: string;
  title: string;
  description: string;
}

type Visual =
  | { kind: "youtube"; videoId: string; title: string; concept?: string }
  | { kind: "diagram"; mermaidCode: string; title: string }
  | { kind: "image"; url: string; title: string; alt?: string };

interface Message {
  role: "student" | "tutor";
  content: string;
  visual?: Visual;
}

interface EmotionData {
  emotion: string;
  confidence: number;
  color: string;
}

function sanitizeMermaid(code: string): string {
  return code.replace(
    /\[([^\[\]"]*?[()/,&:%][^\[\]"]*?)\]/g,
    (_m, label) => `["${label.trim()}"]`,
  );
}

// Inject an auto-palette: assign each node a color class so diagrams don't read as flat gray.
function colorizeMermaid(code: string): string {
  const palette = [
    "fill:#eef2ff,stroke:#5b5eff,stroke-width:2px,color:#1f2937",
    "fill:#ecfdf5,stroke:#1d9e75,stroke-width:2px,color:#064e3b",
    "fill:#fef3c7,stroke:#ef9f27,stroke-width:2px,color:#7c2d12",
    "fill:#fee2e2,stroke:#e24b4a,stroke-width:2px,color:#7f1d1d",
    "fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#4c1d95",
    "fill:#e0f2fe,stroke:#0891b2,stroke-width:2px,color:#0c4a6e",
  ];
  const ids = new Set<string>();
  const idRegex = /(^|\s)([A-Za-z][A-Za-z0-9_]*)(?=\[|\(|\{)/g;
  let match: RegExpExecArray | null;
  while ((match = idRegex.exec(code)) !== null) ids.add(match[2]);
  if (ids.size === 0) return code;
  const classLines: string[] = [];
  palette.forEach((style, i) => classLines.push(`classDef c${i} ${style};`));
  let i = 0;
  for (const id of ids) {
    classLines.push(`class ${id} c${i % palette.length};`);
    i++;
  }
  return `${code}\n${classLines.join("\n")}`;
}

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const panRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        themeVariables: {
          fontFamily: "Inter, system-ui, sans-serif",
          primaryColor: "#eef2ff",
          primaryBorderColor: "#5b5eff",
          primaryTextColor: "#1f2937",
          lineColor: "#6b7280",
        },
      });
      const safe = colorizeMermaid(sanitizeMermaid(code));
      try {
        const id = `m-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, safe);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          const svgEl = ref.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.style.transformOrigin = "center center";
            svgEl.style.transition = "transform 0.1s ease-out";
          }
        }
      } catch (e) {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre style="color:#e24b4a;font-size:11px;white-space:pre-wrap">Diagram error: ${
            (e as Error).message
          }\n\n${safe}</pre>`;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    const svgEl = ref.current?.querySelector("svg") as SVGElement | null;
    if (svgEl) {
      svgEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoom})`;
    }
  }, [zoom]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(3, z + (e.deltaY < 0 ? 0.1 : -0.1))));
  };
  const onMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    panRef.current = { x: e.clientX - draggingRef.current.x, y: e.clientY - draggingRef.current.y };
    const svgEl = ref.current?.querySelector("svg") as SVGElement | null;
    if (svgEl) svgEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoom})`;
  };
  const onMouseUp = () => { draggingRef.current = null; };
  const reset = () => {
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={ref}
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
      <div className="absolute bottom-2 right-2 flex gap-1 bg-white/90 backdrop-blur border border-[var(--border)] rounded-full px-2 py-1 shadow-card text-xs">
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="px-1.5 hover:text-[var(--brand-blue)]" title="Zoom in">＋</button>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="px-1.5 hover:text-[var(--brand-blue)]" title="Zoom out">－</button>
        <button onClick={reset} className="px-1.5 hover:text-[var(--brand-blue)]" title="Reset view">⟳</button>
      </div>
    </div>
  );
}

const EMOTIONS: Record<string, { label: string; color: string; bgColor: string }> = {
  engaged: { label: "Engaged", color: "#16a34a", bgColor: "#dcfce7" },
  confused: { label: "Confused", color: "#d97706", bgColor: "#fef3c7" },
  frustrated: { label: "Frustrated", color: "#dc2626", bgColor: "#fee2e2" },
  bored: { label: "Bored", color: "#64748b", bgColor: "#f1f5f9" },
};

export default function TutorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [subjectName, setSubjectName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null);
  const [currentVisual, setCurrentVisual] = useState<Visual | null>(null);
  const [sessionStarted] = useState(new Date());
  const [, forceTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const voiceOptions = useMemo(
    () => ({
      chapterId,
      lessonTitle: chapter?.title,
      chapterDescription: chapter?.description,
      subjectName,
      onToolCall: (toolName: string, args: Record<string, unknown>) => {
        let v: Visual | null = null;
        if (toolName === "show_youtube_video") {
          v = {
            kind: "youtube",
            videoId: String(args.video_id ?? ""),
            title: String(args.title ?? "Video"),
            concept: args.concept ? String(args.concept) : undefined,
          };
        } else if (toolName === "show_diagram") {
          v = {
            kind: "diagram",
            mermaidCode: String(args.mermaid_code ?? ""),
            title: String(args.title ?? "Diagram"),
          };
        } else if (toolName === "show_image") {
          v = {
            kind: "image",
            url: String(args.url ?? ""),
            title: String(args.title ?? "Image"),
            alt: args.alt ? String(args.alt) : undefined,
          };
        }
        if (v) {
          setCurrentVisual(v);
          setMessages((prev) => [...prev, { role: "tutor", content: "", visual: v! }]);
        }
      },
    }),
    [chapterId, chapter?.title, chapter?.description, subjectName]
  );

  const {
    isConnected,
    isListening,
    isAISpeaking,
    isProcessingTranscript,
    transcript,
    error: voiceError,
    connect,
    disconnect,
    toggleListening,
  } = useVoiceChat(voiceOptions);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      loadChapter();
      const emotionInterval = setInterval(() => {
        const emotions = Object.keys(EMOTIONS);
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        const emotionInfo = EMOTIONS[randomEmotion];
        setCurrentEmotion({
          emotion: randomEmotion,
          confidence: Math.random() * 0.4 + 0.6,
          color: emotionInfo.color,
        });
      }, 5000);
      const tickInterval = setInterval(() => forceTick((t) => t + 1), 1000);
      return () => {
        clearInterval(emotionInterval);
        clearInterval(tickInterval);
      };
    }
  }, [user, authLoading, router, chapterId]);

  // Auto-connect voice once chapter is loaded
  useEffect(() => {
    if (!loading && chapter && !isConnected) {
      connect(true);
    }
  }, [loading, chapter, isConnected, connect]);

  // Mirror voice transcript into the chat panel, preserving any inline visuals.
  useEffect(() => {
    setMessages((prev) => {
      const visualOnly = prev.filter((m) => m.visual);
      const mapped: Message[] = transcript.map((line) => {
        if (line.startsWith("You:")) {
          return { role: "student", content: line.replace(/^You:\s*/, "") };
        }
        if (line.startsWith("Tutor:")) {
          return { role: "tutor", content: line.replace(/^Tutor:\s*/, "") };
        }
        return { role: "tutor", content: line };
      });
      return [...mapped, ...visualOnly];
    });
  }, [transcript]);

  const lastMessageContent = messages[messages.length - 1]?.content ?? "";
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastMessageContent]);

  async function loadChapter() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/curriculum/${subjectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.subject_name) setSubjectName(data.subject_name);
        const ch = data.chapters?.find((c: any) => c.id === chapterId);
        if (ch) setChapter(ch);
      }
    } catch (err) {
      console.error("Failed to load chapter:", err);
    } finally {
      setLoading(false);
    }
  }

  async function streamTutor(message: string, mode?: string) {
    setMessages((prev) => [...prev, { role: "tutor", content: "" }]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const body: Record<string, unknown> = { message };
      if (mode) body.mode = mode;

      const res = await fetch(`/api/proxy/api/lessons/${chapterId}/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "tutor", content: "Sorry, I couldn't respond right now." };
          return updated;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx;
        while ((nlIdx = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 2);
          for (const line of event.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const obj = JSON.parse(payload);
              const chunk = obj.text ?? obj.delta ?? obj.content ?? "";
              if (!chunk) continue;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "tutor") {
                  updated[updated.length - 1] = { role: "tutor", content: last.content + chunk };
                }
                return updated;
              });
            } catch {
              // non-JSON SSE payload — append raw
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "tutor") {
                  updated[updated.length - 1] = { role: "tutor", content: last.content + payload };
                }
                return updated;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "student", content: text }]);
    setInputValue("");
    await streamTutor(text);
  }

  async function explainDifferently() {
    const lastStudent = [...messages].reverse().find((m) => m.role === "student");
    const message = lastStudent?.content || "Please explain the current topic differently using a fresh approach.";
    await streamTutor(message, "explain_differently");
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-54px)] items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading lesson…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[var(--bg-page)] flex overflow-hidden">
      {/* Video Panel (Left) */}
      <div className="flex-1 border-r border-[var(--border)] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <div className="w-full max-w-2xl relative">
            <div className="aspect-video bg-gradient-to-br from-[var(--brand-blue-soft)] via-white to-[var(--subject-coding-bg)] rounded-3xl border border-[var(--border)] flex items-center justify-center relative overflow-hidden shadow-elevated">
              {currentVisual ? (
                <div className="absolute inset-0 flex flex-col bg-white">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-deep)]">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {currentVisual.kind === "youtube" ? "📺 " : "📊 "}
                      {currentVisual.title}
                    </p>
                    <button
                      onClick={() => setCurrentVisual(null)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--red)] px-2 py-1 rounded"
                      title="Hide visual"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-3 flex items-center justify-center">
                    {currentVisual.kind === "youtube" ? (
                      <iframe
                        className="w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${currentVisual.videoId}?autoplay=1`}
                        title={currentVisual.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <MermaidDiagram code={currentVisual.mermaidCode} />
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="relative w-36 h-36 mx-auto mb-4">
                    <div
                      className={`w-36 h-36 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--subject-coding)] flex items-center justify-center shadow-elevated ${
                        isAISpeaking ? "animate-pulse" : ""
                      }`}
                    >
                      <span className="text-6xl">🧠</span>
                    </div>
                    {isAISpeaking && (
                      <div
                        className="absolute inset-0 rounded-full border-4 border-[var(--brand-blue)] animate-ping"
                        style={{ animationDelay: "0.5s" }}
                      />
                    )}
                  </div>
                  <p className="text-[var(--text-primary)] font-extrabold text-xl">AI Tutor</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">{chapter?.title}</p>
                  <p className="text-xs mt-3 font-bold inline-block px-3 py-1 rounded-full" style={{ color: isConnected ? "var(--green)" : "var(--amber)", background: isConnected ? "var(--green-bg)" : "var(--amber-bg)" }}>
                    {isConnected
                      ? isAISpeaking
                        ? "● Speaking…"
                        : isListening
                        ? "● Listening…"
                        : isProcessingTranscript
                        ? "● Thinking…"
                        : "● Connected"
                      : "○ Connecting…"}
                  </p>
                  {voiceError && (
                    <p className="text-xs mt-2 text-[var(--red)] max-w-xs">{voiceError}</p>
                  )}
                </div>
              )}

              {/* Emotion Detection Bar (Top Right) */}
              {currentEmotion && (
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur border border-[var(--border)] rounded-2xl px-3 py-2 shadow-card">
                  <div className="text-[10px] font-bold text-[var(--text-primary)] mb-2">
                    {EMOTIONS[currentEmotion.emotion].label}
                  </div>
                  <div className="w-24 h-1.5 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${currentEmotion.confidence * 100}%`,
                        background: currentEmotion.color,
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] mt-1 font-medium">
                    {Math.round(currentEmotion.confidence * 100)}% confident
                  </div>
                </div>
              )}

              {isVideoOn && (
                <div className="absolute bottom-4 right-4 w-24 h-20 bg-white border-2 border-[var(--border)] rounded-2xl flex items-center justify-center shadow-card">
                  <span className="text-2xl">📹</span>
                </div>
              )}

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur border border-[var(--border)] rounded-full px-3 py-1 shadow-card">
                <p className="text-[11px] text-[var(--brand-blue)] font-bold">
                  {Math.floor((Date.now() - sessionStarted.getTime()) / 60000)}:
                  {String(Math.floor(((Date.now() - sessionStarted.getTime()) % 60000) / 1000)).padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {currentEmotion && (
          <div className="border-t border-[var(--border)] bg-white p-4">
            <div className="text-xs text-[var(--text-muted)] mb-2 font-bold uppercase tracking-wide">Student Sentiment</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(EMOTIONS).map(([key, { label, color, bgColor }]) => (
                <div
                  key={key}
                  className="px-2 py-2 rounded-xl text-center transition-all"
                  style={{
                    background: currentEmotion.emotion === key ? bgColor : "var(--bg-deep)",
                    border: currentEmotion.emotion === key ? `2px solid ${color}` : "2px solid transparent",
                  }}
                >
                  <div className="text-[11px] font-bold" style={{ color: currentEmotion.emotion === key ? color : "var(--text-muted)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="border-t border-[var(--border)] p-4 flex justify-center gap-4 bg-white">
          <button
            onClick={() => toggleListening()}
            disabled={!isConnected}
            title={isListening ? "Mute mic" : "Unmute mic"}
            className={`p-3 rounded-full transition-all disabled:opacity-40 shadow-card ${
              isListening
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-deep)] text-[var(--text-muted)] hover:bg-[var(--border)]"
            }`}
          >
            🎤
          </button>
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3 rounded-full transition-all shadow-card ${
              isVideoOn
                ? "bg-[var(--brand-blue)] text-white"
                : "bg-[var(--bg-deep)] text-[var(--text-muted)] hover:bg-[var(--border)]"
            }`}
          >
            📹
          </button>
          <button
            onClick={() => (isConnected ? disconnect() : connect(true))}
            title={isConnected ? "Disconnect tutor" : "Reconnect tutor"}
            className="p-3 rounded-full bg-[var(--bg-deep)] text-[var(--text-muted)] hover:bg-[var(--border)] transition-all shadow-card"
          >
            {isConnected ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => {
              disconnect();
              router.back();
            }}
            className="p-3 rounded-full bg-[var(--red)] text-white hover:opacity-90 transition-all shadow-card"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat Panel (Right) */}
      <div className="w-80 border-l border-[var(--border)] flex flex-col bg-white">
        <div className="border-b border-[var(--border)] p-4 bg-[var(--bg-deep)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{chapter?.title}</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-1 font-medium">
            {isConnected ? "● Active session" : "Reconnecting…"}
          </p>
          <div className="mt-3 flex gap-1.5">
            <Link
              href={`/story/${chapterId}`}
              title="Read this chapter as a story"
              className="flex-1 flex items-center justify-center gap-1 bg-white border border-[var(--border)] hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--text-muted)] transition-colors"
            >
              <BookOpen className="w-3 h-3" /> Story
            </Link>
            <Link
              href={`/podcast/${chapterId}`}
              title="Listen as a podcast"
              className="flex-1 flex items-center justify-center gap-1 bg-white border border-[var(--border)] hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--text-muted)] transition-colors"
            >
              <Headphones className="w-3 h-3" /> Listen
            </Link>
            <Link
              href={`/career/${chapterId}`}
              title="Where this shows up in real careers"
              className="flex-1 flex items-center justify-center gap-1 bg-white border border-[var(--border)] hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--text-muted)] transition-colors"
            >
              <Briefcase className="w-3 h-3" /> Careers
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[12px] text-[var(--text-muted)]">
                {isConnected ? "Speak or type to start the lesson" : "Connecting to tutor…"}
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
            >
              {msg.visual ? (
                <div className="w-full bg-white border border-[var(--border)] rounded-2xl p-2 shadow-card">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide px-2 py-1">
                    {msg.visual.kind === "youtube" ? "📺 " : msg.visual.kind === "image" ? "🖼 " : "📊 "}
                    {msg.visual.title}
                  </div>
                  {msg.visual.kind === "youtube" && (
                    <div className="aspect-video w-full rounded-lg overflow-hidden">
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${msg.visual.videoId}`}
                        title={msg.visual.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {msg.visual.kind === "diagram" && (
                    <div className="w-full h-56 bg-[var(--bg-deep)] rounded-lg p-2">
                      <MermaidDiagram code={msg.visual.mermaidCode} />
                    </div>
                  )}
                  {msg.visual.kind === "image" && (
                    <img
                      src={msg.visual.url}
                      alt={msg.visual.alt || msg.visual.title}
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
              ) : (
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 text-[12px] leading-relaxed whitespace-pre-wrap shadow-card ${
                    msg.role === "student"
                      ? "bg-[var(--brand-blue)] text-white"
                      : "bg-[var(--bg-deep)] text-[var(--text-body)] border border-[var(--border)]"
                  }`}
                >
                  {msg.content || (msg.role === "tutor" ? "…" : "")}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[var(--border)] p-4 bg-white space-y-2">
          {messages.some((m) => m.role === "student") && (
            <button
              onClick={explainDifferently}
              className="w-full px-3 py-2 bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] rounded-full font-bold text-xs hover:bg-[var(--brand-blue)] hover:text-white transition-all"
              title="Re-explain the last topic with a fresh approach"
            >
              💡 Explain it differently
            </button>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ask a question..."
              className="flex-1 bg-[var(--bg-deep)] border border-[var(--border)] rounded-full px-4 py-2 text-[13px] text-[var(--text-body)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-blue)] focus:bg-white transition-colors"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-card"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
