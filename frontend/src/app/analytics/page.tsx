"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
  "Mathematics": "#5b5eff",
  "Physics": "#1d9e75",
  "Chemistry": "#ef9f27",
  "Biology": "#1d9e75",
  "Science": "#1d9e75",
  "English": "#ef9f27",
  "History": "#e24b4a",
};

const SUBJECT_BADGES: Record<string, string> = {
  "Mathematics": "badge-math",
  "Physics": "badge-sci",
  "Chemistry": "badge-eng",
  "Biology": "badge-sci",
  "Science": "badge-sci",
  "English": "badge-eng",
  "History": "badge-hist",
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

      const [progressRes, profileRes, radarRes] = await Promise.all([
        fetch(`/api/proxy/api/progress/${user?.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/proxy/api/onboarding/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/proxy/api/progress/weakness-radar`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (radarRes.ok) {
        setRadar(await radarRes.json());
      }

      if (progressRes.ok) {
        const data = await progressRes.json();
        const subjectList: SubjectProgress[] = data.subjects || [];
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
                dot: SUBJECT_COLORS[s.subject_name] || "#5b5eff",
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
      <div className="flex min-h-[calc(100vh-54px)] items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading progress…</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${today.getFullYear()}`;

  return (
    <div className="min-h-[calc(100vh-54px)] bg-[var(--bg-base)] flex">
      {/* Sidebar */}
      <div className="w-[200px] bg-[var(--bg-deep)] border-r border-[var(--border)] flex flex-col shrink-0 p-5">
        {/* View Filters */}
        <div className="mb-6">
          <p className="text-[10px] text-[var(--text-faint)] font-[500] uppercase tracking-wider mb-3">
            View
          </p>
          <div className="space-y-1">
            {["Overview", "By subject", "Tutor sessions", "Quiz history"].map((view) => (
              <div
                key={view}
                onClick={() => setViewFilter(view)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer rounded transition-all",
                  viewFilter === view
                    ? "bg-[#111520] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[#111520]"
                )}
              >
                {view}
              </div>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <p className="text-[10px] text-[var(--text-faint)] font-[500] uppercase tracking-wider mb-3">
            Time Range
          </p>
          <div className="space-y-1">
            {["This week", "This month", "All time"].map((range) => (
              <div
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer rounded transition-all",
                  timeRange === range
                    ? "bg-[#111520] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[#111520]"
                )}
              >
                {range}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="shrink-0 px-6 py-6 border-b border-[var(--border)] bg-[var(--bg-base)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-[500] text-white">Your progress</h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">
                Grade {userGrade} • {weekLabel}
              </p>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {weekLabel}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Stats Cards — 4 column grid */}
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            {/* Lessons completed */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a8aaee" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M4 19L8 5l4 8 4-6 4 12"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.lessonsCompleted}</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Lessons completed</div>
              <div className="text-[11px] text-[#1d9e75]">↑ 3 this week</div>
            </div>

            {/* Quiz accuracy */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[#0f2a1f] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1d9e75" strokeWidth="1.5" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.accuracy}%</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Quiz accuracy</div>
              <div className="text-[11px] text-[#1d9e75]">↑ 6% vs last week</div>
            </div>

            {/* AI tutor sessions */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[var(--accent-soft)] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5b5eff" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.sessions}</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-1">AI tutor sessions</div>
              <div className="text-[11px] text-[var(--text-muted)]">6.4 hrs total</div>
            </div>

            {/* Day streak */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[#1f1a0f] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef9f27" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.streak}</div>
              <div className="text-[11px] text-[var(--text-muted)] mb-1">Day streak</div>
              <div className="flex gap-1 flex-wrap mt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-5 h-5 rounded text-[9px] flex items-center justify-center font-[500]",
                      i === 6
                        ? "bg-[var(--accent)] text-white"
                        : i < 6
                        ? "bg-[#3d3faa] text-[var(--accent)]"
                        : "bg-[var(--bg-raised)] text-[var(--text-faint)]"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Two-col: Subject Progress + Weekly Accuracy */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Subject progress */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="text-[11px] text-[var(--text-muted)] font-[500] uppercase tracking-wider mb-3">
                Subject progress
              </div>
              <div className="space-y-2.5">
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <div key={subject.subject_id} className="flex items-center gap-2.5">
                      <span className="text-[12px] text-[var(--text-body)] w-24 flex-shrink-0">{subject.subject_name}</span>
                      <div className="flex-1 h-1.5 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${subject.progress_percent}%`,
                            background: SUBJECT_COLORS[subject.subject_name] || "#5b5eff",
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] w-8 text-right">{subject.progress_percent}%</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-2xl ${SUBJECT_BADGES[subject.subject_name] || 'badge-math'} bg-[var(--accent-soft)] text-[var(--accent)]`}>
                        {subject.chapters_completed}/{subject.total_chapters}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-[var(--text-muted)]">No subjects yet.</p>
                )}
              </div>
            </div>

            {/* Weekly accuracy bar chart */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="text-[11px] text-[var(--text-muted)] font-[500] uppercase tracking-wider mb-3">
                Weekly quiz accuracy
              </div>
              <div className="flex items-end gap-2 h-20 justify-between px-0.5">
                {weekData.map((value, i) => {
                  const height = value || 4;
                  let color = "#1e2330";
                  if (value >= 85) color = "#1d9e75";
                  else if (value >= 70) color = "#3d3faa";
                  else if (value > 0) color = "#ef9f27";

                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-full h-14 bg-[var(--bg-raised)] rounded-t-lg flex items-end justify-center">
                        {value > 0 && (
                          <div
                            className="w-full transition-all rounded-t-lg"
                            style={{
                              height: `${(value / 100) * 56}px`,
                              background: color,
                            }}
                          />
                        )}
                      </div>
                      <span className="text-[9px] text-[var(--text-faint)]">{value ? value + '%' : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-faint)] mt-2 px-0.5">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          {/* Weakness Radar — Wave 3 */}
          <WeaknessRadarCard radar={radar} />

          {/* Two-col: Sessions Table + Recommendations */}
          <div className="grid grid-cols-2 gap-3">
            {/* Recent tutor sessions */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="text-[11px] text-[var(--text-muted)] font-[500] uppercase tracking-wider mb-3">
                Recent tutor sessions
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-[var(--text-muted)] font-[500] uppercase tracking-wider pb-2 font-normal">Subject</th>
                    <th className="text-left text-[10px] text-[var(--text-muted)] font-[500] uppercase tracking-wider pb-2 font-normal">Topic</th>
                    <th className="text-left text-[10px] text-[var(--text-muted)] font-[500] uppercase tracking-wider pb-2 font-normal">Duration</th>
                    <th className="text-left text-[10px] text-[var(--text-muted)] font-[500] uppercase tracking-wider pb-2 font-normal">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { subject: "Math", topic: "Linear equations", duration: "32 min", score: "92%", scoreColor: "bg-[#0f2a1f] text-[#5dcaa5]" },
                    { subject: "Science", topic: "Cell division", duration: "28 min", score: "88%", scoreColor: "bg-[#0f2a1f] text-[#5dcaa5]" },
                    { subject: "English", topic: "Narrative voice", duration: "22 min", score: "79%", scoreColor: "bg-[#1f1a0f] text-[#ef9f27]" },
                    { subject: "History", topic: "World War I", duration: "35 min", score: "85%", scoreColor: "bg-[#0f2a1f] text-[#5dcaa5]" },
                    { subject: "Math", topic: "Introduction to algebra", duration: "40 min", score: "96%", scoreColor: "bg-[#0f2a1f] text-[#5dcaa5]" },
                  ].map((session, i) => (
                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--bg-raised)]">
                      <td className="py-2 text-[var(--text-body)]">{session.subject}</td>
                      <td className="py-2 text-[var(--text-muted)]">{session.topic}</td>
                      <td className="py-2 text-[var(--text-muted)]">{session.duration}</td>
                      <td className="py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-[500] ${session.scoreColor}`}>
                          {session.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recommended next */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
              <div className="text-[11px] text-[var(--text-muted)] font-[500] uppercase tracking-wider mb-3">
                Recommended next
              </div>
              <div className="space-y-2">
                {recommendations.length === 0 ? (
                  <div className="text-[12px] text-[var(--text-muted)] py-2">
                    No recommendations yet — complete a chapter to unlock the next one.
                  </div>
                ) : (
                  recommendations.map((rec) => (
                    <div key={`${rec.subject_id}-${rec.chapter_id}`} className="flex items-center gap-2.5 bg-[var(--bg-raised)] rounded-2xl p-2.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: rec.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-[var(--text-body)] font-[500]">{rec.title}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{rec.sub}</div>
                      </div>
                      <a
                        href={`/learn/${rec.subject_id}/${rec.chapter_id}`}
                        className="text-[11px] text-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap"
                      >
                        Start →
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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

  const SIZE = 220;
  const CENTER = SIZE / 2;
  const RADIUS = 80;
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
    <div className="grid grid-cols-2 gap-3 mb-3">
      {/* Mastery radar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
        <div className="text-[11px] text-[var(--text-muted)] font-[500] uppercase tracking-wider mb-3">
          Mastery radar
        </div>
        {showRadar ? (
          <div className="flex items-center justify-center">
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {/* Rings */}
              {RINGS.map((r) => (
                <circle
                  key={r}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS * r}
                  fill="none"
                  stroke="var(--border)"
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
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="var(--text-muted)"
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
                fill="rgba(91, 94, 255, 0.25)"
                stroke="#5b5eff"
                strokeWidth={2}
              />
              {radarPoints.map((s, i) => {
                const v = Math.max(0.05, Math.min(1, (s.score ?? 0) / 100));
                const { x, y } = polarCoord(i, radarPoints.length, v);
                return (
                  <circle key={s.subject_id} cx={x} cy={y} r={3} fill="#5b5eff" />
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="space-y-2">
            {subjects.map((s) => {
              const score = s.score ?? 0;
              const color =
                score >= 80 ? "#1d9e75" : score >= 60 ? "#5b5eff" : "#ef9f27";
              return (
                <div key={s.subject_id} className="flex items-center gap-2.5">
                  <span className="text-[12px] text-[var(--text-body)] w-24 truncate">
                    {s.subject_name}
                  </span>
                  <div className="flex-1 h-1.5 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${score}%`, background: color }}
                    />
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] w-10 text-right">
                    {score ? `${score}%` : "—"}
                  </span>
                </div>
              );
            })}
            {subjects.length < 3 && (
              <p className="text-[10px] text-[var(--text-faint)] mt-2">
                Complete a few more chapters to unlock the radar view.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top weak topics */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4">
        <div className="text-[11px] text-[var(--text-muted)] font-[500] uppercase tracking-wider mb-3">
          Topics to revisit
        </div>
        {radar.top_weaknesses.length === 0 ? (
          <p className="text-[12px] text-[var(--text-muted)]">
            No recurring weak spots yet — keep going!
          </p>
        ) : (
          <ul className="space-y-2">
            {radar.top_weaknesses.map((w) => {
              const intensity = Math.min(1, w.count / 3);
              return (
                <li
                  key={w.topic}
                  className="flex items-center gap-2.5 bg-[var(--bg-raised)] rounded-2xl px-3 py-2"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: `rgba(239, 159, 39, ${0.4 + intensity * 0.6})`,
                    }}
                  />
                  <span className="text-[12px] text-[var(--text-body)] flex-1 truncate">
                    {w.topic}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-[500]">
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
