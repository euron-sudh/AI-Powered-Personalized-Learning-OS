"use client";

import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SubjectIcon } from "@/components/SubjectIcon";
import {
  Battery,
  BookOpen,
  Bot,
  Briefcase,
  Flame,
  GraduationCap,
  Hammer,
  Hammer as HammerIcon,
  HeartPulse,
  Layers,
  Layers3,
  LineChart,
  type LucideIcon,
  PenLine,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";

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

const NBA_ICON: Record<string, LucideIcon> = {
  flame: Flame,
  layers: Layers,
  book: BookOpen,
  "battery-low": Battery,
  rocket: Rocket,
  target: Target,
  hammer: HammerIcon,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
};

const SUBJECT_STYLE: Record<string, { color: string; bg: string }> = {
  mathematics: { color: "var(--subject-math)", bg: "var(--subject-math-bg)" },
  math: { color: "var(--subject-math)", bg: "var(--subject-math-bg)" },
  physics: { color: "var(--subject-science)", bg: "var(--subject-science-bg)" },
  chemistry: { color: "var(--subject-science)", bg: "var(--subject-science-bg)" },
  biology: { color: "var(--subject-science)", bg: "var(--subject-science-bg)" },
  science: { color: "var(--subject-science)", bg: "var(--subject-science-bg)" },
  english: { color: "var(--subject-english)", bg: "var(--subject-english-bg)" },
  history: { color: "var(--subject-history)", bg: "var(--subject-history-bg)" },
  geography: { color: "var(--subject-history)", bg: "var(--subject-history-bg)" },
  "computer science": { color: "var(--subject-coding)", bg: "var(--subject-coding-bg)" },
  coding: { color: "var(--subject-coding)", bg: "var(--subject-coding-bg)" },
  arts: { color: "var(--subject-arts)", bg: "var(--subject-arts-bg)" },
  music: { color: "var(--subject-music)", bg: "var(--subject-music-bg)" },
};

function styleFor(name: string) {
  return (
    SUBJECT_STYLE[name.toLowerCase()] ?? {
      color: "var(--brand-blue)",
      bg: "var(--brand-blue-soft)",
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

      if (profileRes.ok) setProfile(await profileRes.json());
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
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--brand-blue-soft)] border-t-[var(--brand-blue)] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading your dashboard…</p>
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

  const stats = [
    { label: "Subjects", value: String(subjects.length), icon: "📚", gradient: "var(--gradient-stat-purple)" },
    { label: "Level", value: String(profile?.level ?? 1), icon: "⭐", gradient: "var(--gradient-stat-teal)" },
    { label: "Day Streak", value: String(profile?.streak_days ?? 0), icon: "🔥", gradient: "var(--gradient-stat-orange)" },
    { label: "Total XP", value: (profile?.xp ?? 0).toLocaleString(), icon: "✨", gradient: "var(--gradient-stat-pink)" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      {/* Ambient doodles behind everything */}
      <div className="doodle-field" aria-hidden>
        <span style={{ top: "4%", left: "-1%", fontSize: 30 }}>⭐</span>
        <span style={{ top: "2%", right: "4%", fontSize: 28 }}>📘</span>
        <span style={{ top: "32%", right: "-1%", fontSize: 26 }}>✏️</span>
        <span style={{ top: "58%", left: "-1%", fontSize: 28 }}>🌟</span>
        <span style={{ bottom: "10%", right: "2%", fontSize: 30 }}>📒</span>
        <span style={{ bottom: "32%", left: "3%", fontSize: 24 }}>✨</span>
      </div>

      {/* HERO — LearnSphere-bright welcome panel */}
      <section className="relative mb-8 rounded-[32px] overflow-hidden bg-white border-2 border-[var(--border)] shadow-elevated">
        {/* decorative color accents that bleed in from the corners */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle 240px at 0% 0%, rgba(37, 99, 235, 0.18), transparent 65%),
              radial-gradient(circle 240px at 100% 0%, rgba(250, 204, 21, 0.22), transparent 65%),
              radial-gradient(circle 260px at 0% 100%, rgba(34, 197, 94, 0.15), transparent 65%),
              radial-gradient(circle 260px at 100% 100%, rgba(249, 115, 22, 0.18), transparent 65%)
            `,
          }}
        />
        <div className="relative grid md:grid-cols-[1.1fr_1fr] gap-6 items-center p-6 md:p-10">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] text-[11px] font-extrabold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              Welcome back
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 capitalize text-[var(--text-primary)] leading-tight">
              Hi {displayName},{" "}
              <span className="text-[var(--brand-blue)]">ready to learn?</span>
            </h1>
            <p className="text-[var(--text-body)] max-w-md mb-6 text-base">
              Fun, interactive lessons made just for you — pick up where you left off or try something new.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-white px-6 py-3 rounded-full text-sm font-extrabold hover:scale-[1.03] transition-transform shadow-glow"
              >
                Continue Learning →
              </Link>
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 bg-white text-[var(--brand-blue)] px-6 py-3 rounded-full text-sm font-extrabold border-2 border-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)] transition"
              >
                Practice Quiz
              </Link>
            </div>
          </div>

          {/* Dashboard-specific illustration: a "learning quest" path with checkpoints */}
          <div
            className="relative rounded-3xl aspect-[5/3] overflow-hidden border-2 border-white shadow-elevated"
            style={{ background: "linear-gradient(160deg, #e0f2fe 0%, #ede9fe 50%, #ffe4e6 100%)" }}
          >
            {/* decorative planets */}
            <div className="absolute top-5 right-6 w-16 h-16 rounded-full shadow-inner"
                 style={{ background: "radial-gradient(circle at 30% 30%, #fef08a, #f59e0b)" }} />
            <div className="absolute bottom-8 left-6 w-10 h-10 rounded-full shadow-inner"
                 style={{ background: "radial-gradient(circle at 30% 30%, #bfdbfe, #3b82f6)" }} />
            <div className="absolute top-[38%] left-[8%] w-6 h-6 rounded-full"
                 style={{ background: "radial-gradient(circle at 30% 30%, #fbcfe8, #ec4899)" }} />

            {/* dashed quest path */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 300" preserveAspectRatio="none">
              <path
                d="M 40 260 Q 140 180, 200 220 T 340 150 Q 400 110, 470 55"
                fill="none"
                stroke="#a5b4fc"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="2 14"
              />
            </svg>

            {/* checkpoint nodes — each sits on the path */}
            <div className="absolute bottom-[16%] left-[6%] w-10 h-10 rounded-full bg-white shadow-card border-2 border-[var(--brand-blue)] flex items-center justify-center text-xl">📚</div>
            <div className="absolute bottom-[30%] left-[38%] w-10 h-10 rounded-full bg-white shadow-card border-2 border-[var(--subject-science)] flex items-center justify-center text-xl">🧪</div>
            <div className="absolute top-[38%] right-[32%] w-10 h-10 rounded-full bg-white shadow-card border-2 border-[var(--subject-arts)] flex items-center justify-center text-xl">🎨</div>
            <div className="absolute top-[12%] right-[6%] w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--amber)] shadow-glow border-2 border-white flex items-center justify-center text-2xl">🏆</div>

            {/* traveling rocket */}
            <div className="absolute top-[18%] left-[48%] text-4xl animate-float drop-shadow">🚀</div>

            {/* floating accents */}
            <div className="absolute top-6 left-[28%] text-lg animate-float opacity-80">⭐</div>
            <div className="absolute top-[52%] left-[18%] text-base animate-float opacity-70" style={{ animationDelay: "0.7s" }}>✨</div>
            <div className="absolute bottom-[42%] right-[12%] text-base animate-float opacity-70" style={{ animationDelay: "1.1s" }}>✨</div>
            <div className="absolute bottom-[10%] right-[20%] text-sm animate-float opacity-70" style={{ animationDelay: "0.3s" }}>⭐</div>

            {/* ground accent — keeps brand baseline consistent with landing */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-[var(--brand-blue)] via-[var(--accent)] to-[var(--subject-science)]" />
          </div>
        </div>
      </section>

      {/* STATS — glossy gradient tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-glossy rounded-3xl p-5 text-white hover:-translate-y-1 transition-transform relative"
            style={{ backgroundImage: stat.gradient }}
          >
            <div className="relative z-10 flex items-center gap-3">
              <div className="text-4xl drop-shadow-md">{stat.icon}</div>
              <div>
                <div className="text-3xl font-extrabold leading-none drop-shadow">{stat.value}</div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-90 mt-1">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Next-best-action widget */}
      {actions.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[var(--brand-blue)]" strokeWidth={2.2} />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
              For you, right now
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actions.map((a, i) => {
              const Icon = NBA_ICON[a.icon] ?? Sparkles;
              const isPrimary = i === 0;
              return (
                <Link
                  key={i}
                  href={a.href}
                  className={`rounded-2xl p-5 shadow-card border transition-all hover:-translate-y-0.5 ${
                    isPrimary
                      ? "bg-gradient-to-br from-[var(--brand-blue)] to-[var(--subject-coding)] text-white border-transparent"
                      : "bg-white border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPrimary ? "bg-white/20" : "bg-[var(--brand-blue-soft)]"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isPrimary ? "text-white" : "text-[var(--brand-blue)]"}`}
                        strokeWidth={2}
                      />
                    </div>
                    {isPrimary && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                        Top pick
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-base font-extrabold leading-snug mb-1 ${
                      isPrimary ? "text-white" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {a.title}
                  </div>
                  <div
                    className={`text-[12px] mb-3 ${
                      isPrimary ? "text-white/80" : "text-[var(--text-muted)]"
                    }`}
                  >
                    {a.reason}
                  </div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isPrimary ? "text-white" : "text-[var(--brand-blue)]"
                    }`}
                  >
                    {a.cta_label} →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Onboarding banner */}
      {!profile?.onboarding_completed && (
        <div className="mb-8 bg-[var(--amber-bg)] border border-[var(--amber)] rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text-primary)] font-medium">
            🎯 Finish onboarding to unlock your personalized curriculum.
          </p>
          <Link href="/onboarding" className="px-5 py-2.5 bg-[var(--amber)] text-white rounded-full text-sm font-bold hover:opacity-90 transition shrink-0">
            Continue onboarding
          </Link>
        </div>
      )}

      {/* LEVEL PROGRESS — adventure track */}
      {profile && (() => {
        const pct = Math.min(
          100,
          Math.round(((profile.xp_into_level ?? 0) / (profile.xp_to_next_level || 500)) * 100)
        );
        return (
          <section className="bg-white border border-[var(--border)] rounded-3xl p-5 shadow-card mb-6 relative">
            <div className="flex items-center justify-between mb-3 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--brand-blue)] to-[var(--accent)] flex items-center justify-center text-white font-extrabold shadow-glow">
                  {profile.level ?? 1}
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)]">Level {profile.level ?? 1}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-semibold">
                    {profile.xp_into_level ?? 0} / {profile.xp_to_next_level ?? 500} XP to next level
                  </div>
                </div>
              </div>
              {(profile.longest_streak ?? 0) > 0 && (
                <div className="text-right">
                  <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wide">Longest streak</div>
                  <div className="text-sm font-extrabold text-[var(--accent)]">{profile.longest_streak} days 🔥</div>
                </div>
              )}
            </div>
            <div className="relative h-6">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-[var(--bg-deep)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full bg-gradient-to-r from-[var(--brand-blue)] via-[var(--subject-coding)] to-[var(--accent)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="absolute left-[25%] top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg select-none">🏃</div>
              <div className="absolute left-[50%] top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg select-none">🧒</div>
              <div className="absolute left-[75%] top-1/2 -translate-y-1/2 -translate-x-1/2 text-lg select-none">🤖</div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 text-xl select-none">🏅</div>
            </div>
          </section>
        );
      })()}

      {/* DAILY CHALLENGES */}
      {challenges.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Today's Challenges 🎯</h2>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {challenges.filter((c) => c.claimed).length} / {challenges.length} claimed
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {challenges.map((c) => {
              const claimable = c.completed && !c.claimed;
              return (
                <div
                  key={c.code}
                  className={`bg-white border-2 rounded-2xl p-5 shadow-card transition-all ${
                    c.claimed
                      ? "border-[var(--green)] opacity-90"
                      : claimable
                      ? "border-[var(--accent)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{c.icon}</div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--amber)]">
                      +{c.xp} XP
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)] mb-1">{c.title}</div>
                  <div className="text-[12px] text-[var(--text-muted)] mb-4">{c.description}</div>
                  {c.claimed ? (
                    <div className="text-center text-xs font-bold text-[var(--green)] py-2">
                      ✓ Claimed
                    </div>
                  ) : claimable ? (
                    <button
                      onClick={() => claimChallenge(c.code)}
                      disabled={claiming === c.code}
                      className="w-full py-2 bg-[var(--accent)] text-white rounded-full font-bold text-xs hover:opacity-90 hover:scale-[1.02] transition-all shadow-card disabled:opacity-60"
                    >
                      {claiming === c.code ? "Claiming…" : `Claim +${c.xp} XP`}
                    </button>
                  ) : (
                    <div className="text-center text-xs font-semibold text-[var(--text-muted)] py-2">
                      Not yet completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SUBJECTS */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Your Subjects</h2>
            <Link href="/learn" className="text-xs font-bold text-[var(--brand-blue)] hover:underline">
              View all →
            </Link>
          </div>
          {subjects.length === 0 ? (
            <div className="bg-white border border-[var(--border)] rounded-2xl p-10 text-center shadow-card">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-[var(--brand-blue)]" strokeWidth={1.5} />
              <p className="text-[var(--text-muted)] mb-4">No subjects yet. Complete onboarding to generate your curriculum.</p>
              <Link href="/onboarding" className="inline-block px-5 py-2.5 bg-[var(--accent)] text-white rounded-full text-sm font-bold hover:opacity-90 transition">
                Start onboarding
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((s) => {
                const style = styleFor(s.name);
                return (
                  <Link
                    key={s.id}
                    href={`/learn/${s.id}`}
                    className="rounded-2xl p-5 shadow-card hover:scale-[1.02] transition-transform border-2 relative overflow-hidden"
                    style={{ background: style.bg, borderColor: style.color }}
                  >
                    <div
                      className="absolute -bottom-6 -right-4 text-7xl opacity-15 select-none"
                      style={{ color: style.color }}
                    >
                      <SubjectIcon subject={s.name} className="w-20 h-20" strokeWidth={1.5} />
                    </div>
                    <div className="flex items-start justify-between mb-3 relative">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-card"
                        style={{ background: style.color }}
                      >
                        <SubjectIcon subject={s.name} className="w-6 h-6" strokeWidth={2} />
                      </div>
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-wide text-white px-2.5 py-1 rounded-full shadow-card"
                        style={{ background: style.color }}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="font-extrabold text-lg capitalize relative" style={{ color: style.color }}>
                      {s.name}
                    </div>
                    <div className="text-[12px] text-[var(--text-muted)] mt-1 font-semibold relative">
                      {s.chapter_count} {s.chapter_count === 1 ? "chapter" : "chapters"}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/learn"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--brand-blue-soft)] flex items-center justify-center text-[var(--brand-blue)]">
                <Layers3 className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">View Curriculum</div>
                <div className="text-[11px] text-[var(--text-muted)]">Browse all your subjects</div>
              </div>
            </Link>
            <Link
              href="/practice"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--subject-english-bg)] flex items-center justify-center text-[var(--subject-english)]">
                <PenLine className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">Practice Quiz</div>
                <div className="text-[11px] text-[var(--text-muted)]">Test your knowledge</div>
              </div>
            </Link>
            <Link
              href="/review"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--subject-math-bg)] flex items-center justify-center text-[var(--subject-math)]">
                <Layers3 className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">Review Flashcards</div>
                <div className="text-[11px] text-[var(--text-muted)]">Strengthen what you&rsquo;ve learned</div>
              </div>
            </Link>
            <Link
              href="/learn"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--subject-coding-bg)] flex items-center justify-center text-[var(--subject-coding)]">
                <Bot className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">AI Tutor</div>
                <div className="text-[11px] text-[var(--text-muted)]">Talk to your tutor</div>
              </div>
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--subject-science-bg)] flex items-center justify-center text-[var(--subject-science)]">
                <LineChart className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">Progress</div>
                <div className="text-[11px] text-[var(--text-muted)]">See how you&rsquo;re doing</div>
              </div>
            </Link>
            <Link
              href="/focus"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--red-bg)] flex items-center justify-center text-[var(--red)]">
                <HeartPulse className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">Focus &amp; Mood</div>
                <div className="text-[11px] text-[var(--text-muted)]">Check in, then Pomodoro</div>
              </div>
            </Link>
            <Link
              href="/project"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--amber-bg)] flex items-center justify-center text-[var(--amber)]">
                <Hammer className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">Project mode</div>
                <div className="text-[11px] text-[var(--text-muted)]">Build something real</div>
              </div>
            </Link>
            <Link
              href="/scan"
              className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-card hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-2xl bg-[var(--brand-blue-soft)] flex items-center justify-center text-[var(--brand-blue)]">
                <Briefcase className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-[var(--text-primary)]">Doubt scanner</div>
                <div className="text-[11px] text-[var(--text-muted)]">Snap a problem, get steps</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
