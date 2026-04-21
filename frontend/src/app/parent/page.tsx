"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  Flame,
  GraduationCap,
  Mail,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";

interface Digest {
  student_name: string;
  grade: string;
  week_ending: string;
  xp: number;
  level: number;
  streak_days: number;
  longest_streak: number;
  chapters_completed_recent: { title: string; subject: string }[];
  weekly_quizzes: number;
  weekly_avg_score: number | null;
  flashcards: { total: number; reviewed_this_week: number };
  top_strengths: string[];
  top_focus_areas: string[];
  parent_note: string;
}

export default function ParentDigestPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/proxy/api/parent/digest", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setDigest(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !authLoading) load();
  }, [user, authLoading, load]);

  function copyEmailDraft() {
    if (!digest) return;
    const body = encodeURIComponent(
      `Weekly LearnOS update — week ending ${digest.week_ending}\n\n` +
        `${digest.parent_note}\n\n` +
        `Stats:\n` +
        `• Chapters completed (recent): ${digest.chapters_completed_recent.map((c) => c.title).join(", ") || "—"}\n` +
        `• Quizzes this week: ${digest.weekly_quizzes} (avg ${digest.weekly_avg_score ?? "—"}%)\n` +
        `• Flashcards reviewed: ${digest.flashcards.reviewed_this_week} of ${digest.flashcards.total}\n` +
        `• Streak: ${digest.streak_days} days (longest ${digest.longest_streak})\n` +
        `• Strengths: ${digest.top_strengths.join(", ") || "—"}\n` +
        `• Focus areas: ${digest.top_focus_areas.join(", ") || "—"}\n`,
    );
    window.location.href = `mailto:?subject=${encodeURIComponent(
      `LearnOS weekly update for ${digest.student_name}`,
    )}&body=${body}`;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] text-sm text-[var(--text-muted)]">
        Building this week&rsquo;s digest…
      </div>
    );
  }
  if (!digest) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <header>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Mail className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Parent digest
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Week ending {digest.week_ending} — {digest.student_name}, Grade {digest.grade}
          </p>
        </header>

        {/* AI note */}
        <section className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
            <Sparkles className="w-4 h-4 text-[var(--brand-blue)]" />
            This week, in a paragraph
          </div>
          <p className="text-[var(--text-body)] leading-relaxed whitespace-pre-wrap">
            {digest.parent_note}
          </p>
        </section>

        {/* Stat strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<BookOpenCheck className="w-4 h-4" />} label="Chapters" value={digest.chapters_completed_recent.length} accent="text-[var(--brand-blue)]" />
          <Stat icon={<TrendingUp className="w-4 h-4" />} label="Quiz avg" value={digest.weekly_avg_score != null ? `${digest.weekly_avg_score}%` : "—"} accent="text-[var(--subject-science)]" />
          <Stat icon={<GraduationCap className="w-4 h-4" />} label="Level" value={digest.level} accent="text-[var(--subject-coding)]" />
          <Stat icon={<Flame className="w-4 h-4" />} label="Streak" value={`${digest.streak_days}d`} accent="text-[var(--subject-english)]" />
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strengths */}
          <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--subject-science)]" />
              Strengths
            </div>
            {digest.top_strengths.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Nothing notable yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {digest.top_strengths.map((s) => (
                  <li key={s} className="text-sm text-[var(--text-body)]">• {s}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Focus */}
          <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
              <TrendingDown className="w-4 h-4 text-[var(--subject-english)]" />
              Focus areas
            </div>
            {digest.top_focus_areas.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No recurring weak spots.</p>
            ) : (
              <ul className="space-y-1.5">
                {digest.top_focus_areas.map((s) => (
                  <li key={s} className="text-sm text-[var(--text-body)]">• {s}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Recent chapters */}
        <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
          <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-3">
            Recently completed
          </div>
          {digest.chapters_completed_recent.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No chapters completed in this window.</p>
          ) : (
            <ul className="space-y-2">
              {digest.chapters_completed_recent.map((c) => (
                <li
                  key={c.title}
                  className="flex items-center justify-between bg-[var(--bg-deep)] rounded-xl px-3 py-2"
                >
                  <span className="text-sm text-[var(--text-body)]">{c.title}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
                    {c.subject}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex gap-3">
          <button
            onClick={copyEmailDraft}
            className="flex-1 bg-[var(--brand-blue)] hover:opacity-90 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" /> Open email draft
          </button>
          <Link
            href="/dashboard"
            className="flex-1 bg-white border border-[var(--border)] hover:bg-[var(--bg-deep)] text-[var(--text-body)] font-semibold rounded-xl py-3 text-sm text-center"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: JSX.Element;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card">
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-extrabold text-[var(--text-primary)] mt-1.5">{value}</div>
    </div>
  );
}
