"use client";

import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArcadeShell, PixelBar, Byte } from "@/components/arcade";

interface Profile {
  name: string;
  xp: number;
  level: number;
  streak_days: number;
  longest_streak?: number;
  xp_into_level?: number;
  xp_to_next_level?: number;
  streak_freezes_remaining?: number;
  onboarding_completed: boolean;
}

interface SubjectSummary {
  id: string;
  name: string;
  status: string;
  chapter_count: number;
  chapters_completed?: number;
  total_chapters?: number;
  progress_percent?: number;
}

interface Challenge {
  code: string;
  title: string;
  description: string;
  xp: number;
  icon: string;
  completed: boolean;
  claimed: boolean;
}

interface NextAction {
  priority: number;
  title: string;
  reason: string;
  cta_label: string;
  href: string;
  icon: string;
}

// Map a subject name to an arcade neon color + short display glyph.
const SUBJECT_ARCADE: Record<string, { color: string; icon: string }> = {
  mathematics: { color: "var(--s-math)", icon: "∑" },
  math: { color: "var(--s-math)", icon: "∑" },
  physics: { color: "var(--s-sci)", icon: "⚛" },
  chemistry: { color: "var(--s-sci)", icon: "⚗" },
  biology: { color: "var(--s-sci)", icon: "❀" },
  science: { color: "var(--s-sci)", icon: "⚛" },
  english: { color: "var(--s-eng)", icon: "A" },
  history: { color: "var(--s-his)", icon: "⚜" },
  geography: { color: "var(--s-his)", icon: "◉" },
  "computer science": { color: "var(--s-cs)", icon: "</>" },
  coding: { color: "var(--s-cs)", icon: "</>" },
  arts: { color: "var(--s-art)", icon: "✦" },
  music: { color: "var(--s-art)", icon: "♪" },
};

function arcadeStyleFor(name: string) {
  return (
    SUBJECT_ARCADE[name.toLowerCase()] ?? {
      color: "var(--neon-cyan)",
      icon: "★",
    }
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [actions, setActions] = useState<NextAction[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastLesson, setLastLesson] = useState<{
    subjectId: string;
    chapterId: string;
    chapterTitle?: string;
    subjectName?: string;
  } | null>(null);

  useEffect(() => {
    // Read the most recent lesson the student opened. It's written from the
    // lesson page when a chapter is loaded successfully.
    try {
      const raw = localStorage.getItem("learnos:last-lesson");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.subjectId && parsed?.chapterId) {
          setLastLesson({
            subjectId: parsed.subjectId,
            chapterId: parsed.chapterId,
            chapterTitle: parsed.chapterTitle,
            subjectName: parsed.subjectName,
          });
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  async function fetchData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Heartbeat first so streak/last_active reflect today before we read profile
      await fetch(`/api/proxy/api/onboarding/heartbeat`, { method: "POST", headers }).catch(() => null);

      const [profileRes, subjectsRes, challengesRes, suggestRes] = await Promise.all([
        fetch(`/api/proxy/api/onboarding/profile`, { headers }),
        fetch(`/api/proxy/api/onboarding/subjects`, { headers }),
        fetch(`/api/proxy/api/challenges/today`, { headers }),
        fetch(`/api/proxy/api/suggest/next-best-action`, { headers }),
      ]);

      if (profileRes.ok) {
        setProfile(await profileRes.json());
      } else if (profileRes.status === 404) {
        // No student row for this UUID. Two possible reasons:
        //   (a) Onboarding POST is still committing (eager commit lands in
        //       ~1s, but slow networks can take longer) — retry briefly.
        //   (b) The user genuinely hasn't onboarded yet (fresh account,
        //       re-registered account, OAuth identity new to our DB) —
        //       they shouldn't be parked on the dashboard with a banner
        //       they might miss; route them straight to the wizard.
        const started = Date.now();
        let recovered = false;
        while (Date.now() - started < 6_000) {
          await new Promise((r) => setTimeout(r, 1000));
          const retry = await fetch(`/api/proxy/api/onboarding/profile`, { headers });
          if (retry.ok) {
            setProfile(await retry.json());
            recovered = true;
            break;
          }
        }
        if (!recovered) {
          router.replace("/onboarding");
          return;
        }
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || []);
      }
      if (challengesRes.ok) {
        const data = await challengesRes.json();
        setChallenges(data.challenges || []);
      }
      if (suggestRes.ok) {
        const data = await suggestRes.json();
        setActions(data.actions || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
  }

  async function claimChallenge(code: string) {
    setClaiming(code);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/proxy/api/challenges/${code}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges((prev) => prev.map((c) => (c.code === code ? { ...c, claimed: true } : c)));
        setProfile((p) =>
          p ? { ...p, xp: data.new_xp, level: data.new_level } : p
        );
      }
    } finally {
      setClaiming(null);
    }
  }

  if (authLoading || dataLoading) {
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
          background:
            "radial-gradient(circle at 50% 40%, rgba(155,92,255,0.18), transparent 60%)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="anim-float" style={{ display: "inline-block" }}>
            <Byte size={120} />
          </div>
          <div
            className="h-display"
            style={{
              marginTop: 22,
              fontSize: 16,
              color: "var(--neon-cyan)",
              letterSpacing: "0.08em",
            }}
          >
            Byte is warming up
            <span className="byte-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
          <style jsx>{`
            .byte-dots span {
              display: inline-block;
              margin-left: 2px;
              animation: byte-dot-pulse 1.2s ease-in-out infinite;
              opacity: 0.2;
            }
            .byte-dots span:nth-child(2) { animation-delay: 0.2s; }
            .byte-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes byte-dot-pulse {
              0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
              40%           { opacity: 1;   transform: translateY(-3px); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const displayName =
    profile?.name?.split(" ")[0] ||
    user.user_metadata?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  const xpInto = profile?.xp_into_level ?? 0;
  const xpToNext = profile?.xp_to_next_level ?? 500;
  const levelPct = Math.min(100, Math.round((xpInto / (xpToNext || 500)) * 100));

  const totalChapters = subjects.reduce((sum, s) => sum + (s.chapter_count || 0), 0);
  const claimedCount = challenges.filter((c) => c.claimed).length;

  const resumeHref = lastLesson
    ? `/learn/${lastLesson.subjectId}/${lastLesson.chapterId}`
    : "/learn";

  const heroStats = [
    {
      label: "Level",
      value: String(profile?.level ?? 1),
      color: "var(--neon-cyan)",
      sub: `${xpInto} / ${xpToNext} xp`,
    },
    {
      label: "Streak",
      value: `${profile?.streak_days ?? 0}d`,
      color: "var(--neon-ora)",
      sub:
        (profile?.longest_streak ?? 0) > 0
          ? `🔥 best: ${profile?.longest_streak}`
          : "start a streak",
    },
    {
      label: "Total XP",
      value: (profile?.xp ?? 0).toLocaleString(),
      color: "var(--neon-yel)",
      sub: "earned all time",
    },
    {
      label: "Worlds",
      value: String(subjects.length),
      color: "var(--neon-lime)",
      sub: `${totalChapters} chapters`,
    },
  ];

  const topAction = actions[0];

  return (
    <ArcadeShell active="Dashboard" pixels={22}>
      {/* Onboarding banner */}
      {!profile?.onboarding_completed && (
        <div
          className="panel yel"
          style={{
            padding: 16,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 24 }}>🎯</div>
            <div>
              <div
                className="h-display"
                style={{ fontSize: 16, color: "var(--neon-yel)" }}
              >
                Finish onboarding
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                Unlock your personalized curriculum
              </div>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="chunky-btn yel"
            style={{ textDecoration: "none" }}
          >
            ▶ Continue
          </Link>
        </div>
      )}

      {/* HERO + DAILY QUEST */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Hero cabinet */}
        <div
          className="panel mag"
          style={{ padding: 28, position: "relative", overflow: "hidden" }}
        >
          <div className="scanline" />
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,62,165,0.35), transparent 70%)",
            }}
          />
          <span
            className="pill"
            style={{ color: "var(--neon-mag)", borderColor: "var(--neon-mag)" }}
          >
            <span
              className="dot"
              style={{ color: "var(--neon-mag)", background: "var(--neon-mag)" }}
            />
            {lastLesson ? "Press start to continue" : "Press start to play"}
          </span>
          <h1
            className="h-display"
            style={{
              fontSize: 56,
              margin: "18px 0 10px",
              maxWidth: 560,
              textTransform: "capitalize",
            }}
          >
            Ready, <span style={{ color: "var(--neon-cyan)" }}>{displayName}?</span>
            <br />
            Your quest awaits.
          </h1>
          <p
            style={{
              color: "var(--ink-dim)",
              maxWidth: 480,
              fontSize: 16,
              marginBottom: 22,
            }}
          >
            {lastLesson?.chapterTitle
              ? `Pick up where you left off — "${lastLesson.chapterTitle}".`
              : subjects.length > 0
                ? `You've got ${subjects.length} worlds queued and ${challenges.length - claimedCount} daily quests ready.`
                : "Fun, interactive lessons made just for you — start something new."}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={resumeHref}
              className="chunky-btn"
              style={{ textDecoration: "none" }}
              title={lastLesson?.chapterTitle ? `Resume: ${lastLesson.chapterTitle}` : undefined}
            >
              ▶ {lastLesson ? "Resume Lesson" : "Continue Learning"}
            </Link>
            <Link
              href="/practice"
              className="chunky-btn cyan"
              style={{ textDecoration: "none" }}
            >
              ⚡ Quick Quiz
            </Link>
          </div>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {heroStats.map((s) => (
              <div
                key={s.label}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  background: "rgba(0,0,0,0.35)",
                  border: "2px solid var(--line-soft)",
                }}
              >
                <div className="label">{s.label}</div>
                <div
                  className="h-display"
                  style={{
                    fontSize: 26,
                    color: s.color,
                    textShadow: `0 0 14px ${s.color}`,
                    margin: "4px 0 2px",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Quest / Next best action map */}
        <div
          className="panel cyan"
          style={{ padding: 22, position: "relative", overflow: "hidden" }}
        >
          <div className="scanline" />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
            }}
          >
            <div>
              <div className="label" style={{ color: "var(--neon-cyan)" }}>
                {topAction ? "For you, right now" : "Level Progress"}
              </div>
              <h2
                className="h-display"
                style={{ fontSize: 22, margin: "4px 0 2px", maxWidth: 260 }}
              >
                {topAction?.title ?? `Level ${profile?.level ?? 1}`}
              </h2>
              <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                {topAction?.reason ??
                  `${xpInto} / ${xpToNext} XP to next level`}
              </div>
            </div>
            <div
              className="pill"
              style={{ color: "var(--neon-yel)", borderColor: "var(--neon-yel)" }}
            >
              LVL {profile?.level ?? 1}
            </div>
          </div>

          {/* Quest path map */}
          <div
            style={{
              marginTop: 18,
              height: 220,
              borderRadius: 14,
              background:
                "linear-gradient(180deg, #0a051a 0%, #140b28 100%)",
              border: "2px solid var(--line)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="0 0 400 220"
              style={{ position: "absolute", inset: 0 }}
              preserveAspectRatio="none"
            >
              <path
                d="M 30 190 Q 90 120, 160 150 T 300 80 Q 340 50, 370 30"
                stroke="var(--neon-cyan)"
                strokeWidth="3"
                strokeDasharray="2 10"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            {(() => {
              const pctClamped = Math.max(5, Math.min(95, levelPct));
              const nodes = [
                { x: 30, y: 190, done: true, icon: "★" },
                { x: 130, y: 150, done: levelPct > 25, icon: "✦" },
                {
                  x: (pctClamped / 100) * 400,
                  y: 130,
                  done: false,
                  active: true,
                  icon: String(profile?.level ?? 1),
                },
                { x: 290, y: 90, done: false, icon: "◆" },
                { x: 370, y: 30, done: false, icon: "♛" },
              ];
              return nodes.map((n, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${(n.x / 400) * 100}%`,
                    top: `${(n.y / 220) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: n.active ? 46 : 36,
                    height: n.active ? 46 : 36,
                    borderRadius: 12,
                    background: n.done
                      ? "var(--neon-lime)"
                      : n.active
                        ? "var(--neon-cyan)"
                        : "rgba(255,255,255,0.06)",
                    border: "3px solid #170826",
                    display: "grid",
                    placeItems: "center",
                    color: "#170826",
                    fontWeight: 900,
                    fontFamily: "var(--f-display)",
                    fontSize: n.active ? 18 : 14,
                    boxShadow: n.active
                      ? "0 0 20px var(--neon-cyan), 0 4px 0 #170826"
                      : "0 4px 0 #170826",
                  }}
                  className={n.active ? "anim-bop" : ""}
                >
                  {n.icon}
                </div>
              ));
            })()}
            <div
              style={{
                position: "absolute",
                left: `${Math.max(8, Math.min(92, levelPct))}%`,
                top: "60%",
                transform: "translate(-50%, -100%)",
                fontSize: 28,
              }}
              className="anim-float"
            >
              🎮
            </div>
          </div>

          {/* XP progress bar */}
          <div style={{ marginTop: 14 }}>
            <PixelBar value={levelPct} color="var(--neon-cyan)" height={10} />
          </div>

          <Link
            href={topAction?.href ?? resumeHref}
            className="chunky-btn yel"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: 18,
              textDecoration: "none",
            }}
          >
            ▶ {topAction?.cta_label ?? "Enter Quest"}
          </Link>
        </div>
      </section>

      {/* NEXT-BEST-ACTION row (secondary actions) */}
      {actions.length > 1 && (
        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <h2 className="h-display" style={{ fontSize: 20 }}>
              Power moves
            </h2>
            <span className="label">recommended for you</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(actions.length - 1, 3)}, 1fr)`,
              gap: 14,
            }}
          >
            {actions.slice(1, 4).map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="panel"
                style={{
                  padding: 18,
                  textDecoration: "none",
                  color: "var(--ink)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(39,224,255,0.25), transparent 70%)",
                  }}
                />
                <div
                  className="label"
                  style={{ color: "var(--neon-cyan)", position: "relative" }}
                >
                  {a.icon}
                </div>
                <div
                  className="h-display"
                  style={{ fontSize: 16, margin: "6px 0 6px", position: "relative" }}
                >
                  {a.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-mute)",
                    marginBottom: 10,
                    position: "relative",
                  }}
                >
                  {a.reason}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--neon-yel)",
                    fontFamily: "var(--f-display)",
                    fontWeight: 800,
                    position: "relative",
                  }}
                >
                  {a.cta_label} →
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* SUBJECTS / WORLDS */}
      <section style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2 className="h-display" style={{ fontSize: 22 }}>
            Your Worlds
          </h2>
          <Link
            href="/learn"
            className="label"
            style={{ color: "var(--neon-cyan)", textDecoration: "none" }}
          >
            View all →
          </Link>
        </div>

        {subjects.length === 0 ? (
          <div
            className="panel"
            style={{ padding: 40, textAlign: "center" }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <div
              className="h-display"
              style={{ fontSize: 18, marginBottom: 6 }}
            >
              No worlds unlocked yet
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-mute)",
                marginBottom: 18,
              }}
            >
              Complete onboarding to generate your curriculum.
            </div>
            <Link
              href="/onboarding"
              className="chunky-btn yel"
              style={{ textDecoration: "none" }}
            >
              ▶ Start onboarding
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            {subjects.map((s) => {
              const arcade = arcadeStyleFor(s.name);
              // Prefer the real completion ratio from the backend (which
              // computes chapters_completed / total_chapters). Fall back to
              // a coarse status ladder only if the field is missing —
              // otherwise every "in_progress" world showed the same 35% bar.
              const total = s.total_chapters ?? s.chapter_count ?? 0;
              const completed = s.chapters_completed ?? 0;
              const realPct =
                typeof s.progress_percent === "number"
                  ? s.progress_percent
                  : total > 0
                    ? Math.round((completed / total) * 100)
                    : null;
              const progressPct =
                realPct !== null
                  ? realPct
                  : s.status === "completed"
                    ? 100
                    : s.status === "in_progress"
                      ? 35
                      : 0;
              return (
                <Link
                  key={s.id}
                  href={`/learn/${s.id}`}
                  className="panel"
                  style={{
                    padding: 18,
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "var(--ink)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: `radial-gradient(circle, ${arcade.color}33, transparent 70%)`,
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                      marginBottom: 14,
                      position: "relative",
                    }}
                  >
                    <div
                      className="subj-chip"
                      style={{
                        color: arcade.color,
                        width: 64,
                        height: 64,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--f-display)",
                          fontWeight: 900,
                          fontSize: 26,
                          color: arcade.color,
                          textShadow: `0 0 10px ${arcade.color}`,
                        }}
                      >
                        {arcade.icon}
                      </span>
                    </div>
                    <div>
                      <div
                        className="h-display"
                        style={{ fontSize: 18, textTransform: "capitalize" }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "var(--ink-mute)" }}
                      >
                        {s.chapter_count}{" "}
                        {s.chapter_count === 1 ? "chapter" : "chapters"}
                      </div>
                    </div>
                  </div>
                  <PixelBar value={progressPct} color={arcade.color} height={12} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 10,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--ink-mute)",
                        textTransform: "capitalize",
                      }}
                    >
                      {s.status.replace("_", " ")}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: arcade.color,
                        fontFamily: "var(--f-display)",
                        fontWeight: 800,
                      }}
                    >
                      PLAY →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* DAILY CHALLENGES + POWER-UPS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div className="panel" style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h2 className="h-display" style={{ fontSize: 20 }}>
              Daily Challenges
            </h2>
            <span
              className="pill"
              style={{
                color: "var(--neon-yel)",
                borderColor: "var(--neon-yel)",
              }}
            >
              {claimedCount} / {challenges.length || 0} claimed
            </span>
          </div>

          {challenges.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--ink-mute)",
                fontSize: 13,
              }}
            >
              No challenges today — come back tomorrow for a fresh set.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(challenges.length, 3)}, 1fr)`,
                gap: 12,
              }}
            >
              {challenges.map((c) => {
                const claimable = c.completed && !c.claimed;
                return (
                  <div
                    key={c.code}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      background: c.claimed
                        ? "rgba(166,255,59,0.08)"
                        : claimable
                          ? "rgba(255,229,61,0.08)"
                          : "rgba(0,0,0,0.3)",
                      border:
                        "2px solid " +
                        (c.claimed
                          ? "var(--neon-lime)"
                          : claimable
                            ? "var(--neon-yel)"
                            : "var(--line-soft)"),
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        marginBottom: 4,
                        color: "var(--ink)",
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-mute)",
                        marginBottom: 8,
                        minHeight: 28,
                      }}
                    >
                      {c.description}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: c.claimed
                          ? "var(--neon-lime)"
                          : "var(--neon-yel)",
                        fontFamily: "var(--f-display)",
                        fontWeight: 800,
                        marginBottom: claimable ? 10 : 0,
                      }}
                    >
                      +{c.xp} XP {c.claimed && "✓ Claimed"}
                    </div>
                    {claimable && (
                      <button
                        onClick={() => claimChallenge(c.code)}
                        disabled={claiming === c.code}
                        className="chunky-btn yel"
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          fontSize: 12,
                          padding: "8px 12px",
                        }}
                      >
                        {claiming === c.code ? "Claiming…" : `Claim +${c.xp}`}
                      </button>
                    )}
                    {!c.claimed && !claimable && (
                      <div style={{ marginTop: 4 }}>
                        <PixelBar
                          value={c.completed ? 100 : 30}
                          color="var(--neon-yel)"
                          height={6}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* POWER-UPS panel */}
        <div className="panel yel" style={{ padding: 20 }}>
          <div className="label" style={{ color: "var(--neon-yel)" }}>
            Power-Ups
          </div>
          <h3
            className="h-display"
            style={{ fontSize: 18, margin: "6px 0 14px" }}
          >
            Streak shields · boosters
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {[
              {
                icon: "🛡",
                name: "Freeze",
                count: profile?.streak_freezes_remaining ?? 0,
                color: "var(--neon-cyan)",
              },
              {
                icon: "🔥",
                name: "Streak",
                count: profile?.streak_days ?? 0,
                color: "var(--neon-ora)",
              },
              {
                icon: "✦",
                name: "XP",
                count: profile?.xp ?? 0,
                color: "var(--neon-yel)",
              },
              {
                icon: "⚡",
                name: "Level",
                count: profile?.level ?? 1,
                color: "var(--neon-lime)",
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(0,0,0,0.35)",
                  border: "2px solid var(--line-soft)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22 }}>{p.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: p.color,
                    fontFamily: "var(--f-display)",
                    fontWeight: 800,
                  }}
                >
                  × {typeof p.count === "number" ? p.count.toLocaleString() : p.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS rail */}
      <section style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2 className="h-display" style={{ fontSize: 20 }}>
            Arcade Cabinets
          </h2>
          <span className="label">jump back in</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {[
            { href: "/learn", icon: "📚", label: "Curriculum", color: "var(--neon-cyan)" },
            { href: "/practice", icon: "🎯", label: "Practice Quiz", color: "var(--neon-yel)" },
            { href: "/review", icon: "🔁", label: "Flashcards", color: "var(--neon-mag)" },
            { href: "/learn", icon: "🤖", label: "AI Tutor", color: "var(--neon-lime)" },
            { href: "/analytics", icon: "📊", label: "Progress", color: "var(--neon-cyan)" },
            { href: "/focus", icon: "💚", label: "Focus & Mood", color: "var(--neon-mag)" },
            { href: "/project", icon: "🔨", label: "Projects", color: "var(--neon-ora)" },
            { href: "/scan", icon: "📷", label: "Doubt Scanner", color: "var(--neon-yel)" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="panel"
              style={{
                padding: 16,
                textDecoration: "none",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.35)",
                  border: `2px solid ${q.color}`,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  boxShadow: `0 0 10px ${q.color}55`,
                }}
              >
                {q.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--f-display)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: q.color,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {q.label}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </ArcadeShell>
  );
}
