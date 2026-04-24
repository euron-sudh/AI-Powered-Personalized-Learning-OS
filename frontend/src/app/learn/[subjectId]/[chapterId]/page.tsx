"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Briefcase, Headphones } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { ArcadeShell, PixelBar } from "@/components/arcade";

interface Chapter {
  id: string;
  title: string;
  description: string;
}

type Visual =
  | { kind: "video"; videoId: string; title: string; concept?: string; startSeconds?: number; endSeconds?: number }
  | { kind: "diagram"; mermaidCode: string; title: string; imageUrl?: string; imageAlt?: string }
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

// Tiny inline markdown renderer for the Byte Chat bubbles. Handles
// **bold** and splits the tutor's stream into sentence-level paragraphs
// so the transcript is readable instead of a single wrapping wall.
function applyBold(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<strong key={`${keyBase}-${key++}`}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderTutorMarkdown(text: string): React.ReactNode {
  // Split on sentence-ending punctuation that's followed by whitespace.
  // Keeps the punctuation with its sentence. Empty chunks are skipped.
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) return applyBold(text, "s0");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sentences.map((s, i) => (
        <p key={i} style={{ margin: 0 }}>
          {applyBold(s, `s${i}`)}
        </p>
      ))}
    </div>
  );
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
            // Constrain BOTH dimensions so a small diagram (e.g. 3 nodes)
            // doesn't get stretched to the full container width — that made
            // labels look comically huge. Letting the SVG stay at its
            // natural size up to the container bounds keeps text readable
            // and the layout airy.
            svgEl.style.maxWidth = "100%";
            svgEl.style.maxHeight = "100%";
            svgEl.style.width = "auto";
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

// Stage diagram with an optional side-by-side example photo. If the image
// URL 404s (the tutor occasionally hallucinates paths) we hide the image
// pane gracefully so the diagram still reads.
function DiagramWithOptionalImage({
  code,
  imageUrl,
  imageAlt,
}: {
  code: string;
  imageUrl?: string;
  imageAlt?: string;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const showImage = Boolean(imageUrl) && !imgBroken;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: showImage ? "1fr 1fr" : "1fr",
        gap: 12,
        width: "100%",
        height: "100%",
      }}
    >
      <div style={{ minWidth: 0, minHeight: 0 }}>
        <MermaidDiagram code={code} />
      </div>
      {showImage && (
        <div
          style={{
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            padding: 6,
          }}
        >
          <img
            src={imageUrl}
            alt={imageAlt || ""}
            onError={() => setImgBroken(true)}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}

// Look up a real Wikipedia image for a concept query. Tries the REST
// `summary` endpoint (often has a full-quality `originalimage`) first,
// then falls back to the Action API's `pageimages` prop. Returns the
// image URL string, or null if nothing suitable exists. LLMs can't
// reliably produce real image URLs — this resolver is what makes "show
// an example picture" actually work instead of rendering a broken <img>.
const wikiImageCache = new Map<string, Promise<string | null>>();
async function resolveWikipediaImage(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;
  const cached = wikiImageCache.get(q);
  if (cached) return cached;
  const p = (async (): Promise<string | null> => {
    try {
      const sumRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      if (sumRes.ok) {
        const data = await sumRes.json();
        const src: unknown = data?.originalimage?.source ?? data?.thumbnail?.source;
        if (typeof src === "string" && src.startsWith("https://")) return src;
        // Page exists but has no lead image. Don't substitute a random
        // search result (often unrelated like a screenshot) — return null
        // and let the diagram stand alone. If the page didn't exist (404),
        // fall through to the search fallback below.
        return null;
      }
      const api = new URL("https://en.wikipedia.org/w/api.php");
      api.searchParams.set("action", "query");
      api.searchParams.set("format", "json");
      api.searchParams.set("origin", "*");
      api.searchParams.set("generator", "search");
      api.searchParams.set("gsrsearch", q);
      api.searchParams.set("gsrlimit", "1");
      api.searchParams.set("prop", "pageimages");
      api.searchParams.set("piprop", "original|thumbnail");
      api.searchParams.set("pithumbsize", "800");
      const searchRes = await fetch(api.toString());
      if (searchRes.ok) {
        const data = await searchRes.json();
        const pages = (data?.query?.pages ?? {}) as Record<string, { original?: { source?: string }; thumbnail?: { source?: string } }>;
        for (const key of Object.keys(pages)) {
          const src = pages[key].original?.source ?? pages[key].thumbnail?.source;
          if (typeof src === "string" && src.startsWith("https://")) return src;
        }
      }
    } catch {
      return null;
    }
    return null;
  })();
  wikiImageCache.set(q, p);
  return p;
}

// Build a youtube-nocookie embed URL that stays in-app. `rel=0` kills the
// related-videos grid at the end, `modestbranding=1` hides the YouTube logo
// in the control bar, `iv_load_policy=3` drops annotations. Combined with the
// iframe sandbox (no allow-popups, no allow-top-navigation), clicks on the
// "Watch on YouTube" overlay don't go anywhere.
function buildInlineVideoEmbedUrl(
  videoId: string,
  opts: { autoplay?: boolean; start?: number; end?: number } = {},
): string {
  const p = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
    playsinline: "1",
    controls: "1",
    cc_load_policy: "1",
  });
  if (opts.autoplay) p.set("autoplay", "1");
  if (opts.start !== undefined) p.set("start", String(opts.start));
  if (opts.end !== undefined) p.set("end", String(opts.end));
  // Previously used youtube-nocookie.com for the privacy domain, but some
  // videos aren't whitelisted there and fail with "Error 153 — video player
  // configuration error". Plain youtube.com accepts all public embeddable
  // videos; the privacy difference is negligible for kid-safe search results.
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${p.toString()}`;
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
  const [isChapterComplete, setIsChapterComplete] = useState(false);
  const [completing, setCompleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;
  const searchParams = useSearchParams();
  const quizTopic = searchParams.get("topic") ?? undefined;
  const quizCorrect = searchParams.get("correct") ?? undefined;
  const quizChosen = searchParams.get("chosen") ?? undefined;

  const voiceOptions = useMemo(
    () => ({
      chapterId,
      lessonTitle: chapter?.title,
      chapterDescription: chapter?.description,
      subjectName,
      quizTopic,
      quizCorrect,
      quizChosen,
      onToolCall: (toolName: string, args: Record<string, unknown>) => {
        let v: Visual | null = null;
        if (toolName === "show_video" || toolName === "show_youtube_video") {
          // `show_youtube_video` kept as alias for older model turns mid-session.
          const toNumOrUndef = (x: unknown) => {
            const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
            return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
          };
          const directVideoId = args.video_id ? String(args.video_id) : "";
          const query = args.query ? String(args.query) : "";
          // No hard cap. Honor the AI's start/end trims when provided
          // (useful to skip intros on longer clips); otherwise play the full
          // clip. Video length is instead kept short via the backend's
          // videoDuration=short YouTube search filter (< 4 min).
          const clampedStart = toNumOrUndef(args.start_seconds);
          const clampedEnd = toNumOrUndef(args.end_seconds);
          const video: Visual = {
            kind: "video",
            videoId: directVideoId,
            title: String(args.title ?? (query || "Video")),
            concept: args.concept ? String(args.concept) : undefined,
            startSeconds: clampedStart,
            endSeconds: clampedEnd,
          };
          v = video;
          // If the model passed only a query (the new path), resolve it via the
          // backend YouTube search proxy and patch the visual in place. Same
          // pattern as resolveWikipediaImage above — comparison by reference
          // so later visuals aren't overwritten if the student moved on.
          if (!directVideoId && query) {
            void (async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const res = await fetch(
                  `/api/proxy/api/youtube/search?q=${encodeURIComponent(query)}`,
                  { headers: { Authorization: `Bearer ${session.access_token}` } },
                );
                if (!res.ok) return;
                const data = (await res.json()) as { video_id?: string; title?: string };
                if (!data.video_id) return;
                const patched: Visual = {
                  ...video,
                  videoId: data.video_id,
                  title: video.title || data.title || "Video",
                };
                setCurrentVisual((cur) => (cur === video ? patched : cur));
                setMessages((prev) =>
                  prev.map((m) => (m.visual === video ? { ...m, visual: patched } : m)),
                );
              } catch {
                // Network/quota error — leave the visual with an empty videoId;
                // the video renderer can show a "couldn't load" state.
              }
            })();
          }
        } else if (toolName === "show_diagram") {
          const diagram: Visual = {
            kind: "diagram",
            mermaidCode: String(args.mermaid_code ?? ""),
            title: String(args.title ?? "Diagram"),
            imageUrl: args.image_url ? String(args.image_url) : undefined,
            imageAlt: args.image_alt ? String(args.image_alt) : undefined,
          };
          v = diagram;
          const imageQuery = args.image_query ? String(args.image_query) : undefined;
          // Async Wikipedia resolution — patch the Visual in place once we
          // have a real URL. Compares by reference so later visuals aren't
          // overwritten if the student already moved on.
          if (!diagram.imageUrl && imageQuery) {
            void resolveWikipediaImage(imageQuery).then((url) => {
              if (!url) return;
              const patched: Visual = {
                ...diagram,
                imageUrl: url,
                imageAlt: diagram.imageAlt || imageQuery,
              };
              setCurrentVisual((cur) => (cur === diagram ? patched : cur));
              setMessages((prev) =>
                prev.map((m) => (m.visual === diagram ? { ...m, visual: patched } : m)),
              );
            });
          }
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
    [chapterId, chapter?.title, chapter?.description, subjectName, quizTopic, quizCorrect, quizChosen]
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

  // Remember whether the user explicitly disconnected so the auto-connect
  // effect below doesn't immediately reconnect them. Without this, clicking
  // Disconnect flips `isConnected` to false, the effect's dep list re-runs,
  // and connect(true) fires again — producing a disconnect/reconnect loop
  // where each cycle starts a fresh Gemini session (which loses context and
  // hallucinates).
  const userDisconnectedRef = useRef(false);
  const hasAutoConnectedRef = useRef(false);

  // Auto-connect voice as soon as the user is authenticated — do NOT wait
  // for the chapter fetch to complete. The chapter fetch is 1–3 seconds of
  // network + curriculum parsing; the voice WS handshake + Gemini setup is
  // another 0.5–1 second. Running them serially was ~3 seconds of dead air
  // on lesson open. Running in parallel compresses that to whichever
  // finishes last (usually the chapter fetch).
  //
  // The hook reads options via `optionsRef.current` at the moment setup is
  // sent, so even though we connect before the chapter is loaded, the
  // system prompt and opening message still get the full lesson context as
  // long as the chapter arrives before Gemini's setupComplete (it does, on
  // every realistic network). If the chapter is slower than Gemini, the
  // AI's first greeting will still work — it just won't know the specific
  // lesson title, which is far cheaper than 3 seconds of silence.
  useEffect(() => {
    if (authLoading || !user) return;
    if (hasAutoConnectedRef.current) return;
    if (userDisconnectedRef.current) return;
    if (isConnected) return;
    hasAutoConnectedRef.current = true;
    connect(true);
  }, [authLoading, user, isConnected, connect]);

  const handleVoiceDisconnect = () => {
    userDisconnectedRef.current = true;
    disconnect();
  };

  const handleVoiceReconnect = () => {
    userDisconnectedRef.current = false;
    connect(true);
  };

  const handleMarkComplete = async () => {
    if (isChapterComplete || completing) return;
    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCompleting(false);
        return;
      }
      const res = await fetch(
        `/api/proxy/api/lessons/${chapterId}/complete`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Couldn't mark complete: ${res.status} ${txt}`);
        setCompleting(false);
        return;
      }
      setIsChapterComplete(true);
    } catch (err) {
      alert(`Couldn't mark complete: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCompleting(false);
    }
  };

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
        if (ch) {
          setChapter(ch);
          setIsChapterComplete(ch.status === "completed");
          // Remember this lesson so the dashboard's "Continue Learning" can
          // drop the student right back here next time.
          try {
            localStorage.setItem(
              "learnos:last-lesson",
              JSON.stringify({
                subjectId,
                chapterId,
                chapterTitle: ch.title,
                subjectName: data.subject_name ?? "",
                at: Date.now(),
              })
            );
          } catch { /* storage may be disabled */ }
        }
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
      <ArcadeShell active="Learn" pixels={8}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center" }}>
            <div
              className="anim-glow"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "3px solid var(--line)",
                borderTopColor: "var(--neon-cyan)",
                margin: "0 auto 16px",
                animation: "spin 1s linear infinite",
              }}
            />
            <p className="label" style={{ color: "var(--neon-cyan)" }}>Loading lesson…</p>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  const sessionMin = Math.floor((Date.now() - sessionStarted.getTime()) / 60000);
  const sessionSec = String(
    Math.floor(((Date.now() - sessionStarted.getTime()) % 60000) / 1000)
  ).padStart(2, "0");

  const titleWords = (chapter?.title ?? "Lesson").split(" ");
  const titleAccent = titleWords.length > 1 ? titleWords.pop() : null;
  const titleHead = titleWords.join(" ");

  return (
    <ArcadeShell active="Learn" pixels={8}>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          fontSize: 12,
          color: "var(--ink-mute)",
          marginBottom: 14,
        }}
      >
        <span className="label">{subjectName || "Subject"}</span>
        <span>›</span>
        <Link href={`/learn/${subjectId}`} className="label" style={{ textDecoration: "none" }}>
          Chapters
        </Link>
        <span>›</span>
        <span className="label" style={{ color: "var(--neon-cyan)" }}>
          {chapter?.title ?? "Lesson"}
        </span>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Main panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hero / tutor visual panel */}
          <div className="panel" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div className="scanline" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: 18,
                gap: 16,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    className="pill"
                    style={{ color: "var(--neon-cyan)", borderColor: "var(--neon-cyan)" }}
                  >
                    Live Lesson
                  </span>
                  <button
                    onClick={handleMarkComplete}
                    disabled={isChapterComplete || completing}
                    title={isChapterComplete ? "Chapter already marked complete" : "Mark this chapter as complete"}
                    className="pill"
                    style={{
                      cursor: isChapterComplete || completing ? "default" : "pointer",
                      color: isChapterComplete ? "var(--neon-lime)" : "var(--neon-yel)",
                      borderColor: isChapterComplete ? "var(--neon-lime)" : "var(--neon-yel)",
                      fontWeight: 700,
                      opacity: completing ? 0.7 : 1,
                    }}
                  >
                    {isChapterComplete ? "✓ Completed" : completing ? "Saving…" : "✓ Mark complete"}
                  </button>
                </div>
                <h1 className="h-display" style={{ fontSize: 32, margin: "10px 0 6px" }}>
                  {titleHead}
                  {titleAccent && (
                    <>
                      {" "}
                      <span style={{ color: "var(--neon-yel)" }}>{titleAccent}</span>
                    </>
                  )}
                </h1>
                <p style={{ color: "var(--ink-dim)", maxWidth: 640 }}>
                  {chapter?.description ?? "Let's dive in with Byte, your AI tutor."}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <div
                  className="pill"
                  style={{ color: "var(--neon-lime)", borderColor: "var(--neon-lime)" }}
                >
                  ⏱ {sessionMin}:{sessionSec}
                </div>
                <div
                  className="pill"
                  style={{
                    color: isConnected ? "var(--neon-lime)" : "var(--neon-ora)",
                    borderColor: isConnected ? "var(--neon-lime)" : "var(--neon-ora)",
                  }}
                >
                  {isConnected
                    ? isAISpeaking
                      ? "● Speaking"
                      : isListening
                      ? "● Listening"
                      : isProcessingTranscript
                      ? "● Thinking"
                      : "● Connected"
                    : "○ Connecting"}
                </div>
              </div>
            </div>

            {/* Tutor / visual stage */}
            <div
              style={{
                height: 380,
                borderRadius: 16,
                background: "radial-gradient(circle at center, #201343, #0b0716)",
                border: "2px solid var(--line)",
                position: "relative",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
              }}
            >
              {currentVisual ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    background: "#0b0716",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderBottom: "2px solid var(--line)",
                      background: "rgba(0,0,0,0.4)",
                    }}
                  >
                    <p
                      className="label"
                      style={{
                        color: "var(--neon-cyan)",
                        fontSize: 11,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {currentVisual.kind === "video" ? "📺 " : currentVisual.kind === "image" ? "🖼 " : "📊 "}
                      {currentVisual.title}
                    </p>
                    <button
                      onClick={() => setCurrentVisual(null)}
                      className="pill"
                      style={{ cursor: "pointer", color: "var(--neon-mag)", borderColor: "var(--neon-mag)" }}
                      title="Hide visual"
                    >
                      ✕
                    </button>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflow: "auto",
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                    }}
                  >
                    {currentVisual.kind === "video" ? (
                      <iframe
                        style={{ width: "100%", height: "100%", borderRadius: 8, border: 0 }}
                        src={buildInlineVideoEmbedUrl(currentVisual.videoId, {
                          autoplay: true,
                          start: currentVisual.startSeconds,
                          end: currentVisual.endSeconds,
                        })}
                        title={currentVisual.title}
                        referrerPolicy="strict-origin-when-cross-origin"
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        allow="autoplay; encrypted-media; picture-in-picture"
                      />
                    ) : currentVisual.kind === "diagram" ? (
                      <DiagramWithOptionalImage
                        code={currentVisual.mermaidCode}
                        imageUrl={currentVisual.imageUrl}
                        imageAlt={currentVisual.imageAlt || currentVisual.title}
                      />
                    ) : (
                      <img
                        src={currentVisual.url}
                        alt={currentVisual.alt || currentVisual.title}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 16px" }}>
                    <div
                      className={isAISpeaking ? "anim-bop" : "anim-float"}
                      style={{
                        width: 160,
                        height: 160,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                        display: "grid",
                        placeItems: "center",
                        boxShadow: "0 0 48px rgba(255,62,165,0.45)",
                        border: "3px solid #170826",
                      }}
                    >
                      <span style={{ fontSize: 72 }}>🧠</span>
                    </div>
                    {isAISpeaking && (
                      <div
                        className="anim-glow"
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "50%",
                          border: "3px solid var(--neon-cyan)",
                          animation: "ping 1.2s ease-out infinite",
                        }}
                      />
                    )}
                  </div>
                  <div className="h-display" style={{ fontSize: 22, color: "var(--ink)" }}>
                    AI Tutor
                  </div>
                  <div className="label" style={{ marginTop: 6, color: "var(--ink-mute)" }}>
                    {chapter?.title}
                  </div>
                  {voiceError && (
                    <div
                      className="pill"
                      style={{
                        marginTop: 12,
                        color: "var(--neon-mag)",
                        borderColor: "var(--neon-mag)",
                        maxWidth: 320,
                      }}
                    >
                      {voiceError}
                    </div>
                  )}
                </div>
              )}

              {/* Emotion bar (top right) */}
              {currentEmotion && (
                <div
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.55)",
                    border: "2px solid var(--line)",
                    minWidth: 140,
                  }}
                >
                  <div className="label" style={{ color: "var(--neon-cyan)", fontSize: 10 }}>
                    {EMOTIONS[currentEmotion.emotion].label}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 3,
                      overflow: "hidden",
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        width: `${currentEmotion.confidence * 100}%`,
                        height: "100%",
                        background: currentEmotion.color,
                        boxShadow: `0 0 8px ${currentEmotion.color}`,
                        transition: "width 400ms ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 4 }}>
                    {Math.round(currentEmotion.confidence * 100)}% confident
                  </div>
                </div>
              )}

              {/* Video feed placeholder (bottom right) */}
              {isVideoOn && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 14,
                    right: 14,
                    width: 92,
                    height: 72,
                    background: "rgba(0,0,0,0.65)",
                    border: "2px solid var(--line)",
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 24,
                  }}
                >
                  📹
                </div>
              )}
            </div>

            {/* Controls row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 20,
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => {
                  handleVoiceDisconnect();
                  router.back();
                }}
                className="pill"
                style={{ cursor: "pointer" }}
              >
                ← Back
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => toggleListening()}
                  disabled={!isConnected}
                  title={isListening ? "Mute mic" : "Unmute mic"}
                  className="pill"
                  style={{
                    cursor: isConnected ? "pointer" : "not-allowed",
                    opacity: isConnected ? 1 : 0.5,
                    color: isListening ? "var(--neon-lime)" : "var(--ink-dim)",
                    borderColor: isListening ? "var(--neon-lime)" : "var(--line)",
                  }}
                >
                  🎤 {isListening ? "On" : "Off"}
                </button>
                <button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className="pill"
                  style={{
                    cursor: "pointer",
                    color: isVideoOn ? "var(--neon-cyan)" : "var(--ink-dim)",
                    borderColor: isVideoOn ? "var(--neon-cyan)" : "var(--line)",
                  }}
                >
                  📹 {isVideoOn ? "On" : "Off"}
                </button>
                <button
                  onClick={handleMarkComplete}
                  disabled={isChapterComplete || completing}
                  title={isChapterComplete ? "Chapter already marked complete" : "Mark this chapter as complete"}
                  className="chunky-btn"
                  style={{
                    fontSize: 12,
                    padding: "10px 16px",
                    background: isChapterComplete ? "var(--neon-lime)" : "var(--neon-yel)",
                    color: "#170826",
                    cursor: isChapterComplete || completing ? "default" : "pointer",
                    opacity: completing ? 0.7 : 1,
                  }}
                >
                  {isChapterComplete ? "✓ Completed" : completing ? "Saving…" : "✓ Mark complete"}
                </button>
                <button
                  onClick={() => (isConnected ? handleVoiceDisconnect() : handleVoiceReconnect())}
                  title={isConnected ? "Disconnect tutor" : "Reconnect tutor"}
                  className="chunky-btn cyan"
                  style={{ fontSize: 12, padding: "10px 16px" }}
                >
                  {isConnected ? "Disconnect" : "Reconnect"}
                </button>
              </div>
            </div>
          </div>

          {/* Sentiment feed panel */}
          {currentEmotion && (
            <div className="panel" style={{ padding: 18 }}>
              <div className="label" style={{ color: "var(--neon-mag)" }}>Student Sentiment</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                {Object.entries(EMOTIONS).map(([key, { label, color }]) => {
                  const active = currentEmotion.emotion === key;
                  return (
                    <div
                      key={key}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        textAlign: "center",
                        background: active ? `${color}18` : "rgba(255,255,255,0.04)",
                        border: "2px solid " + (active ? color : "var(--line)"),
                        transition: "all 200ms ease",
                      }}
                    >
                      <div
                        className="h-display"
                        style={{
                          fontSize: 13,
                          color: active ? color : "var(--ink-mute)",
                          textShadow: active ? `0 0 10px ${color}` : "none",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Chapter header card */}
          <div className="panel cyan" style={{ padding: 16 }}>
            <div className="label" style={{ color: "var(--neon-cyan)" }}>Lesson</div>
            <div className="h-display" style={{ fontSize: 18, margin: "4px 0 10px" }}>
              {chapter?.title}
            </div>
            <PixelBar value={isConnected ? 100 : 40} color="var(--neon-cyan)" />
            <div className="label" style={{ fontSize: 10, marginTop: 8, color: "var(--ink-mute)" }}>
              {isConnected ? "Active session" : "Reconnecting…"}
            </div>
          </div>

          {/* Quick links */}
          <div className="panel" style={{ padding: 14 }}>
            <div className="label">Explore</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 6,
                marginTop: 10,
              }}
            >
              <Link
                href={`/story/${chapterId}`}
                title="Read this chapter as a story"
                className="pill"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  textDecoration: "none",
                  fontSize: 11,
                  padding: "8px 4px",
                }}
              >
                <BookOpen style={{ width: 12, height: 12 }} /> Story
              </Link>
              <Link
                href={`/podcast/${chapterId}`}
                title="Listen as a podcast"
                className="pill"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  textDecoration: "none",
                  fontSize: 11,
                  padding: "8px 4px",
                }}
              >
                <Headphones style={{ width: 12, height: 12 }} /> Listen
              </Link>
              <Link
                href={`/career/${chapterId}`}
                title="Where this shows up in real careers"
                className="pill"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  textDecoration: "none",
                  fontSize: 11,
                  padding: "8px 4px",
                }}
              >
                <Briefcase style={{ width: 12, height: 12 }} /> Careers
              </Link>
            </div>
          </div>

          {/* Chat panel */}
          <div
            className="panel"
            style={{ padding: 14, display: "flex", flexDirection: "column", minHeight: 460 }}
          >
            <div className="label" style={{ color: "var(--neon-yel)" }}>Byte Chat</div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxHeight: 420,
                paddingRight: 4,
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 8px" }}>
                  <div style={{ fontSize: 28 }}>💬</div>
                  <p className="label" style={{ color: "var(--ink-mute)", marginTop: 6 }}>
                    {isConnected ? "Speak or type to start the lesson" : "Connecting to tutor…"}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "student" ? "flex-end" : "flex-start",
                  }}
                >
                  {msg.visual ? (
                    <div
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.35)",
                        border: "2px solid var(--line)",
                        borderRadius: 12,
                        padding: 8,
                      }}
                    >
                      <div
                        className="label"
                        style={{ color: "var(--neon-cyan)", fontSize: 10, padding: "4px 6px" }}
                      >
                        {msg.visual.kind === "video" ? "📺 " : msg.visual.kind === "image" ? "🖼 " : "📊 "}
                        {msg.visual.title}
                      </div>
                      {msg.visual.kind === "video" && (
                        <div
                          style={{
                            aspectRatio: "16 / 9",
                            width: "100%",
                            borderRadius: 8,
                            overflow: "hidden",
                          }}
                        >
                          <iframe
                            style={{ width: "100%", height: "100%", border: 0 }}
                            src={buildInlineVideoEmbedUrl(msg.visual.videoId, {
                              start: msg.visual.startSeconds,
                              end: msg.visual.endSeconds,
                            })}
                            title={msg.visual.title}
                            referrerPolicy="strict-origin-when-cross-origin"
                            sandbox="allow-scripts allow-same-origin allow-presentation"
                            allow="encrypted-media; picture-in-picture"
                          />
                        </div>
                      )}
                      {msg.visual.kind === "diagram" && (
                        <div
                          style={{
                            width: "100%",
                            height: 220,
                            background: "#fff",
                            borderRadius: 8,
                            padding: 6,
                          }}
                        >
                          <MermaidDiagram code={msg.visual.mermaidCode} />
                        </div>
                      )}
                      {msg.visual.kind === "image" && (
                        <img
                          src={msg.visual.url}
                          alt={msg.visual.alt || msg.visual.title}
                          style={{ width: "100%", borderRadius: 8 }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        maxWidth: "85%",
                        padding: "8px 12px",
                        borderRadius: 12,
                        fontSize: 12,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        background:
                          msg.role === "student"
                            ? "linear-gradient(135deg, var(--neon-cyan), var(--neon-vio))"
                            : "rgba(255,255,255,0.05)",
                        border:
                          msg.role === "student"
                            ? "2px solid #170826"
                            : "1.5px solid var(--line-soft)",
                        color: msg.role === "student" ? "#170826" : "var(--ink)",
                        fontWeight: msg.role === "student" ? 700 : 500,
                      }}
                    >
                      {msg.content
                        ? msg.role === "tutor"
                          ? renderTutorMarkdown(msg.content)
                          : msg.content
                        : msg.role === "tutor"
                        ? "…"
                        : ""}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                borderTop: "2px solid var(--line)",
                paddingTop: 10,
              }}
            >
              {messages.some((m) => m.role === "student") && (
                <button
                  onClick={explainDifferently}
                  className="chunky-btn yel"
                  style={{ fontSize: 11, padding: "8px 12px" }}
                  title="Re-explain the last topic with a fresh approach"
                >
                  💡 Explain differently
                </button>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Ask a question..."
                  style={{
                    flex: 1,
                    background: "rgba(0,0,0,0.35)",
                    border: "2px solid var(--line)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "var(--ink)",
                    outline: "none",
                    fontFamily: "var(--f-body)",
                  }}
                />
                <button
                  onClick={sendMessage}
                  className="chunky-btn cyan"
                  style={{ fontSize: 14, padding: "8px 14px" }}
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}
