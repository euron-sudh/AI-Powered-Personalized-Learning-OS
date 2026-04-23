"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

type Msg =
  | { role: "buddy"; text: string; expected?: string | null; correct?: boolean | null }
  | { role: "you"; text: string };

interface NextPrompt {
  type: "card" | "open";
  card_id?: string;
  buddy_says: string;
  hint?: string | null;
  topic?: string;
}

export default function StudyBuddyPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [current, setCurrent] = useState<NextPrompt | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice-to-text via the browser's Web Speech API (Chrome/Edge/Safari).
  // No backend call — transcription happens on-device. Unsupported browsers
  // see a disabled mic with a tooltip instead of a crash.
  const [isRecording, setIsRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setMicSupported(false);
      return;
    }
    const rec = new Ctor() as {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onstart: () => void;
      onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } & { length: number } }) => void;
      onend: () => void;
      onerror: (e: { error: string }) => void;
      start: () => void;
      stop: () => void;
    };
    rec.lang = "en-US";
    rec.continuous = false; // one utterance per click — user reviews, then sends
    rec.interimResults = true;
    rec.onstart = () => {
      setMicError(null);
      setIsRecording(true);
    };
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setInput(text);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = (e) => {
      setIsRecording(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicError("Mic blocked. Allow microphone access in the browser, then try again.");
      } else if (e.error === "no-speech") {
        setMicError("I didn't catch anything — try again.");
      } else if (e.error !== "aborted") {
        setMicError(`Mic error: ${e.error}`);
      }
    };
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* not running */ }
      recognitionRef.current = null;
    };
  }, []);

  const toggleMic = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isRecording) {
      try { rec.stop(); } catch { /* ignore */ }
    } else {
      setInput("");
      try { rec.start(); } catch { /* already started */ }
    }
  }, [isRecording]);

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  }, []);

  const fetchNext = useCallback(async () => {
    setBusy(true);
    const headers = await auth();
    if (!headers) return;
    const res = await fetch("/api/proxy/api/buddy/next", { headers });
    setBusy(false);
    if (!res.ok) return;
    const data: NextPrompt = await res.json();
    setCurrent(data);
    setMessages((m) => [...m, { role: "buddy", text: data.buddy_says }]);
  }, [auth]);

  useEffect(() => {
    if (user && !authLoading && messages.length === 0) {
      setMessages([{ role: "buddy", text: "Hey! I'm your study buddy. Let's keep what you've learned sharp." }]);
      fetchNext();
    }
  }, [user, authLoading, fetchNext, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "you", text }]);
    setBusy(true);

    const headers = await auth();
    if (!headers) return;
    const body: Record<string, string> = { answer: text };
    if (current?.type === "card") body.card_id = current.card_id || "";
    else if (current?.type === "open") body.question = current.buddy_says;

    const res = await fetch("/api/proxy/api/buddy/answer", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setMessages((m) => [...m, { role: "buddy", text: "I lost the thread — try again?" }]);
      return;
    }
    const data = await res.json();
    setMessages((m) => [
      ...m,
      {
        role: "buddy",
        text: data.buddy_says,
        expected: data.expected ?? null,
        correct: data.correct ?? null,
      },
    ]);
    setCurrent(null);
    setTimeout(fetchNext, 700);
  }

  function reset() {
    setMessages([{ role: "buddy", text: "Fresh start! Let's go." }]);
    setCurrent(null);
    fetchNext();
  }

  if (authLoading) {
    return (
      <div
        className="arcade-root"
        data-grade="68"
        data-motion="on"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ink)",
          fontFamily: "var(--f-display)",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <ArcadeShell active="Buddy" pixels={12}>
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
        {/* Byte profile */}
        <div
          className="panel"
          style={{ padding: 22, textAlign: "center", position: "relative", overflow: "hidden" }}
        >
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 30%, rgba(155,92,255,0.35), transparent 60%)",
            }}
          />
          <div style={{ position: "relative", marginTop: 10, display: "inline-block" }}>
            <Byte size={160} />
          </div>
          <h2 className="h-display" style={{ fontSize: 26, marginTop: 16 }}>Byte</h2>
          <div style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>
            Your study buddy
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(0,0,0,0.35)",
              border: "1.5px solid var(--line-soft)",
              textAlign: "left",
              fontSize: 12,
              color: "var(--ink-dim)",
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            I quiz you on what you&apos;ve learned. Answer honestly — wrong answers are where the learning lives.
          </div>

          <button
            onClick={reset}
            className="pill"
            style={{ cursor: "pointer", width: "100%", justifyContent: "center", padding: "10px 12px" }}
          >
            ↻ New session
          </button>
        </div>

        {/* Chat */}
        <div
          className="panel"
          style={{ display: "flex", flexDirection: "column", minHeight: 640 }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "2px solid var(--line-soft)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div className="h-display" style={{ fontSize: 18 }}>Chat with Byte</div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                {messages.length} message{messages.length === 1 ? "" : "s"}
                {current?.topic ? ` · ${current.topic}` : ""}
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              overflowY: "auto",
              maxHeight: "60vh",
            }}
            className="custom-scrollbar"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  flexDirection: m.role === "you" ? "row-reverse" : "row",
                  alignItems: "flex-end",
                }}
              >
                {m.role === "buddy" ? (
                  <div style={{ width: 36, height: 36, flexShrink: 0 }}>
                    <Byte size={36} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-vio))",
                      border: "2px solid #170826",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 14,
                      color: "var(--ink)",
                      flexShrink: 0,
                    }}
                  >
                    M
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    background:
                      m.role === "buddy" ? "rgba(155,92,255,0.12)" : "var(--neon-cyan)",
                    color: m.role === "buddy" ? "var(--ink)" : "#170826",
                    border: "2px solid " + (m.role === "buddy" ? "var(--line)" : "#170826"),
                    fontSize: 14,
                    fontWeight: m.role === "you" ? 600 : 400,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}
                  {m.role === "buddy" && m.expected && m.correct === false && (
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 8,
                        borderTop: "1px solid var(--line-soft)",
                        fontSize: 11,
                        color: "var(--ink-mute)",
                      }}
                    >
                      Expected: <span style={{ fontWeight: 800, color: "var(--neon-yel)" }}>{m.expected}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  color: "var(--ink-mute)",
                  fontSize: 12,
                }}
              >
                <div style={{ width: 28, height: 28 }}>
                  <Byte size={28} />
                </div>
                Byte is thinking
                <span className="anim-glow" style={{ color: "var(--neon-cyan)" }}>...</span>
              </div>
            )}
          </div>

          <div
            style={{
              padding: 16,
              borderTop: "2px solid var(--line-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {micError && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--neon-mag)",
                  padding: "4px 8px",
                }}
              >
                {micError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={isRecording ? "Listening… speak now" : "Type your answer…"}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.35)",
                  border: "2px solid " + (isRecording ? "var(--neon-mag)" : "var(--line)"),
                  color: "var(--ink)",
                  fontSize: 14,
                  fontFamily: "var(--f-body)",
                  outline: "none",
                  transition: "border-color 150ms ease",
                }}
              />
              <button
                onClick={toggleMic}
                disabled={!micSupported}
                title={
                  !micSupported
                    ? "Voice input isn't supported in this browser"
                    : isRecording
                    ? "Stop recording"
                    : "Speak your answer"
                }
                className={isRecording ? "anim-glow" : undefined}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  border: "2px solid " + (isRecording ? "var(--neon-mag)" : "var(--line)"),
                  background: isRecording
                    ? "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))"
                    : "rgba(0,0,0,0.35)",
                  color: isRecording ? "#170826" : "var(--ink)",
                  cursor: micSupported ? "pointer" : "not-allowed",
                  opacity: micSupported ? 1 : 0.4,
                  fontSize: 18,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: isRecording ? "0 0 16px var(--neon-mag)" : "none",
                  transition: "all 150ms ease",
                }}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
              >
                {isRecording ? "■" : "🎤"}
              </button>
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="chunky-btn cyan"
                style={{
                  padding: "12px 18px",
                  opacity: busy || !input.trim() ? 0.5 : 1,
                  cursor: busy || !input.trim() ? "not-allowed" : "pointer",
                }}
              >
                Send ▶
              </button>
            </div>
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}
