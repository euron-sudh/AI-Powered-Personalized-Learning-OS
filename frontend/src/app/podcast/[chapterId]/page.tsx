"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
const VOICES: { id: Voice; label: string }[] = [
  { id: "nova", label: "Nova · warm" },
  { id: "alloy", label: "Alloy · neutral" },
  { id: "shimmer", label: "Shimmer · bright" },
  { id: "fable", label: "Fable · storyteller" },
  { id: "onyx", label: "Onyx · deep" },
  { id: "echo", label: "Echo · calm" },
];

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PodcastPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const { user, loading: authLoading } = useSupabaseAuth();
  const [voice, setVoice] = useState<Voice>("nova");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Audio playback state (for custom play/pause + scrubber)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const generate = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setAudioUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/proxy/api/immersive/podcast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chapter_id: chapterId, voice }),
      });
      if (!res.ok) {
        setErr("Podcast generation failed.");
        return;
      }
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } finally {
      setBusy(false);
    }
  }, [chapterId, voice]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Reset playback state whenever a new audio URL is loaded
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [audioUrl]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  if (authLoading || !user) {
    return (
      <div
        className="arcade-root"
        data-grade="68"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ink)" }}
      >
        Loading…
      </div>
    );
  }

  const progressPct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const bars = 28;

  return (
    <ArcadeShell active="Learn" pixels={12}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button
          onClick={() => router.back()}
          className="pill"
          style={{ marginBottom: 14, cursor: "pointer", border: "2px solid var(--line)", background: "transparent", color: "var(--ink-dim)" }}
        >
          ← Back
        </button>

        <header style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <Byte size={56} />
          <div>
            <div className="label" style={{ color: "var(--neon-mag)", marginBottom: 4 }}>
              ✦ Audio booth
            </div>
            <h1 className="h-display" style={{ fontSize: 30, lineHeight: 1.1 }}>
              Listen to this chapter
            </h1>
            <p
              style={{
                color: "var(--ink-dim)",
                fontFamily: "var(--f-body)",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              A 60–90 second walkthrough, narrated for you.
            </p>
          </div>
        </header>

        <section className="panel mag" style={{ padding: 20, marginBottom: 16 }}>
          <div className="label" style={{ marginBottom: 10, color: "var(--neon-mag)" }}>
            Pick a voice
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {VOICES.map((v) => {
              const active = voice === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  disabled={busy}
                  className="pill"
                  style={{
                    cursor: busy ? "not-allowed" : "pointer",
                    border: `2px solid ${active ? "var(--neon-cyan)" : "var(--line)"}`,
                    background: active ? "var(--neon-cyan)" : "transparent",
                    color: active ? "#170826" : "var(--ink)",
                    fontWeight: 700,
                    boxShadow: active ? "0 0 14px rgba(39,224,255,0.45)" : "none",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="chunky-btn yel"
            style={{
              marginTop: 18,
              width: "100%",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy
              ? "✦ Recording your podcast…"
              : audioUrl
              ? "↻ Regenerate"
              : "✦ Generate podcast"}
          </button>

          {err && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 12,
                border: "2px solid var(--neon-mag)",
                background: "rgba(255,62,165,0.1)",
                color: "var(--neon-mag)",
                fontFamily: "var(--f-body)",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}
        </section>

        {audioUrl && (
          <section className="panel cyan anim-glow" style={{ padding: 20 }}>
            <div className="label" style={{ marginBottom: 12, color: "var(--neon-cyan)" }}>
              ▶ Your podcast
            </div>

            {/* Waveform placeholder driven by progress */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 3,
                height: 60,
                marginBottom: 14,
                padding: "0 4px",
              }}
              aria-hidden
            >
              {Array.from({ length: bars }).map((_, i) => {
                const seed = ((i * 73) % 100) / 100;
                const h = 18 + seed * 42;
                const progressBar = (i / bars) * 100;
                const played = progressBar <= progressPct;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: h,
                      borderRadius: 2,
                      background: played ? "var(--neon-cyan)" : "rgba(255,255,255,0.12)",
                      boxShadow: played ? "0 0 8px var(--neon-cyan)" : "none",
                      transition: "background 200ms ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Progress track */}
            <div
              style={{
                position: "relative",
                height: 8,
                borderRadius: 6,
                background: "rgba(255,255,255,0.08)",
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, var(--neon-cyan), var(--neon-mag))",
                  boxShadow: "0 0 10px var(--neon-cyan)",
                  transition: "width 200ms linear",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--f-display)",
                fontSize: 12,
                color: "var(--ink-dim)",
                marginBottom: 14,
              }}
            >
              <span>{fmtTime(current)}</span>
              <span>{fmtTime(duration)}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={togglePlay}
                className="chunky-btn cyan"
                style={{ cursor: "pointer", fontSize: 16 }}
              >
                {playing ? "❚❚ Pause" : "▶ Play"}
              </button>
              <a
                href={audioUrl}
                download={`chapter-${chapterId}.mp3`}
                className="pill"
                style={{
                  textDecoration: "none",
                  border: "2px solid var(--line)",
                  background: "transparent",
                  color: "var(--neon-yel)",
                  fontWeight: 700,
                }}
              >
                ⇣ Download MP3
              </a>
            </div>

            <audio
              ref={audioRef}
              controls
              autoPlay
              src={audioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setPlaying(false)}
              style={{ width: "100%", marginTop: 14, filter: "invert(0.9) hue-rotate(180deg)" }}
            />
          </section>
        )}
      </div>
    </ArcadeShell>
  );
}
