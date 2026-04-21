"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Layers3, PartyPopper, CheckCircle2, Lightbulb } from "lucide-react";

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
  bg: string;
  hover: string;
}> = [
  { q: 1, label: "Again", hint: "<1m", bg: "bg-[var(--red)]", hover: "hover:opacity-90" },
  { q: 2, label: "Hard", hint: "soon", bg: "bg-[var(--subject-english)]", hover: "hover:opacity-90" },
  { q: 3, label: "Good", hint: "later", bg: "bg-[var(--subject-science)]", hover: "hover:opacity-90" },
  { q: 4, label: "Easy", hint: "much later", bg: "bg-[var(--brand-blue)]", hover: "hover:opacity-90" },
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <div className="text-[var(--text-muted)] text-sm">Loading your deck…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-card text-center max-w-sm">
          <p className="text-[var(--text-body)] mb-4">Sign in to review your flashcards.</p>
          <Link href="/login" className="text-[var(--brand-blue)] font-semibold">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Layers3 className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
              Review
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Spaced repetition keeps what you&rsquo;ve learned from fading.
            </p>
          </div>
          {summary && (
            <div className="hidden sm:flex gap-3">
              <Stat label="Due" value={summary.due_today} accent="text-[var(--red)]" />
              <Stat label="New" value={summary.new} accent="text-[var(--brand-blue)]" />
              <Stat label="Mature" value={summary.mature} accent="text-[var(--subject-science)]" />
              <Stat label="Total" value={summary.total} accent="text-[var(--text-primary)]" />
            </div>
          )}
        </div>

        {error && (
          <div className="bg-white border border-[var(--border)] rounded-xl p-3 mb-4 text-sm text-[var(--text-body)]">
            {error}
          </div>
        )}

        {/* Empty state */}
        {cards.length === 0 && !finished && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-card text-center">
            <PartyPopper className="w-14 h-14 mx-auto mb-3 text-[var(--subject-english)]" strokeWidth={1.5} />
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">
              Nothing due right now
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Cards build up automatically as you complete chapters. Want to backfill cards for chapters you&rsquo;ve already finished?
            </p>
            <button
              onClick={generateMissing}
              disabled={generating}
              className="bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-60 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
            >
              {generating ? "Queuing…" : "Build cards for completed chapters"}
            </button>
            <div className="mt-6">
              <Link href="/learn" className="text-[var(--brand-blue)] text-sm font-semibold">
                Or open a lesson →
              </Link>
            </div>
          </div>
        )}

        {/* Finished state */}
        {finished && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-card text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-[var(--subject-science)]" strokeWidth={1.5} />
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">
              Session complete
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-1">
              Reviewed {reviewedCount} card{reviewedCount === 1 ? "" : "s"}.
            </p>
            <p className="text-sm font-semibold text-[var(--brand-blue)] mb-6">
              +{xpEarned} XP
            </p>
            <button
              onClick={fetchDue}
              className="bg-[var(--brand-blue)] hover:opacity-90 text-white font-semibold rounded-xl px-5 py-2.5 text-sm"
            >
              Check for more
            </button>
          </div>
        )}

        {/* Card */}
        {currentCard && !finished && (
          <>
            <div className="flex items-center justify-between mb-3 text-xs text-[var(--text-muted)] font-semibold">
              <span>
                Card {index + 1} of {cards.length}
              </span>
              <span>+{xpEarned} XP this session</span>
            </div>
            <div className="bg-white border border-[var(--border)] rounded-2xl shadow-card p-8 sm:p-10 min-h-[320px] flex flex-col">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-3">
                Question
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)] leading-snug">
                {currentCard.front}
              </div>
              {currentCard.hint && !revealed && (
                <div className="mt-4 text-sm text-[var(--text-muted)] italic flex items-start gap-1.5">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
                  <span>Hint: {currentCard.hint}</span>
                </div>
              )}

              {revealed && (
                <>
                  <div className="my-6 border-t border-[var(--border)]" />
                  <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-3">
                    Answer
                  </div>
                  <div className="text-lg text-[var(--text-body)] leading-relaxed whitespace-pre-wrap">
                    {currentCard.back}
                  </div>
                </>
              )}

              <div className="mt-auto pt-8">
                {!revealed ? (
                  <button
                    onClick={() => setRevealed(true)}
                    className="w-full bg-[var(--brand-blue)] hover:opacity-90 text-white font-semibold rounded-xl py-3 text-sm"
                  >
                    Show answer (Space)
                  </button>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {QUALITY_BUTTONS.map((b) => (
                      <button
                        key={b.q}
                        onClick={() => rateCard(b.q)}
                        disabled={reviewing}
                        className={cn(
                          "rounded-xl py-3 px-2 text-white font-semibold text-sm transition-opacity disabled:opacity-50 flex flex-col items-center",
                          b.bg,
                          b.hover,
                        )}
                      >
                        <span>{b.label}</span>
                        <span className="text-[10px] opacity-80 font-normal">{b.q} · {b.hint}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-[var(--text-muted)] mt-3">
              Tip: Space to reveal, then 1–4 to rate.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl px-3 py-2 text-center min-w-[64px]">
      <div className={cn("text-lg font-extrabold", accent)}>{value}</div>
      <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">{label}</div>
    </div>
  );
}
