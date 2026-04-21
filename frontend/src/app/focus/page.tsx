"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

type Mood = "happy" | "calm" | "focused" | "tired" | "stressed" | "stuck";

const MOODS: { id: Mood; label: string; emoji: string; color: string }[] = [
  { id: "happy", label: "Happy", emoji: "😊", color: "var(--subject-english)" },
  { id: "calm", label: "Calm", emoji: "😌", color: "var(--subject-science)" },
  { id: "focused", label: "Focused", emoji: "🎯", color: "var(--brand-blue)" },
  { id: "tired", label: "Tired", emoji: "😴", color: "var(--text-muted)" },
  { id: "stressed", label: "Stressed", emoji: "😣", color: "var(--red)" },
  { id: "stuck", label: "Stuck", emoji: "🤔", color: "var(--subject-coding)" },
];

const ENERGY_ICONS = [BatteryLow, BatteryLow, BatteryMedium, Battery, BatteryFull];

const PRESETS = [25, 15, 50];

export default function FocusPage() {
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
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <HeartPulse className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Focus & wellbeing
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Quick mood check, then a Pomodoro to lock in.
          </p>
        </header>

        {/* Mood card */}
        <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
            How are you feeling?
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={cn(
                  "px-3 py-3 rounded-xl border-2 transition-all text-center",
                  mood === m.id
                    ? "border-[var(--brand-blue)] bg-[var(--brand-blue-soft)]"
                    : "border-[var(--border)] hover:border-[var(--brand-blue)]",
                )}
              >
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-xs font-bold text-[var(--text-body)]">{m.label}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-3">
            <EnergyIcon className="w-5 h-5 text-[var(--brand-blue)]" />
            <div className="flex-1">
              <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] mb-1">
                <span>Energy</span>
                <span>{energy}/5</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={energy}
                onChange={(e) => setEnergy(+e.target.value)}
                className="w-full accent-[var(--brand-blue)]"
              />
            </div>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything on your mind? (optional)"
            rows={2}
            className="w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-blue)]"
          />

          <button
            onClick={saveMood}
            disabled={!mood || savingMood}
            className="mt-3 w-full bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Save check-in
          </button>

          {moodSaved && (
            <div className="mt-3 bg-[var(--brand-blue-soft)] border-l-4 border-[var(--brand-blue)] rounded-r-xl px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--brand-blue)] mb-0.5">
                Buddy says
              </div>
              <p className="text-sm text-[var(--text-body)]">{moodSaved.suggestion}</p>
            </div>
          )}
        </section>

        {/* Pomodoro */}
        <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
            <Coffee className="w-4 h-4" /> Pomodoro
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setDur(p)}
                disabled={running}
                className={cn(
                  "px-4 py-1.5 rounded-full border text-xs font-bold transition-colors",
                  duration === p
                    ? "bg-[var(--brand-blue)] border-[var(--brand-blue)] text-white"
                    : "bg-white border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand-blue)]",
                )}
              >
                {p} min
              </button>
            ))}
          </div>

          {/* Timer ring */}
          <div className="relative w-44 h-44 mx-auto mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke="var(--brand-blue)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 282.7} 282.7`}
                style={{ transition: "stroke-dasharray 0.4s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {mm}:{ss}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mt-1">
                {running ? "in focus" : completed ? "complete!" : "ready"}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRunning((r) => !r)}
              disabled={secondsLeft === 0}
              className="flex-1 bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
            </button>
            <button
              onClick={() => setDur(duration)}
              className="bg-white border border-[var(--border)] hover:bg-[var(--bg-deep)] text-[var(--text-body)] font-semibold rounded-xl py-2.5 px-4 text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {completed && (
            <div className="mt-3 bg-[var(--brand-blue-soft)] border border-[var(--brand-blue)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-body)]">
              {completed}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
