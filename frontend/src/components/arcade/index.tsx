"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiDelete } from "@/lib/api";

export type Subject = {
  id: string;
  name: string;
  color: string;
  icon: string;
  progress: number;
  chapters: number;
  done: number;
};

export const SUBJECTS: Subject[] = [
  { id: "math",    name: "Math",    color: "var(--s-math)", icon: "∑",  progress: 64, chapters: 12, done: 8 },
  { id: "science", name: "Science", color: "var(--s-sci)",  icon: "⚛",  progress: 40, chapters: 10, done: 4 },
  { id: "english", name: "English", color: "var(--s-eng)",  icon: "A",       progress: 78, chapters: 9,  done: 7 },
  { id: "cs",      name: "Coding",  color: "var(--s-cs)",   icon: "</>",     progress: 25, chapters: 8,  done: 2 },
  { id: "art",     name: "Arts",    color: "var(--s-art)",  icon: "✦",  progress: 52, chapters: 6,  done: 3 },
  { id: "history", name: "History", color: "var(--s-his)",  icon: "⚜",  progress: 30, chapters: 7,  done: 2 },
];

export function Byte({
  size = 72,
  style,
  mood = "happy",
}: {
  size?: number;
  style?: CSSProperties;
  mood?: "happy" | "neutral";
}) {
  return (
    <div className="byte anim-blink" style={{ width: size, height: size, ...style }}>
      <div className="antenna" />
      <div className="body" />
      <div className="eye l" />
      <div className="eye r" />
      <div className="mouth" style={{ width: mood === "happy" ? 18 : 10 }} />
    </div>
  );
}

export function FloatingPixels({
  colors = ["#27e0ff", "#ff3ea5", "#ffe53d", "#a6ff3b"],
  count = 18,
}: {
  colors?: string[];
  count?: number;
}) {
  const pixels = Array.from({ length: count }, (_, i) => ({
    left: (i * 37) % 100,
    delay: (i * 0.4) % 6,
    color: colors[i % colors.length],
    size: 4 + ((i * 3) % 8),
  }));
  return (
    <div className="floating-pixels" aria-hidden>
      {pixels.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            top: `-${20 + ((i * 17) % 40)}px`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 8px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${5 + (i % 4)}s`,
          }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: ReactNode; color: string; icon: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1.5px solid var(--line-soft)",
      }}
    >
      <span style={{ color, fontSize: 14, textShadow: `0 0 10px ${color}` }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 14 }}>{value}</span>
        <span className="label" style={{ fontSize: 9 }}>{label}</span>
      </div>
    </div>
  );
}

const TABS = [
  { label: "Dashboard" as const, href: "/dashboard" },
  { label: "Learn" as const, href: "/learn" },
  { label: "Practice" as const, href: "/practice" },
  { label: "Buddy" as const, href: "/buddy" },
  { label: "Arena" as const, href: "/leaderboard" },
];

export type ArcadeTab = (typeof TABS)[number]["label"];

export function TopBar({
  active = "Dashboard",
  xp = 0,
  streak = 0,
  coins = 0,
  initial = "M",
  onSignOut,
  profileHref = "/profile",
}: {
  active?: ArcadeTab;
  xp?: number;
  streak?: number;
  coins?: number;
  initial?: string;
  onSignOut?: () => void;
  profileHref?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "14px 24px",
        borderBottom: "2px solid var(--line)",
        background: "linear-gradient(180deg, rgba(28,17,56,0.9) 0%, rgba(11,7,22,0.6) 100%)",
        backdropFilter: "blur(8px)",
        position: "relative",
        zIndex: 20,
      }}
    >
      <Link
        href="/dashboard"
        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
            border: "2px solid #170826",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 0 0 #170826, 0 0 20px rgba(255,62,165,0.5)",
            fontFamily: "var(--f-pixel)",
            fontSize: 14,
            color: "#fff",
          }}
        >
          L
        </div>
        <div className="h-display" style={{ fontSize: 20 }}>
          Learn<span style={{ color: "var(--neon-cyan)" }}>OS</span>
        </div>
      </Link>

      <nav style={{ display: "flex", gap: 4, marginLeft: 20 }}>
        {TABS.map((t) => {
          const isActive = t.label === active;
          return (
            <Link
              key={t.label}
              href={t.href}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                fontFamily: "var(--f-display)",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 0.5,
                color: isActive ? "#170826" : "var(--ink-dim)",
                background: isActive ? "var(--neon-cyan)" : "transparent",
                border: "2px solid " + (isActive ? "#170826" : "transparent"),
                boxShadow: isActive
                  ? "0 3px 0 0 #170826, 0 0 16px rgba(39,224,255,0.45)"
                  : "none",
                cursor: "pointer",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <Stat label="XP" value={xp.toLocaleString()} color="var(--neon-yel)" icon="✦" />
        <Stat label="Streak" value={`${streak}d`} color="var(--neon-ora)" icon="⚡" />
        <Stat label="Coins" value={coins} color="var(--neon-lime)" icon="◎" />
        <div ref={menuRef} style={{ position: "relative", marginLeft: 8 }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "2px solid var(--neon-cyan)",
              background: "linear-gradient(135deg, #3d1f7a, #1c1138)",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontFamily: "var(--f-display)",
              boxShadow: "0 0 16px rgba(39,224,255,0.35)",
              cursor: "pointer",
              color: "var(--ink)",
              fontSize: 16,
            }}
          >
            {initial}
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                minWidth: 200,
                padding: 8,
                background: "linear-gradient(180deg, var(--panel-2) 0%, var(--panel) 100%)",
                border: "2px solid var(--neon-cyan)",
                borderRadius: 14,
                boxShadow: "0 10px 0 0 #0a0515, 0 0 24px rgba(39,224,255,0.35)",
                zIndex: 40,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Link
                href={profileHref}
                onClick={() => setMenuOpen(false)}
                style={dropdownItemStyle("var(--ink)")}
              >
                Profile
              </Link>
              <Link
                href="/analytics"
                onClick={() => setMenuOpen(false)}
                style={dropdownItemStyle("var(--ink)")}
              >
                My Progress
              </Link>
              <Link
                href="/learn"
                onClick={() => setMenuOpen(false)}
                style={dropdownItemStyle("var(--ink)")}
              >
                My Subjects
              </Link>
              {onSignOut && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  style={{
                    ...dropdownItemStyle("var(--neon-mag)"),
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function dropdownItemStyle(color: string): CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    color,
    textDecoration: "none",
    fontFamily: "var(--f-body)",
  };
}

export function SubjectChip({ subject, size = 64 }: { subject: Subject; size?: number }) {
  return (
    <div className="subj-chip" style={{ color: subject.color, width: size, height: size }}>
      <span
        style={{
          fontFamily: "var(--f-display)",
          fontWeight: 900,
          fontSize: size * 0.42,
          color: subject.color,
          textShadow: `0 0 10px ${subject.color}`,
        }}
      >
        {subject.icon}
      </span>
    </div>
  );
}

export function PixelBar({
  value = 50,
  color = "var(--neon-cyan)",
  height = 14,
}: {
  value?: number;
  color?: string;
  height?: number;
}) {
  const cells = 20;
  const filled = Math.round((value / 100) * cells);
  return (
    <div style={{ display: "flex", gap: 3, height }}>
      {Array.from({ length: cells }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRadius: 3,
            background: i < filled ? color : "rgba(255,255,255,0.08)",
            boxShadow: i < filled ? `0 0 8px ${color}` : "none",
            transition: "all 400ms ease",
          }}
        />
      ))}
    </div>
  );
}

type UserStats = {
  xp: number;
  streak: number;
  coins: number;
  initial: string;
  level: number;
};

/**
 * TopBar wrapper that fetches the signed-in user's profile + gamification
 * stats from the backend and passes them to TopBar. Degrades gracefully to
 * zeros when unauthenticated or the fetch fails.
 */
export function LiveArcadeTopBar({ active }: { active: ArcadeTab }) {
  const router = useRouter();
  const { user, loading } = useSupabaseAuth();
  const [stats, setStats] = useState<UserStats>({
    xp: 0,
    streak: 0,
    coins: 0,
    initial: "U",
    level: 1,
  });

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const headers = { Authorization: `Bearer ${session.access_token}` };
        // The student's live XP/streak/level live on the Student row via
        // /api/onboarding/profile — that's what the dashboard uses and
        // what /api/progress bumps behind the scenes. UserGlobalStats
        // (backing /api/progress) is a secondary aggregate table and is
        // often empty for newer accounts, which is why the topbar was
        // showing zeros while the dashboard showed "100 XP, 3d".
        const [profileRes, gameRes] = await Promise.all([
          fetch("/api/proxy/api/onboarding/profile", { headers }).catch(() => null),
          fetch(`/api/proxy/api/progress/${user.id}`, { headers }).catch(() => null),
        ]);
        if (cancelled) return;
        const profile = profileRes && profileRes.ok ? await profileRes.json() : null;
        const game = gameRes && gameRes.ok ? await gameRes.json() : null;
        const name: string = profile?.name ?? user.email ?? "U";
        setStats({
          xp: profile?.xp ?? game?.total_xp ?? 0,
          streak: profile?.streak_days ?? game?.streak_days ?? 0,
          coins: profile?.coins ?? game?.coins ?? 0,
          level: profile?.level ?? game?.current_level ?? 1,
          initial: (name[0] ?? "U").toUpperCase(),
        });
      } catch {
        // Non-fatal — keep defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  async function handleSignOut() {
    // Supabase sign-out fully invalidates the session — no backend endpoint
    // needed. The previous apiDelete("/auth/logout") call hit a non-existent
    // route (there is no /api/auth/logout) and 404-ed silently every time.
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <TopBar
      active={active}
      xp={stats.xp}
      streak={stats.streak}
      coins={stats.coins}
      initial={stats.initial}
      onSignOut={handleSignOut}
    />
  );
}

/**
 * Wraps children in the arcade-root theme container with a full-screen
 * neon background, optional floating pixels, and an optional LiveTopBar.
 * Use this to apply the arcade look to any production page.
 */
export function ArcadeShell({
  active,
  children,
  pixels = 14,
  showTopBar = true,
  contentStyle,
}: {
  active?: ArcadeTab;
  children: ReactNode;
  pixels?: number;
  showTopBar?: boolean;
  contentStyle?: CSSProperties;
}) {
  return (
    <div
      className="arcade-root"
      data-grade="68"
      data-motion="on"
      data-mascot="on"
      style={{ minHeight: "100vh" }}
    >
      <div className="screen" style={{ minHeight: "100vh", position: "relative", borderRadius: 0, border: "none" }}>
        <div className="gridbg" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
        {pixels > 0 && <FloatingPixels count={pixels} />}
        {showTopBar && active && <LiveArcadeTopBar active={active} />}
        <div style={{ position: "relative", zIndex: 2, padding: "24px 32px", ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  );
}

