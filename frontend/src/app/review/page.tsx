"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

interface Flashcard {
  id: string;
  chapter_id: string;
  front: string;
  back: string;
  hint: string | null;
  due_date: string | null;
  interval_days: number;
  repetitions: number;
  ease_factor: number;
}

interface DeckSummary {
  total: number;
  due_today: number;
  new: number;
  learning: number;
  mature: number;
}

interface DueResponse {
  cards: Flashcard[];
  summary: DeckSummary;
}

interface ReviewResponse {
  card: Flashcard;
  xp_awarded: number;
  new_xp: number | null;
  new_level: number | null;
}

const QUALITY_BUTTONS: Array<{
  q: 1 | 2 | 3 | 4;
  label: string;
  hint: string;
  variant: "mag" | "yel" | "cyan" | "lime";
  glow: string;
}> = [
  { q: 1, label: "Again", hint: "<1m", variant: "mag", glow: "var(--neon-mag)" },
  { q: 2, label: "Hard", hint: "soon", variant: "yel", glow: "var(--neon-yel)" },
  { q: 3, label: "Good", hint: "later", variant: "cyan", glow: "var(--neon-cyan)" },
  { q: 4, label: "Easy", hint: "much later", variant: "lime", glow: "var(--neon-lime)" },
];

export default function ReviewPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [summary, setSummary] = useState<DeckSummary | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCard = cards[index];
  const finished = useMemo(() => cards.length > 0 && index >= cards.length, [cards, index]);

  const authHeader = useCallback(async (): Promise<HeadersInit | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const fetchDue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeader();
      if (!headers) {
        setError("Please sign in.");
        return;
      }
      const res = await fetch("/api/proxy/api/flashcards/due?limit=50", { headers });
      if (!res.ok) {
        setError("Failed to load cards.");
        return;
      }
      const data: DueResponse = await res.json();
      setCards(data.cards);
      setSummary(data.summary);
      setIndex(0);
      setRevealed(false);
      setXpEarned(0);
      setReviewedCount(0);
    } catch (e) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    if (user && !authLoading) fetchDue();
  }, [user, authLoading, fetchDue]);

  async function rateCard(quality: 1 | 2 | 3 | 4) {
    if (!currentCard || reviewing) return;
    setReviewing(true);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(`/api/proxy/api/flashcards/${currentCard.id}/review`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ quality }),
      });
      if (res.ok) {
        const data: ReviewResponse = await res.json();
        setXpEarned((x) => x + (data.xp_awarded || 0));
      }
    } catch {
      /* swallow — keep moving */
    } finally {
      setReviewing(false);
      setReviewedCount((c) => c + 1);
      setRevealed(false);
      setIndex((i) => i + 1);
    }
  }

  async function generateMissing() {
    setGenerating(true);
    setError(null);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch("/api/proxy/api/flashcards/generate-missing", {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        let detail = "";
        try {
          const body = await res.text();
          detail = body?.slice(0, 200) ?? "";
        } catch {}
        setError(`Failed to queue generation (${res.status})${detail ? `: ${detail}` : ""}`);
        return;
      }
      const data = await res.json();
      if ((data?.queued_chapters ?? 0) === 0) {
        setError("No completed chapters to build cards from yet — finish a lesson first.");
      } else {
        setError(`Generating cards for ${data.queued_chapters} chapter(s) — check back in a minute.`);
      }
    } catch {
      setError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  // Keyboard shortcuts: space to reveal, 1-4 to rate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!currentCard || finished) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        return;
      }
      if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        rateCard(Number(e.key) as 1 | 2 | 3 | 4);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentCard, finished, revealed]);

  if (authLoading || loading) {
    return (
      <ArcadeShell active="Practice" pixels={10}>
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
            <span className="label" style={{ color: "var(--neon-cyan)" }}>SHUFFLING DECK…</span>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  if (!user) {
    return (
      <ArcadeShell active="Practice" pixels={10}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
          <div className="panel cyan" style={{ padding: 28, maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }} className="anim-bop">🗝</div>
            <h2 className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>
              Sign in to drill
            </h2>
            <p style={{ color: "var(--ink-dim)", fontSize: 13, marginBottom: 16 }}>
              Your flashcard deck is locked behind the login gate.
            </p>
            <Link href="/login" className="chunky-btn cyan" style={{ textDecoration: "none", display: "inline-block" }}>
              ▶ ENTER
            </Link>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  const totalThisSession = cards.length;
  const pct = totalThisSession > 0 ? Math.round((reviewedCount / totalThisSession) * 100) : 0;

  return (
    <ArcadeShell active="Practice" pixels={12}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span className="label" style={{ color: "var(--neon-yel)" }}>✦ DAILY DRILLS</span>
        <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 4px" }}>
          Memory <span style={{ color: "var(--neon-cyan)" }}>Arena</span>
        </h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Spaced repetition keeps what you&rsquo;ve learned from fading.
        </p>
      </div>

      {/* Deck summary stats */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div className="panel mag" style={{ padding: 14, textAlign: "center" }}>
            <div className="label">Due</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-mag)", marginTop: 6 }}>
              {summary.due_today}
            </div>
          </div>
          <div className="panel cyan" style={{ padding: 14, textAlign: "center" }}>
            <div className="label">New</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-cyan)", marginTop: 6 }}>
              {summary.new}
            </div>
          </div>
          <div className="panel" style={{ padding: 14, textAlign: "center" }}>
            <div className="label">Mature</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-lime)", marginTop: 6 }}>
              {summary.mature}
            </div>
          </div>
          <div className="panel yel" style={{ padding: 14, textAlign: "center" }}>
            <div className="label">Total</div>
            <div className="h-display" style={{ fontSize: 26, color: "var(--neon-yel)", marginTop: 6 }}>
              {summary.total}
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="panel"
          style={{
            padding: 12,
            marginBottom: 16,
            borderColor: "var(--neon-mag)",
            color: "var(--ink)",
            fontSize: 13,
          }}
        >
          <span className="label" style={{ color: "var(--neon-mag)", marginRight: 8 }}>!</span>
          {error}
        </div>
      )}

      {/* Empty state */}
      {cards.length === 0 && !finished && (
        <div className="panel cyan" style={{ padding: 32, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 8 }} className="anim-float">🎉</div>
          <span className="label" style={{ color: "var(--neon-lime)" }}>ALL CLEAR</span>
          <h2 className="h-display" style={{ fontSize: 28, margin: "8px 0" }}>
            Nothing due right now
          </h2>
          <p style={{ color: "var(--ink-dim)", fontSize: 14, maxWidth: 440, margin: "0 auto 20px" }}>
            Cards build up as you complete chapters. Want to backfill cards for chapters you&rsquo;ve already finished?
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={generateMissing}
              disabled={generating}
              className="chunky-btn cyan"
              style={{ cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1 }}
            >
              {generating ? "◴ QUEUING…" : "✦ BUILD MISSING CARDS"}
            </button>
            <Link
              href="/learn"
              className="chunky-btn"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              ▶ OPEN A LESSON
            </Link>
          </div>
        </div>
      )}

      {/* Finished state */}
      {finished && (
        <div className="panel yel" style={{ padding: 32, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div className="scanline" />
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 8 }} className="anim-bop">🏆</div>
          <span className="label" style={{ color: "var(--neon-yel)" }}>SESSION COMPLETE</span>
          <h2 className="h-display" style={{ fontSize: 30, margin: "8px 0 6px" }}>
            Drills cleared!
          </h2>
          <p style={{ color: "var(--ink-dim)", fontSize: 14, marginBottom: 4 }}>
            Reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}.
          </p>
          <div
            className="h-display"
            style={{ fontSize: 22, color: "var(--neon-lime)", marginBottom: 20 }}
          >
            +{xpEarned} XP
          </div>
          <button
            onClick={fetchDue}
            className="chunky-btn yel"
            style={{ cursor: "pointer" }}
          >
            ↻ CHECK FOR MORE
          </button>
        </div>
      )}

      {/* Card */}
      {currentCard && !finished && (
        <>
          {/* Progress bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className="label" style={{ color: "var(--neon-cyan)" }}>
                Card {index + 1} / {cards.length}
              </span>
              <span className="label" style={{ color: "var(--neon-yel)" }}>
                +{xpEarned} XP · session
              </span>
            </div>
            <PixelBar value={pct} color="var(--neon-cyan)" />
          </div>

          <div
            className="panel cyan"
            style={{
              padding: 32,
              minHeight: 340,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div className="scanline" />

            <span className="label" style={{ color: "var(--neon-mag)" }}>
              ◆ QUESTION
            </span>
            <div
              className="h-display"
              style={{
                fontSize: 28,
                lineHeight: 1.3,
                marginTop: 12,
                color: "var(--ink)",
              }}
            >
              {currentCard.front}
            </div>

            {currentCard.hint && !revealed && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255,229,61,0.08)",
                  border: "2px solid var(--neon-yel)",
                  color: "var(--neon-yel)",
                  fontSize: 13,
                  fontStyle: "italic",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>💡</span>
                <span>Hint: {currentCard.hint}</span>
              </div>
            )}

            {revealed && (
              <>
                <div
                  style={{
                    margin: "20px 0",
                    height: 2,
                    background: "linear-gradient(90deg, transparent, var(--neon-lime), transparent)",
                  }}
                />
                <span className="label" style={{ color: "var(--neon-lime)" }}>
                  ✓ ANSWER
                </span>
                <div
                  style={{
                    fontSize: 16,
                    lineHeight: 1.6,
                    marginTop: 10,
                    color: "var(--ink-dim)",
                    whiteSpace: "pre-wrap",
                    fontFamily: "var(--f-body)",
                  }}
                >
                  {currentCard.back}
                </div>
              </>
            )}

            <div style={{ marginTop: "auto", paddingTop: 28, position: "relative" }}>
              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="chunky-btn cyan"
                  style={{ width: "100%", cursor: "pointer" }}
                >
                  ▶ FLIP CARD (Space)
                </button>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {QUALITY_BUTTONS.map((b) => (
                    <button
                      key={b.q}
                      onClick={() => rateCard(b.q)}
                      disabled={reviewing}
                      className={`chunky-btn ${b.variant}`}
                      style={{
                        cursor: reviewing ? "not-allowed" : "pointer",
                        opacity: reviewing ? 0.5 : 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        padding: "12px 6px",
                      }}
                    >
                      <span>{b.label}</span>
                      <span
                        style={{
                          fontSize: 9,
                          fontFamily: "var(--f-pixel)",
                          opacity: 0.75,
                          fontWeight: 400,
                        }}
                      >
                        {b.q} · {b.hint}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 14,
              fontSize: 11,
              fontFamily: "var(--f-pixel)",
              color: "var(--ink-mute)",
              letterSpacing: 0.5,
            }}
          >
            TIP: SPACE TO FLIP · 1–4 TO GRADE
          </p>
        </>
      )}
    </ArcadeShell>
  );
}
