"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

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
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notOnboarded, setNotOnboarded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotOnboarded(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const res = await fetch("/api/proxy/api/parent/digest", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      setDigest(await res.json());
    } else if (res.status === 404) {
      // Account exists (the parent signed in with the student's login) but
      // the student hasn't finished onboarding yet — there's no digest to
      // show. Render a helpful empty state instead of crashing.
      setNotOnboarded(true);
    }
    setLoading(false);
  }, []);

  // Parent digest needs an authenticated student account behind it. If a
  // visitor lands here straight from the "Parent / Teacher" landing-page
  // pill without being signed in, send them to /login instead of rendering
  // a blank/null page.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

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
      <div
        className="arcade-root"
        data-grade="68"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ink)",
        }}
      >
        Loading…
      </div>
    );
  }

  // Parent sign-in model: parents use the same email + password as their
  // child. If that account hasn't completed onboarding yet, there is no
  // digest to render — point them at the onboarding wizard.
  if (notOnboarded) {
    return (
      <ArcadeShell active="Dashboard">
        <div
          style={{
            maxWidth: 560,
            margin: "80px auto 0",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 48 }}>📬</div>
          <h1 className="h-display" style={{ fontSize: 28, margin: 0 }}>
            No weekly digest yet
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 14, margin: 0 }}>
            Parents sign in with the same email and password as their child.
            The weekly summary appears here once the student finishes
            onboarding and starts learning.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
            <Link href="/onboarding" className="chunky-btn cyan" style={{ textDecoration: "none" }}>
              ▶ Finish onboarding
            </Link>
            <Link href="/dashboard" className="pill" style={{ textDecoration: "none" }}>
              Go to dashboard
            </Link>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  if (!digest) return null;

  const masteryValue =
    digest.weekly_avg_score != null ? digest.weekly_avg_score : 0;

  return (
    <ArcadeShell active="Dashboard">
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="label" style={{ fontSize: 11, color: "var(--neon-cyan)" }}>
            Parent view · signed in with {digest.student_name}&rsquo;s account
          </span>
          <h1 className="h-display" style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>
            {digest.student_name}
            <span style={{ color: "var(--neon-yel)" }}> — Grade {digest.grade}</span>
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0 }}>
            Week ending {digest.week_ending}
          </p>
        </header>

        {/* Stat tiles */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 14,
          }}
        >
          <StatTile
            label="XP"
            value={digest.xp.toLocaleString()}
            color="var(--neon-yel)"
            icon="✦"
          />
          <StatTile
            label="Streak"
            value={`${digest.streak_days}d`}
            color="var(--neon-ora)"
            icon="⚡"
            sub={`best ${digest.longest_streak}d`}
          />
          <StatTile
            label="Quiz avg"
            value={
              digest.weekly_avg_score != null
                ? `${digest.weekly_avg_score}%`
                : "—"
            }
            color="var(--neon-lime)"
            icon="◎"
            sub={`${digest.weekly_quizzes} this week`}
          />
          <StatTile
            label="Level"
            value={`L${digest.level}`}
            color="var(--neon-cyan)"
            icon="★"
            sub={`${digest.chapters_completed_recent.length} chapters`}
          />
        </section>

        {/* Mastery pixel bar */}
        <section className="panel" style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span className="label" style={{ fontSize: 11 }}>
              Weekly mastery
            </span>
            <span
              className="h-display"
              style={{ fontSize: 14, color: "var(--neon-lime)" }}
            >
              {digest.weekly_avg_score != null
                ? `${digest.weekly_avg_score}%`
                : "no quizzes"}
            </span>
          </div>
          <PixelBar value={masteryValue} color="var(--neon-lime)" height={14} />
        </section>

        {/* Digest card — yellow panel */}
        <section className="panel yel" style={{ padding: 22, position: "relative" }}>
          <div className="scanline" />
          <div
            className="label"
            style={{
              fontSize: 11,
              color: "#170826",
              marginBottom: 10,
              letterSpacing: 0.8,
            }}
          >
            ✦ This week, in a paragraph
          </div>
          <p
            style={{
              color: "#170826",
              fontFamily: "var(--f-body)",
              fontSize: 14,
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-wrap",
              fontWeight: 500,
            }}
          >
            {digest.parent_note}
          </p>
        </section>

        {/* Strengths + Focus areas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 14,
          }}
        >
          <section className="panel" style={{ padding: 18 }}>
            <div
              className="label"
              style={{
                fontSize: 11,
                color: "var(--neon-lime)",
                marginBottom: 12,
              }}
            >
              ▲ Strengths
            </div>
            {digest.top_strengths.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: 0 }}>
                Nothing notable yet.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {digest.top_strengths.map((s) => (
                  <li
                    key={s}
                    style={{ fontSize: 13, color: "var(--ink)", fontFamily: "var(--f-body)" }}
                  >
                    <span style={{ color: "var(--neon-lime)" }}>◆ </span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel" style={{ padding: 18 }}>
            <div
              className="label"
              style={{
                fontSize: 11,
                color: "var(--neon-mag)",
                marginBottom: 12,
              }}
            >
              ▼ Focus areas
            </div>
            {digest.top_focus_areas.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: 0 }}>
                No recurring weak spots.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {digest.top_focus_areas.map((s) => (
                  <li
                    key={s}
                    style={{ fontSize: 13, color: "var(--ink)", fontFamily: "var(--f-body)" }}
                  >
                    <span style={{ color: "var(--neon-mag)" }}>◆ </span>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Recent activity */}
        <section className="panel" style={{ padding: 18 }}>
          <div
            className="label"
            style={{
              fontSize: 11,
              color: "var(--neon-cyan)",
              marginBottom: 12,
            }}
          >
            ◉ Recently completed
          </div>
          {digest.chapters_completed_recent.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", margin: 0 }}>
              No chapters completed in this window.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {digest.chapters_completed_recent.map((c) => (
                <li
                  key={c.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(0,0,0,0.3)",
                    border: "2px solid var(--line-soft)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--ink)",
                      fontFamily: "var(--f-body)",
                    }}
                  >
                    {c.title}
                  </span>
                  <span
                    className="pill"
                    style={{ fontSize: 10, padding: "4px 10px" }}
                  >
                    {c.subject}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Flashcards mini-card */}
        <section className="panel cyan" style={{ padding: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div className="label" style={{ fontSize: 11, marginBottom: 6 }}>
                ◈ Flashcards
              </div>
              <div
                className="h-display"
                style={{ fontSize: 22, color: "var(--neon-cyan)" }}
              >
                {digest.flashcards.reviewed_this_week}
                <span
                  style={{
                    color: "var(--ink-dim)",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {" "}
                  / {digest.flashcards.total} reviewed
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={copyEmailDraft}
            className="chunky-btn cyan"
            style={{
              flex: 1,
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ✉ Open email draft
          </button>
          <Link
            href="/dashboard"
            className="chunky-btn"
            style={{
              flex: 1,
              justifyContent: "center",
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            ◀ Back to dashboard
          </Link>
        </div>
      </div>
    </ArcadeShell>
  );
}

function StatTile({
  label,
  value,
  color,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
  sub?: string;
}) {
  return (
    <div
      className="panel"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            color,
            fontSize: 16,
            textShadow: `0 0 10px ${color}`,
          }}
        >
          {icon}
        </span>
        <span className="label" style={{ fontSize: 10 }}>
          {label}
        </span>
      </div>
      <div
        className="h-display"
        style={{ fontSize: 24, color, lineHeight: 1 }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "var(--ink-mute)" }}>{sub}</div>
      )}
    </div>
  );
}
