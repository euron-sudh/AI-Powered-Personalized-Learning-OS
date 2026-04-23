"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

interface Entry {
  rank: number;
  is_me: boolean;
  display_name: string;
  grade: string | null;
  level: number;
  streak_days: number;
  score: number;
  score_label: string;
}

interface LeaderboardData {
  scope: "all_time" | "weekly";
  entries: Entry[];
  me: Entry | null;
}

const AVATAR_COLORS = [
  "var(--neon-yel)",
  "var(--neon-cyan)",
  "var(--neon-mag)",
  "var(--neon-lime)",
  "var(--neon-vio)",
  "var(--neon-ora)",
];

function avatarFor(name: string, index: number) {
  const initial = (name[0] ?? "?").toUpperCase();
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return { initial, color };
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [scope, setScope] = useState<"all_time" | "weekly">("weekly");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: "all_time" | "weekly") => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `/api/proxy/api/leaderboard?scope=${s}&limit=20`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !authLoading) load(scope);
  }, [user, authLoading, scope, load]);

  if (authLoading) {
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
        }}
      >
        Loading…
      </div>
    );
  }

  const topThree = data?.entries.slice(0, 3) ?? [];
  const rest = data?.entries ?? [];
  // For the podium we want #1 in center
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  return (
    <ArcadeShell active="Arena" pixels={16}>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <span className="label" style={{ color: "var(--neon-yel)" }}>⚡ {scope === "weekly" ? "WEEKLY ARENA" : "ALL-TIME ARENA"}</span>
          <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 4px" }}>
            High <span style={{ color: "var(--neon-yel)" }}>scores</span>
          </h1>
          <p style={{ color: "var(--ink-dim)" }}>
            Friendly competition — names are partly anonymized.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["weekly", "all_time"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className="pill"
              style={{
                cursor: "pointer",
                color: scope === s ? "#170826" : "var(--ink-dim)",
                background: scope === s ? "var(--neon-cyan)" : "rgba(255,255,255,0.04)",
                borderColor: scope === s ? "#170826" : "var(--line)",
                boxShadow: scope === s ? "0 3px 0 0 #170826" : "none",
              }}
            >
              {s === "weekly" ? "This week" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="panel" style={{ padding: 40, textAlign: "center", color: "var(--ink-mute)" }}>
          Loading leaderboard…
        </div>
      ) : data.entries.length === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ color: "var(--ink-dim)", marginBottom: 12 }}>No entries yet — be the first!</div>
          <Link
            href="/practice"
            className="chunky-btn cyan"
            style={{ textDecoration: "none", justifyContent: "center", display: "inline-flex" }}
          >
            ▶ Start a practice quiz
          </Link>
        </div>
      ) : (
        <>
          {/* Podium */}
          {podiumOrder.length > 0 && (
            <div
              className="panel yel"
              style={{
                padding: "30px 24px 0",
                position: "relative",
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div className="scanline" />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 120,
                  background:
                    "radial-gradient(ellipse at center top, rgba(255,229,61,0.3), transparent 70%)",
                }}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 20,
                  alignItems: "end",
                  position: "relative",
                }}
              >
                {podiumOrder.map((entry, i) => {
                  if (!entry) return <div key={i} />;
                  const h = i === 1 ? 210 : i === 0 ? 160 : 130;
                  const place = i === 1 ? 1 : i === 0 ? 2 : 3;
                  const av = avatarFor(entry.display_name, place - 1);
                  return (
                    <div key={entry.rank} style={{ textAlign: "center" }}>
                      <div
                        className={i === 1 ? "anim-float" : ""}
                        style={{
                          width: i === 1 ? 110 : 88,
                          height: i === 1 ? 110 : 88,
                          margin: "0 auto 12px",
                          borderRadius: 24,
                          background: `linear-gradient(135deg, ${av.color}, #5c2fb8)`,
                          border: "4px solid #170826",
                          boxShadow: `0 8px 0 #170826, 0 0 30px ${av.color}`,
                          display: "grid",
                          placeItems: "center",
                          fontFamily: "var(--f-display)",
                          fontWeight: 900,
                          fontSize: i === 1 ? 46 : 36,
                          color: "#170826",
                          position: "relative",
                        }}
                      >
                        {av.initial}
                        {i === 1 && (
                          <div style={{ position: "absolute", top: -32, fontSize: 40 }}>👑</div>
                        )}
                      </div>
                      <div className="h-display" style={{ fontSize: 15 }}>
                        {entry.display_name}
                        {entry.is_me && (
                          <span style={{ color: "var(--neon-lime)", fontSize: 11, marginLeft: 6 }}>
                            (you)
                          </span>
                        )}
                      </div>
                      <div
                        className="h-display"
                        style={{
                          fontSize: 22,
                          color: av.color,
                          marginTop: 2,
                          textShadow: `0 0 10px ${av.color}`,
                        }}
                      >
                        {entry.score.toLocaleString()}{" "}
                        <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                          {entry.score_label}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 14,
                          height: h,
                          borderRadius: "16px 16px 0 0",
                          background:
                            place === 1
                              ? "linear-gradient(180deg, var(--neon-yel), #b88a00)"
                              : place === 2
                                ? "linear-gradient(180deg, #d5d7e0, #7d8095)"
                                : "linear-gradient(180deg, #d9832e, #5a3410)",
                          border: "3px solid #170826",
                          borderBottom: "none",
                          position: "relative",
                          boxShadow:
                            "inset 0 4px 0 rgba(255,255,255,0.3), inset 0 -8px 0 rgba(0,0,0,0.2)",
                        }}
                      >
                        <div
                          className="pixel"
                          style={{
                            position: "absolute",
                            top: 20,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: 40,
                            color: "#170826",
                          }}
                        >
                          {place}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 80px 120px 100px",
                padding: "12px 20px",
                borderBottom: "2px solid var(--line-soft)",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              {["Rank", "Player", "Level", "Score", "Streak"].map((h) => (
                <div key={h} className="label">{h}</div>
              ))}
            </div>
            {rest.map((e, idx) => {
              const av = avatarFor(e.display_name, idx);
              return (
                <div
                  key={e.rank}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 80px 120px 100px",
                    padding: "14px 20px",
                    alignItems: "center",
                    borderBottom: "1px solid var(--line-soft)",
                    background: e.is_me ? "rgba(166,255,59,0.06)" : "transparent",
                    borderLeft: e.is_me ? "4px solid var(--neon-lime)" : "4px solid transparent",
                  }}
                >
                  <div
                    className="h-display"
                    style={{
                      fontSize: 22,
                      color: e.rank <= 3 ? "var(--neon-yel)" : "var(--ink-dim)",
                    }}
                  >
                    #{e.rank}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${av.color}, #5c2fb8)`,
                        border: "2px solid #170826",
                        fontWeight: 900,
                        display: "grid",
                        placeItems: "center",
                        color: "#170826",
                        fontFamily: "var(--f-display)",
                      }}
                    >
                      {av.initial}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: e.is_me ? "var(--neon-lime)" : "var(--ink)",
                      }}
                    >
                      {e.display_name}
                      {e.is_me && (
                        <span
                          style={{
                            color: "var(--neon-lime)",
                            fontSize: 10,
                            marginLeft: 6,
                            fontFamily: "var(--f-display)",
                            fontWeight: 800,
                          }}
                        >
                          (YOU)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-display" style={{ fontSize: 14 }}>Lv {e.level}</div>
                  <div
                    className="h-display"
                    style={{ fontSize: 14, color: "var(--neon-cyan)" }}
                  >
                    {e.score.toLocaleString()}{" "}
                    <span style={{ fontSize: 10, color: "var(--ink-mute)" }}>{e.score_label}</span>
                  </div>
                  <div style={{ color: "var(--neon-ora)", fontWeight: 700, fontSize: 13 }}>
                    🔥 {e.streak_days}
                  </div>
                </div>
              );
            })}
          </div>

          {data.me && !data.entries.some((e) => e.is_me) && (
            <div
              className="panel cyan"
              style={{
                padding: 20,
                marginTop: 18,
                display: "flex",
                alignItems: "center",
                gap: 16,
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48 }}>
                  <Byte size={48} />
                </div>
                <div>
                  <div className="h-display" style={{ fontSize: 16 }}>
                    You&apos;re at #{data.me.rank}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                    Lv {data.me.level} · {data.me.streak_days}-day streak
                  </div>
                </div>
              </div>
              <div
                className="h-display"
                style={{ fontSize: 22, color: "var(--neon-cyan)" }}
              >
                {data.me.score.toLocaleString()}{" "}
                <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{data.me.score_label}</span>
              </div>
            </div>
          )}
        </>
      )}
    </ArcadeShell>
  );
}
