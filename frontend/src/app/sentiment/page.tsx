"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

interface SentimentLog {
  id: string;
  emotion: string;
  confidence: number;
  timestamp: string;
  chapter_id?: string;
  action_taken?: string;
}

const EMOTION_COLORS: Record<
  string,
  { neon: string; icon: string }
> = {
  engaged:   { neon: "var(--neon-lime)", icon: "🎯" },
  confused:  { neon: "var(--neon-yel)",  icon: "😕" },
  bored:     { neon: "var(--neon-cyan)", icon: "😑" },
  frustrated:{ neon: "var(--neon-mag)",  icon: "😤" },
  happy:     { neon: "var(--neon-ora)",  icon: "😊" },
  drowsy:    { neon: "var(--neon-vio)",  icon: "😴" },
};

export default function SentimentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [sentiments, setSentiments] = useState<SentimentLog[]>([]);
  const [timeRange, setTimeRange] = useState("Today");
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!authLoading && user) {
      fetchSentiments();
    }
  }, [user, authLoading, router, timeRange]);

  async function fetchSentiments() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/sentiment/history?days=${timeRange === "Today" ? 1 : timeRange === "This week" ? 7 : 30}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSentiments(data.sentiments || []);
      }
    } catch (err) {
      console.error("Failed to fetch sentiments:", err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div
        className="arcade-root"
        data-grade="68"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ink)" }}
      >
        Loading…
      </div>
    );
  }

  const emotionStats = Object.entries(EMOTION_COLORS).map(([emotion, colors]) => {
    const count = sentiments.filter((s) => s.emotion === emotion).length;
    const percentage = sentiments.length > 0 ? Math.round((count / sentiments.length) * 100) : 0;
    const avgConfidence =
      count > 0
        ? Math.round(
            (sentiments
              .filter((s) => s.emotion === emotion)
              .reduce((sum, s) => sum + s.confidence, 0) /
              count) *
              100
          )
        : 0;

    return { emotion, count, percentage, avgConfidence, ...colors };
  });

  const timelineData = sentiments
    .slice(-20)
    .map((s) => ({ ...s, time: new Date(s.timestamp).toLocaleTimeString() }));

  const topEmotion = sentiments.length
    ? emotionStats.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

  return (
    <ArcadeShell active="Dashboard" pixels={16}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="pill" style={{ marginBottom: 10 }}>
              <span style={{ color: "var(--neon-mag)" }}>◉</span> EMOTION HUD
            </div>
            <h1 className="h-display" style={{ fontSize: 32, margin: 0 }}>
              Your Sentiment <span style={{ color: "var(--neon-mag)" }}>Journey</span>
            </h1>
            <p className="label" style={{ marginTop: 6 }}>
              Track engagement and emotion across your learning sessions.
            </p>
          </div>

          {/* Current / top emotion badge */}
          {topEmotion && (
            <div
              className="panel anim-glow"
              style={{
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderColor: topEmotion.neon,
              }}
            >
              <div
                className="anim-bop"
                style={{
                  fontSize: 44,
                  filter: `drop-shadow(0 0 10px ${topEmotion.neon})`,
                }}
              >
                {topEmotion.icon}
              </div>
              <div>
                <div className="label" style={{ color: topEmotion.neon }}>TOP EMOTION</div>
                <div
                  className="h-display"
                  style={{ fontSize: 20, color: "var(--ink)", textTransform: "capitalize" }}
                >
                  {topEmotion.emotion}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Time-range filter */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Today", "This week", "This month"].map((range) => {
            const active = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={active ? "chunky-btn cyan" : undefined}
                style={
                  active
                    ? { cursor: "pointer" }
                    : {
                        padding: "10px 18px",
                        borderRadius: 12,
                        border: "2px solid var(--line-soft)",
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--ink-dim)",
                        fontFamily: "var(--f-display)",
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }
                }
              >
                {range}
              </button>
            );
          })}
        </div>

        {/* Emotion bar grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {emotionStats.map(({ emotion, count, percentage, avgConfidence, icon, neon }) => {
            const active = selectedEmotion === emotion;
            return (
              <button
                key={emotion}
                onClick={() => setSelectedEmotion(active ? null : emotion)}
                className="panel"
                style={{
                  padding: 18,
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: active ? neon : undefined,
                  boxShadow: active ? `0 0 22px ${neon}` : undefined,
                  transition: "all 160ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 32,
                      filter: `drop-shadow(0 0 8px ${neon})`,
                    }}
                  >
                    {icon}
                  </span>
                  <div>
                    <div className="label" style={{ color: neon, textTransform: "uppercase" }}>
                      {emotion}
                    </div>
                    <div
                      className="h-display"
                      style={{ fontSize: 26, color: "var(--ink)", lineHeight: 1 }}
                    >
                      {count}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto" }} className="pill">
                    {percentage}%
                  </div>
                </div>
                <PixelBar value={percentage} color={neon} height={10} />
                <div className="label" style={{ marginTop: 10 }}>
                  Avg confidence: <span style={{ color: neon }}>{avgConfidence}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main grid: timeline + sidebar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr minmax(260px, 340px)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Timeline */}
          <section className="panel cyan" style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <div className="h-display" style={{ fontSize: 16, color: "var(--neon-cyan)" }}>
                ▶ RECENT SENTIMENTS
              </div>
              <div className="pill">LAST 20</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {timelineData.length > 0 ? (
                timelineData.reverse().map((sentiment) => {
                  const emotionData = EMOTION_COLORS[sentiment.emotion];
                  const neon = emotionData?.neon || "var(--ink-mute)";
                  return (
                    <div
                      key={sentiment.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.03)",
                        border: "2px solid var(--line-soft)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 22,
                          filter: `drop-shadow(0 0 6px ${neon})`,
                        }}
                      >
                        {emotionData?.icon || "❓"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="h-display"
                          style={{ fontSize: 14, color: "var(--ink)", textTransform: "capitalize" }}
                        >
                          {sentiment.emotion}
                        </div>
                        <div className="label">{sentiment.time}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                        <div style={{ flex: 1 }}>
                          <PixelBar
                            value={Math.round(sentiment.confidence * 100)}
                            color={neon}
                            height={8}
                          />
                        </div>
                        <span
                          className="h-display"
                          style={{ fontSize: 13, color: neon, minWidth: 42, textAlign: "right" }}
                        >
                          {Math.round(sentiment.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 10px",
                    color: "var(--ink-dim)",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🛰</div>
                  <p className="label">
                    No sentiment data yet. Start a learning session to track emotions.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Stats sidebar */}
          <aside className="panel yel" style={{ padding: 20 }}>
            <div className="h-display" style={{ fontSize: 14, color: "var(--neon-yel)", marginBottom: 14 }}>
              ◈ FRAME STATS
            </div>

            {sentiments.length === 0 ? (
              <p className="label">Complete a learning session to see insights.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "2px solid var(--line-soft)",
                  }}
                >
                  <div className="label" style={{ marginBottom: 4 }}>MOST COMMON</div>
                  <div
                    className="h-display"
                    style={{
                      fontSize: 18,
                      color: "var(--ink)",
                      textTransform: "capitalize",
                    }}
                  >
                    {topEmotion?.icon} {topEmotion?.emotion}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "2px solid var(--line-soft)",
                  }}
                >
                  <div className="label" style={{ marginBottom: 4 }}>AVG CONFIDENCE</div>
                  <div className="h-display" style={{ fontSize: 22, color: "var(--neon-lime)" }}>
                    {Math.round(
                      (sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length) * 100
                    )}
                    %
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "2px solid var(--line-soft)",
                  }}
                >
                  <div className="label" style={{ marginBottom: 4 }}>TOTAL DATA POINTS</div>
                  <div className="h-display" style={{ fontSize: 22, color: "var(--neon-cyan)" }}>
                    {sentiments.length}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "2px solid var(--line-soft)",
                  }}
                >
                  <div className="label" style={{ marginBottom: 4 }}>TIME RANGE</div>
                  <div className="h-display" style={{ fontSize: 16, color: "var(--ink)" }}>
                    {timeRange}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </ArcadeShell>
  );
}
