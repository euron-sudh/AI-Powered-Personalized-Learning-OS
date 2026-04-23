"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Coffee,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

type Mood = "happy" | "calm" | "focused" | "tired" | "stressed" | "stuck";

const MOODS: { id: Mood; label: string; emoji: string; neon: string }[] = [
  { id: "happy",    label: "Happy",    emoji: "😊", neon: "var(--neon-lime)" },
  { id: "calm",     label: "Calm",     emoji: "😌", neon: "var(--neon-cyan)" },
  { id: "focused",  label: "Focused",  emoji: "🎯", neon: "var(--neon-vio)" },
  { id: "tired",    label: "Tired",    emoji: "😴", neon: "var(--neon-mag)" },
  { id: "stressed", label: "Stressed", emoji: "😣", neon: "var(--neon-ora)" },
  { id: "stuck",    label: "Stuck",    emoji: "🤔", neon: "var(--neon-yel)" },
];

const ENERGY_ICONS = [BatteryLow, BatteryLow, BatteryMedium, Battery, BatteryFull];

const PRESETS = [25, 15, 50];

export default function FocusPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  // Mood
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [moodSaved, setMoodSaved] = useState<{ mood: string; suggestion: string } | null>(null);
  const [savingMood, setSavingMood] = useState(false);

  // Pomodoro
  const [duration, setDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  }, []);

  // Hydrate today's mood
  useEffect(() => {
    if (!user || authLoading) return;
    (async () => {
      const headers = await auth();
      if (!headers) return;
      const res = await fetch("/api/proxy/api/wellness/mood/today", { headers });
      if (res.ok) {
        const d = await res.json();
        if (d.checked_in) {
          setMoodSaved({ mood: d.mood, suggestion: d.suggestion });
          setMood(d.mood);
          setEnergy(d.energy);
        }
      }
    })();
  }, [user, authLoading, auth]);

  // Pomodoro tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setRunning(false);
          finishPomodoro();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function setDur(min: number) {
    setDuration(min);
    setSecondsLeft(min * 60);
    setRunning(false);
    setCompleted(null);
  }

  async function saveMood() {
    if (!mood) return;
    setSavingMood(true);
    try {
      const headers = await auth();
      if (!headers) return;
      const res = await fetch("/api/proxy/api/wellness/mood", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ mood, energy, note: note || null }),
      });
      if (res.ok) {
        const d = await res.json();
        setMoodSaved({ mood: d.mood, suggestion: d.suggestion });
        setNote("");
        router.push("/dashboard");
      }
    } finally {
      setSavingMood(false);
    }
  }

  async function finishPomodoro() {
    setCompleted(`Nice — ${duration} focused minutes done.`);
    const headers = await auth();
    if (!headers) return;
    await fetch("/api/proxy/api/wellness/pomodoro/complete", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: duration }),
    });
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = ((duration * 60 - secondsLeft) / (duration * 60)) * 100;
  const EnergyIcon = ENERGY_ICONS[Math.max(0, Math.min(4, energy - 1))];

  if (authLoading || !user) {
    return (
      <ArcadeShell active="Dashboard" pixels={10}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center" }}>
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 16px",
                borderRadius: 12,
                background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-mag))",
                border: "3px solid #170826",
                boxShadow: "0 0 24px rgba(39,224,255,0.6)",
              }}
              className="anim-bop"
            />
            <span className="label" style={{ color: "var(--neon-cyan)" }}>BOOTING FOCUS ARENA…</span>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  return (
    <ArcadeShell active="Dashboard" pixels={12}>
      {/* Header */}
      <div style={{ marginBottom: 20, maxWidth: 860, margin: "0 auto 20px" }}>
        <span className="label" style={{ color: "var(--neon-mag)" }}>
          <HeartPulse className="w-3 h-3" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          FOCUS ARENA
        </span>
        <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 4px" }}>
          Lock <span style={{ color: "var(--neon-cyan)" }}>In</span>
        </h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Check your vibe, then smash a pomodoro power-up.
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 20 }}>
        {/* Mood panel */}
        <div className="panel cyan" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />

          <div style={{ position: "relative" }}>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>
              ✦ Mood Check · How are you feeling?
            </span>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginTop: 14,
                marginBottom: 18,
              }}
            >
              {MOODS.map((m) => {
                const active = mood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    style={{
                      padding: "16px 10px 12px",
                      borderRadius: 14,
                      border: `2px solid ${active ? m.neon : "var(--line)"}`,
                      background: active ? `${m.neon}22` : "rgba(0,0,0,0.35)",
                      boxShadow: active ? `0 0 18px ${m.neon}66, 0 4px 0 0 #0a0515` : "0 4px 0 0 #0a0515",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                      color: active ? m.neon : "var(--ink)",
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>{m.emoji}</div>
                    <div
                      className="h-display"
                      style={{
                        fontSize: 13,
                        color: active ? m.neon : "var(--ink-dim)",
                        letterSpacing: 0.5,
                      }}
                    >
                      {m.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Energy slider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 14,
                borderRadius: 12,
                background: "rgba(0,0,0,0.4)",
                border: "2px solid var(--line)",
                marginBottom: 14,
              }}
            >
              <EnergyIcon className="w-6 h-6" style={{ color: "var(--neon-yel)" }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="label" style={{ color: "var(--neon-yel)" }}>Energy</span>
                  <span className="label">{energy} / 5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={energy}
                  onChange={(e) => setEnergy(+e.target.value)}
                  style={{ width: "100%", accentColor: "#ffe53d" }}
                />
                <div style={{ marginTop: 8 }}>
                  <PixelBar value={(energy / 5) * 100} color="var(--neon-yel)" height={10} />
                </div>
              </div>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything on your mind? (optional)"
              rows={2}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "2px solid var(--line)",
                background: "rgba(0,0,0,0.45)",
                color: "var(--ink)",
                fontFamily: "var(--f-body)",
                fontSize: 14,
                resize: "vertical",
                outline: "none",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--neon-cyan)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            />

            <button
              onClick={saveMood}
              disabled={!mood || savingMood}
              className="chunky-btn cyan"
              style={{
                marginTop: 14,
                width: "100%",
                cursor: !mood || savingMood ? "not-allowed" : "pointer",
                opacity: !mood || savingMood ? 0.45 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Sparkles className="w-4 h-4" /> SAVE CHECK-IN
            </button>

            {moodSaved && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 12,
                  border: "2px solid var(--neon-lime)",
                  background: "rgba(166,255,59,0.1)",
                  boxShadow: "0 0 16px rgba(166,255,59,0.3)",
                }}
              >
                <span className="label" style={{ color: "var(--neon-lime)" }}>
                  ✦ Buddy says
                </span>
                <p style={{ marginTop: 6, fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>
                  {moodSaved.suggestion}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pomodoro panel */}
        <div className="panel mag" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(255,62,165,0.2), transparent 60%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative" }}>
            <span className="label" style={{ color: "var(--neon-mag)" }}>
              <Coffee className="w-3 h-3" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Pomodoro · pick a power-up
            </span>

            {/* Presets */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, marginBottom: 20 }}>
              {PRESETS.map((p) => {
                const active = duration === p;
                return (
                  <button
                    key={p}
                    onClick={() => setDur(p)}
                    disabled={running}
                    className="pill"
                    style={{
                      cursor: running ? "not-allowed" : "pointer",
                      color: active ? "#170826" : "var(--neon-mag)",
                      borderColor: "var(--neon-mag)",
                      background: active ? "var(--neon-mag)" : "transparent",
                      fontWeight: 700,
                      opacity: running ? 0.55 : 1,
                    }}
                  >
                    {p} MIN
                  </button>
                );
              })}
            </div>

            {/* Big countdown */}
            <div
              style={{
                position: "relative",
                padding: "28px 20px",
                borderRadius: 20,
                background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.35) 100%)",
                border: "3px solid var(--line)",
                textAlign: "center",
                marginBottom: 18,
              }}
              className={running ? "anim-glow" : ""}
            >
              <div
                className="pixel"
                style={{
                  fontSize: 88,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: running ? "var(--neon-mag)" : completed ? "var(--neon-lime)" : "var(--neon-cyan)",
                  textShadow: running
                    ? "0 0 30px rgba(255,62,165,0.7)"
                    : completed
                    ? "0 0 30px rgba(166,255,59,0.7)"
                    : "0 0 30px rgba(39,224,255,0.6)",
                  letterSpacing: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {mm}:{ss}
              </div>

              <div style={{ marginTop: 10 }}>
                <span
                  className="label"
                  style={{
                    color: running
                      ? "var(--neon-mag)"
                      : completed
                      ? "var(--neon-lime)"
                      : "var(--neon-cyan)",
                  }}
                >
                  {running ? "▶ IN FOCUS" : completed ? "✓ COMPLETE" : "⏸ READY"}
                </span>
              </div>

              <div style={{ marginTop: 14, padding: "0 10px" }}>
                <PixelBar
                  value={pct}
                  color={running ? "var(--neon-mag)" : completed ? "var(--neon-lime)" : "var(--neon-cyan)"}
                  height={12}
                />
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => setRunning((r) => !r)}
                disabled={secondsLeft === 0}
                className={`chunky-btn ${running ? "yel" : "lime"}`}
                style={{
                  flex: 1,
                  minWidth: 180,
                  cursor: secondsLeft === 0 ? "not-allowed" : "pointer",
                  opacity: secondsLeft === 0 ? 0.45 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {running ? (
                  <>
                    <Pause className="w-4 h-4" /> PAUSE
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> START
                  </>
                )}
              </button>
              <button
                onClick={() => setDur(duration)}
                className="pill"
                style={{
                  cursor: "pointer",
                  color: "var(--neon-yel)",
                  borderColor: "var(--neon-yel)",
                  background: "transparent",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RotateCcw className="w-4 h-4" /> RESET
              </button>
            </div>

            {completed && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 12,
                  border: "2px solid var(--neon-lime)",
                  background: "rgba(166,255,59,0.1)",
                  color: "var(--neon-lime)",
                  fontSize: 14,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  boxShadow: "0 0 18px rgba(166,255,59,0.4)",
                }}
              >
                <span style={{ fontSize: 18 }}>🎉</span>
                <span>{completed}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}
