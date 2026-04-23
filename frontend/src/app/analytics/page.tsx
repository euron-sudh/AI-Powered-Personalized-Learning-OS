"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

interface SubjectProgress {
  subject_id: string;
  subject_name: string;
  chapters_completed: number;
  total_chapters: number;
  average_score: number | null;
  progress_percent: number;
}

interface WeaknessSubject {
  subject_id: string;
  subject_name: string;
  score: number | null;
  chapters_completed: number;
  total_chapters: number;
  weak_topics: { topic: string; count: number }[];
}

interface WeaknessRadar {
  subjects: WeaknessSubject[];
  top_weaknesses: { topic: string; count: number }[];
}

interface Stats {
  lessonsCompleted: number;
  accuracy: number;
  sessions: number;
  streak: number;
  total_xp?: number;
  current_level?: number;
}

const SUBJECT_COLORS: Record<string, string> = {
  "Mathematics": "#27e0ff",
  "Physics": "#a6ff3b",
  "Chemistry": "#ffe53d",
  "Biology": "#a6ff3b",
  "Science": "#a6ff3b",
  "English": "#ff3ea5",
  "History": "#ff7a2b",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    lessonsCompleted: 0,
    accuracy: 0,
    sessions: 0,
    streak: 0,
  });
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [userGrade, setUserGrade] = useState("9");
  const [viewFilter, setViewFilter] = useState("Overview");
  const [timeRange, setTimeRange] = useState("This week");
  const [weekData, setWeekData] = useState<number[]>([72, 0, 88, 80, 91, 84, 76]);
  const [radar, setRadar] = useState<WeaknessRadar | null>(null);
  const [recommendations, setRecommendations] = useState<
    { subject_id: string; chapter_id: string; title: string; sub: string; dot: string }[]
  >([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!authLoading && user) {
      fetchProgressData();
    }
  }, [user, authLoading, router]);

  async function fetchProgressData() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [progressRes, profileRes, radarRes, subjectsRes] = await Promise.all([
        fetch(`/api/proxy/api/progress/${user?.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/proxy/api/onboarding/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/proxy/api/progress/weakness-radar`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        // Same endpoint the dashboard uses — its chapter counts come straight
        // from the Chapter table, so they stay in sync.
        fetch(`/api/proxy/api/onboarding/subjects`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (radarRes.ok) {
        setRadar(await radarRes.json());
      }

      if (progressRes.ok) {
        const data = await progressRes.json();
        let subjectList: SubjectProgress[] = data.subjects || [];

        // Merge authoritative chapter counts from /onboarding/subjects so
        // the numbers match what the dashboard displays. Match by name since
        // the two endpoints expose the same subject ids under different keys.
        if (subjectsRes.ok) {
          try {
            const sd = await subjectsRes.json();
            const fresh: Array<{
              id: string;
              name: string;
              chapter_count?: number;
              chapters_completed?: number;
              total_chapters?: number;
              progress_percent?: number;
            }> = sd.subjects || [];
            const byId = new Map(fresh.map((f) => [f.id, f]));
            subjectList = subjectList.map((s) => {
              const f = byId.get(s.subject_id);
              if (!f) return s;
              const total = f.total_chapters ?? f.chapter_count ?? s.total_chapters;
              const completed = f.chapters_completed ?? s.chapters_completed;
              const pct =
                typeof f.progress_percent === "number"
                  ? f.progress_percent
                  : total > 0
                    ? Math.round((completed / total) * 100)
                    : s.progress_percent;
              return {
                ...s,
                total_chapters: total,
                chapters_completed: completed,
                progress_percent: pct,
              };
            });
          } catch {
            /* keep progressRes data as-is if merge fails */
          }
        }

        setSubjects(subjectList);

        const recs = await Promise.all(
          subjectList.slice(0, 4).map(async (s) => {
            try {
              const cRes = await fetch(`/api/proxy/api/curriculum/${s.subject_id}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (!cRes.ok) return null;
              const cur = await cRes.json();
              const chapters: { id: string; title: string; status: string; order_index: number }[] =
                cur.chapters || [];
              const next =
                chapters.find((ch) => ch.status === "in_progress") ||
                chapters.find((ch) => ch.status === "available") ||
                chapters.find((ch) => ch.status !== "completed");
              if (!next) return null;
              return {
                subject_id: s.subject_id,
                chapter_id: next.id,
                title: next.title,
                sub: `${s.subject_name} · Lesson ${next.order_index + 1}`,
                dot: SUBJECT_COLORS[s.subject_name] || "#27e0ff",
              };
            } catch {
              return null;
            }
          })
        );
        setRecommendations(
          recs.filter((r): r is NonNullable<typeof r> => r !== null)
        );
        const totalCompleted = subjectList.reduce((s: number, x: SubjectProgress) => s + (x.chapters_completed || 0), 0);
        const scores = subjectList.filter((x: SubjectProgress) => x.average_score != null).map((x: SubjectProgress) => x.average_score as number);
        const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
        setStats({
          lessonsCompleted: totalCompleted,
          accuracy: Math.round(avgScore),
          sessions: data.sessions || 0,
          streak: data.streak_days || 0,
          total_xp: data.total_xp,
          current_level: data.current_level,
        });
      }

      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile?.grade) {
          setUserGrade(profile.grade);
        }
      }
    } catch (err) {
      console.error("Failed to fetch progress:", err);
    } finally {
      setLoading(false);
    }
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

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${today.getFullYear()}`;

  const viewOptions = ["Overview", "By subject", "Tutor sessions", "Quiz history"];
  const rangeOptions = ["This week", "This month", "All time"];

  return (
    <ArcadeShell active="Dashboard" pixels={14}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>Progress HUD</span>
            <h1 className="h-display" style={{ fontSize: 40, margin: "4px 0 6px" }}>
              Your <span style={{ color: "var(--neon-yel)" }}>stats</span>
            </h1>
            <div style={{ color: "var(--ink-dim)", fontSize: 13 }}>
              Grade <span style={{ color: "var(--neon-mag)", fontWeight: 700 }}>{userGrade}</span> · {weekLabel}
            </div>
          </div>
          <div className="pill" style={{ fontSize: 11 }}>{weekLabel}</div>
        </div>
      </div>

      {/* Filter bar: View + Time Range as arcade pills */}
      <div className="panel" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>View</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {viewOptions.map((view) => {
                const isActive = viewFilter === view;
                return (
                  <button
                    key={view}
                    onClick={() => setViewFilter(view)}
                    className="chunky-btn"
                    style={{
                      padding: "6px 12px",
                      fontSize: 11,
                      background: isActive
                        ? "var(--neon-cyan)"
                        : "transparent",
                      color: isActive ? "#170826" : "var(--ink-dim)",
                      border: "2px solid " + (isActive ? "#170826" : "var(--line-soft)"),
                      boxShadow: isActive ? "0 3px 0 0 #170826, 0 0 14px rgba(39,224,255,0.45)" : "none",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      fontFamily: "var(--f-display)",
                      fontWeight: 700,
                      cursor: "pointer",
                      borderRadius: 10,
                    }}
                  >
                    {view}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="label" style={{ color: "var(--neon-mag)" }}>Range</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {rangeOptions.map((range) => {
                const isActive = timeRange === range;
                return (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className="chunky-btn"
                    style={{
                      padding: "6px 12px",
                      fontSize: 11,
                      background: isActive
                        ? "var(--neon-mag)"
                        : "transparent",
                      color: isActive ? "#170826" : "var(--ink-dim)",
                      border: "2px solid " + (isActive ? "#170826" : "var(--line-soft)"),
                      boxShadow: isActive ? "0 3px 0 0 #170826, 0 0 14px rgba(255,62,165,0.45)" : "none",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      fontFamily: "var(--f-display)",
                      fontWeight: 700,
                      cursor: "pointer",
                      borderRadius: 10,
                    }}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards — 4 column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {/* Lessons completed */}
        <div className="panel cyan" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-cyan)" }}>Lessons completed</span>
          <div className="h-display" style={{ fontSize: 40, color: "var(--neon-cyan)", lineHeight: 1, marginTop: 6 }}>
            {stats.lessonsCompleted}
          </div>
          <div style={{ color: "var(--neon-lime)", fontSize: 11, marginTop: 6, fontWeight: 700 }}>
            ↑ 3 this week
          </div>
        </div>

        {/* Quiz accuracy */}
        <div className="panel yel" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-yel)" }}>Quiz accuracy</span>
          <div className="h-display" style={{ fontSize: 40, color: "var(--neon-yel)", lineHeight: 1, marginTop: 6 }}>
            {stats.accuracy}%
          </div>
          <div style={{ color: "var(--neon-lime)", fontSize: 11, marginTop: 6, fontWeight: 700 }}>
            ↑ 6% vs last week
          </div>
        </div>

        {/* AI tutor sessions */}
        <div className="panel mag" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-mag)" }}>AI tutor sessions</span>
          <div className="h-display" style={{ fontSize: 40, color: "var(--neon-mag)", lineHeight: 1, marginTop: 6 }}>
            {stats.sessions}
          </div>
          <div style={{ color: "var(--ink-mute)", fontSize: 11, marginTop: 6 }}>
            6.4 hrs total
          </div>
        </div>

        {/* Day streak */}
        <div className="panel" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-ora)" }}>Day streak</span>
          <div className="h-display" style={{ fontSize: 40, color: "var(--neon-ora)", lineHeight: 1, marginTop: 6 }}>
            {stats.streak}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
              const isToday = i === 6;
              const isDone = i < 6;
              return (
                <div
                  key={i}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    fontSize: 10,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontFamily: "var(--f-display)",
                    background: isToday
                      ? "var(--neon-ora)"
                      : isDone
                      ? "rgba(255, 122, 43, 0.18)"
                      : "rgba(255,255,255,0.05)",
                    color: isToday
                      ? "#170826"
                      : isDone
                      ? "var(--neon-ora)"
                      : "var(--ink-mute)",
                    border: "1.5px solid " + (isToday ? "#170826" : "var(--line-soft)"),
                    boxShadow: isToday ? "0 0 10px rgba(255,122,43,0.5)" : "none",
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two-col: Subject Progress + Weekly Accuracy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Subject progress */}
        <div className="panel cyan" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>Subject progress</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {subjects.length > 0 ? (
              subjects.map((subject) => {
                const color = SUBJECT_COLORS[subject.subject_name] || "var(--neon-cyan)";
                // Backend's progress_percent comes from a stats table that
                // sometimes lags behind the real chapter-completion count.
                // Recompute locally whenever the ratio is obviously wrong
                // (e.g. "1/13" served as 0%).
                const ratioPct =
                  subject.total_chapters > 0
                    ? Math.round((subject.chapters_completed / subject.total_chapters) * 100)
                    : 0;
                const displayPct =
                  subject.progress_percent === 0 && subject.chapters_completed > 0
                    ? ratioPct
                    : Math.max(subject.progress_percent, ratioPct);
                return (
                  <div key={subject.subject_id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span
                        style={{
                          fontFamily: "var(--f-display)",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--ink)",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {subject.subject_name}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "var(--f-display)",
                            fontSize: 13,
                            fontWeight: 800,
                            color,
                            textShadow: `0 0 8px ${color}`,
                          }}
                        >
                          {displayPct}%
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(255,255,255,0.06)",
                            border: "1.5px solid var(--line-soft)",
                            color: "var(--ink-dim)",
                            fontWeight: 700,
                          }}
                        >
                          {subject.chapters_completed}/{subject.total_chapters}
                        </span>
                      </div>
                    </div>
                    <PixelBar value={displayPct} color={color} height={10} />
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: 12, color: "var(--ink-mute)" }}>No subjects yet.</p>
            )}
          </div>
        </div>

        {/* Weekly accuracy bar chart */}
        <div className="panel mag" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-mag)" }}>Weekly quiz accuracy</span>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120, justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
            {weekData.map((value, i) => {
              let color = "rgba(155, 92, 255, 0.18)";
              if (value >= 85) color = "var(--neon-lime)";
              else if (value >= 70) color = "var(--neon-cyan)";
              else if (value > 0) color = "var(--neon-yel)";

              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: "100%",
                      height: 90,
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      borderBottom: "2px solid var(--line-soft)",
                    }}
                  >
                    {value > 0 && (
                      <div
                        style={{
                          width: "85%",
                          height: `${(value / 100) * 90}px`,
                          background: color,
                          borderRadius: "4px 4px 0 0",
                          boxShadow: `0 0 12px ${color}, 0 -2px 0 rgba(0,0,0,0.2) inset`,
                          transition: "height 400ms ease",
                          border: "1.5px solid #170826",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: value > 0 ? color : "var(--ink-mute)",
                      fontFamily: "var(--f-display)",
                      fontWeight: 700,
                    }}
                  >
                    {value ? value + "%" : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-mute)", marginTop: 6, padding: "0 4px", fontFamily: "var(--f-display)", letterSpacing: 0.6 }}>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
            <span>SUN</span>
          </div>
        </div>
      </div>

      {/* Weakness Radar — Wave 3 */}
      <WeaknessRadarCard radar={radar} />

      {/* Two-col: Sessions Table + Recommendations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent tutor sessions */}
        <div className="panel" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-cyan)" }}>Recent tutor sessions</span>
          <table style={{ width: "100%", fontSize: 12, marginTop: 14, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Subject", "Topic", "Duration", "Score"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 10,
                      color: "var(--ink-mute)",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      paddingBottom: 10,
                      fontWeight: 700,
                      fontFamily: "var(--f-display)",
                      borderBottom: "2px solid var(--line-soft)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { subject: "Math", topic: "Linear equations", duration: "32 min", score: "92%", scoreBg: "rgba(166,255,59,0.18)", scoreColor: "var(--neon-lime)" },
                { subject: "Science", topic: "Cell division", duration: "28 min", score: "88%", scoreBg: "rgba(166,255,59,0.18)", scoreColor: "var(--neon-lime)" },
                { subject: "English", topic: "Narrative voice", duration: "22 min", score: "79%", scoreBg: "rgba(255,229,61,0.18)", scoreColor: "var(--neon-yel)" },
                { subject: "History", topic: "World War I", duration: "35 min", score: "85%", scoreBg: "rgba(166,255,59,0.18)", scoreColor: "var(--neon-lime)" },
                { subject: "Math", topic: "Introduction to algebra", duration: "40 min", score: "96%", scoreBg: "rgba(166,255,59,0.18)", scoreColor: "var(--neon-lime)" },
              ].map((session, i) => (
                <tr key={i} style={{ borderBottom: "1.5px solid var(--line-soft)" }}>
                  <td style={{ padding: "10px 0", color: "var(--ink)", fontWeight: 700 }}>{session.subject}</td>
                  <td style={{ padding: "10px 0", color: "var(--ink-dim)" }}>{session.topic}</td>
                  <td style={{ padding: "10px 0", color: "var(--ink-mute)" }}>{session.duration}</td>
                  <td style={{ padding: "10px 0" }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontWeight: 800,
                        fontFamily: "var(--f-display)",
                        background: session.scoreBg,
                        color: session.scoreColor,
                        border: `1.5px solid ${session.scoreColor}`,
                        letterSpacing: 0.5,
                      }}
                    >
                      {session.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommended next */}
        <div className="panel yel" style={{ padding: 18 }}>
          <span className="label" style={{ color: "var(--neon-yel)" }}>Recommended next</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {recommendations.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-mute)", padding: 8 }}>
                No recommendations yet — complete a chapter to unlock the next one.
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={`${rec.subject_id}-${rec.chapter_id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1.5px solid var(--line-soft)",
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: rec.dot,
                      boxShadow: `0 0 10px ${rec.dot}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 700, fontFamily: "var(--f-display)" }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 2 }}>{rec.sub}</div>
                  </div>
                  <a
                    href={`/learn/${rec.subject_id}/${rec.chapter_id}`}
                    className="chunky-btn"
                    style={{
                      fontSize: 11,
                      padding: "6px 12px",
                      background: "var(--neon-yel)",
                      color: "#170826",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      border: "2px solid #170826",
                      borderRadius: 10,
                      boxShadow: "0 3px 0 0 #170826, 0 0 12px rgba(255,229,61,0.5)",
                      fontFamily: "var(--f-display)",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Start →
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}

function WeaknessRadarCard({ radar }: { radar: WeaknessRadar | null }) {
  if (!radar) return null;
  const subjects = radar.subjects.filter((s) => (s.score ?? 0) > 0 || s.chapters_completed > 0);
  const hasData = subjects.length > 0 || radar.top_weaknesses.length > 0;
  if (!hasData) return null;

  // Polygon radar — needs >=3 subjects with a score; otherwise show bars only
  const radarPoints = subjects.filter((s) => s.score != null);
  const showRadar = radarPoints.length >= 3;

  const SIZE = 240;
  const CENTER = SIZE / 2;
  const RADIUS = 86;
  const RINGS = [0.25, 0.5, 0.75, 1];

  const polarCoord = (i: number, n: number, value01: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = RADIUS * value01;
    return { x: CENTER + Math.cos(angle) * r, y: CENTER + Math.sin(angle) * r };
  };

  const masteryPoly = showRadar
    ? radarPoints
        .map((s, i) => {
          const v = Math.max(0.05, Math.min(1, (s.score ?? 0) / 100));
          const { x, y } = polarCoord(i, radarPoints.length, v);
          return `${x},${y}`;
        })
        .join(" ")
    : "";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
      {/* Mastery radar */}
      <div className="panel" style={{ padding: 18 }}>
        <span className="label" style={{ color: "var(--neon-vio)" }}>Mastery radar</span>
        {showRadar ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12 }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {/* Rings */}
              {RINGS.map((r) => (
                <circle
                  key={r}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS * r}
                  fill="none"
                  stroke="rgba(155, 92, 255, 0.18)"
                  strokeWidth={1}
                />
              ))}
              {/* Spokes + labels */}
              {radarPoints.map((s, i) => {
                const { x, y } = polarCoord(i, radarPoints.length, 1);
                const label = polarCoord(i, radarPoints.length, 1.18);
                return (
                  <g key={s.subject_id}>
                    <line
                      x1={CENTER}
                      y1={CENTER}
                      x2={x}
                      y2={y}
                      stroke="rgba(155, 92, 255, 0.18)"
                      strokeWidth={1}
                    />
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="var(--ink-mute)"
                      fontFamily="var(--f-display)"
                      fontWeight={700}
                    >
                      {s.subject_name.length > 10
                        ? s.subject_name.slice(0, 9) + "…"
                        : s.subject_name}
                    </text>
                  </g>
                );
              })}
              {/* Mastery polygon */}
              <polygon
                points={masteryPoly}
                fill="rgba(39, 224, 255, 0.25)"
                stroke="#27e0ff"
                strokeWidth={2}
                style={{ filter: "drop-shadow(0 0 8px rgba(39,224,255,0.55))" }}
              />
              {radarPoints.map((s, i) => {
                const v = Math.max(0.05, Math.min(1, (s.score ?? 0) / 100));
                const { x, y } = polarCoord(i, radarPoints.length, v);
                return (
                  <circle
                    key={s.subject_id}
                    cx={x}
                    cy={y}
                    r={4}
                    fill="#27e0ff"
                    stroke="#170826"
                    strokeWidth={1.5}
                  />
                );
              })}
            </svg>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {subjects.map((s) => {
              const score = s.score ?? 0;
              const color =
                score >= 80 ? "var(--neon-lime)" : score >= 60 ? "var(--neon-cyan)" : "var(--neon-yel)";
              return (
                <div key={s.subject_id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: "var(--f-display)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--ink)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {s.subject_name}
                    </span>
                    <span style={{ fontSize: 11, color, fontWeight: 800, fontFamily: "var(--f-display)" }}>
                      {score ? `${score}%` : "—"}
                    </span>
                  </div>
                  <PixelBar value={score} color={color} height={8} />
                </div>
              );
            })}
            {subjects.length < 3 && (
              <p style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 4 }}>
                Complete a few more chapters to unlock the radar view.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top weak topics */}
      <div className="panel mag" style={{ padding: 18 }}>
        <span className="label" style={{ color: "var(--neon-mag)" }}>Topics to revisit</span>
        {radar.top_weaknesses.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 12 }}>
            No recurring weak spots yet — keep going!
          </p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, padding: 0, listStyle: "none" }}>
            {radar.top_weaknesses.map((w) => {
              const intensity = Math.min(1, w.count / 3);
              const dot = `rgba(255, 122, 43, ${0.4 + intensity * 0.6})`;
              return (
                <li
                  key={w.topic}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1.5px solid var(--line-soft)",
                    borderRadius: 12,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      flexShrink: 0,
                      background: dot,
                      boxShadow: `0 0 10px ${dot}`,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {w.topic}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--neon-ora)",
                      fontWeight: 800,
                      fontFamily: "var(--f-display)",
                    }}
                  >
                    ×{w.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
