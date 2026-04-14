"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getWorkspace, type Workspace } from "@/lib/learning-os";
import type { ProgressResponse, SubjectProgress } from "@/types/student";

interface SentimentEntry {
  emotion: string;
  confidence: number;
  action_taken: string | null;
  timestamp: string;
  chapter_id: string | null;
}

const EMOTION_CONFIG: Record<string, { hex: string; dot: string; label: string; emoji: string; color: string }> = {
  engaged:    { hex: "#22c55e",  dot: "bg-green-500",   label: "Engaged",    emoji: "🎯", color: "text-green-400"   },
  happy:      { hex: "#10b981",  dot: "bg-emerald-400", label: "Happy",      emoji: "😊", color: "text-emerald-400" },
  confused:   { hex: "#eab308",  dot: "bg-yellow-400",  label: "Confused",   emoji: "🤔", color: "text-yellow-400"  },
  bored:      { hex: "#f97316",  dot: "bg-orange-400",  label: "Bored",      emoji: "😐", color: "text-orange-400"  },
  frustrated: { hex: "#ef4444",  dot: "bg-red-500",     label: "Frustrated", emoji: "😤", color: "text-red-400"     },
  drowsy:     { hex: "#64748b",  dot: "bg-slate-500",   label: "Drowsy",     emoji: "😴", color: "text-slate-400"   },
};

// All emotion keys used for the area chart layers
const EMOTION_KEYS = Object.keys(EMOTION_CONFIG);

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 text-center">
      <p className={cn("text-4xl font-bold", color)}>{value}</p>
      <p className="text-xs text-white/40 mt-1.5 font-medium">{label}</p>
    </div>
  );
}

/** Build time-bucketed data for the sentiment area chart (30-minute windows). */
function buildSentimentTimeline(logs: SentimentEntry[]) {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const buckets: Record<string, Record<string, number>> = {};
  for (const entry of sorted) {
    const d = new Date(entry.timestamp);
    // 30-minute bucket key
    d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
    const key = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!buckets[key]) buckets[key] = {};
    buckets[key][entry.emotion] = (buckets[key][entry.emotion] ?? 0) + 1;
  }

  return Object.entries(buckets).map(([time, counts]) => ({ time, ...counts }));
}

// Custom dark tooltip for recharts
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1424] border border-white/[0.1] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50 mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-white/70 capitalize">{p.name}</span>
          <span className="text-white font-semibold ml-auto pl-3">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [sentimentLogs, setSentimentLogs] = useState<SentimentEntry[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchSentiment() {
    try {
      const logs = await apiGet<SentimentEntry[]>("/api/video/sentiment/history?limit=200", 0);
      setSentimentLogs(logs);
    } catch { /* silent */ }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSentiment();
    setRefreshing(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    Promise.allSettled([
      apiGet<ProgressResponse>(`/api/progress/${user.id}`, 20_000),
      apiGet<SentimentEntry[]>("/api/video/sentiment/history?limit=200", 0),
      getWorkspace(),
    ]).then(([progressResult, sentimentResult, workspaceResult]) => {
      if (progressResult.status === "fulfilled") setSubjects(progressResult.value.subjects);
      else setError("Failed to load progress. Please try again.");
      if (sentimentResult.status === "fulfilled") setSentimentLogs(sentimentResult.value);
      if (workspaceResult.status === "fulfilled") setWorkspace(workspaceResult.value);
    }).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  // ── Supabase Realtime: live sentiment updates ─────────────────────────────
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof import("@/lib/supabase")["supabase"]["channel"]> | null = null;

    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`analytics:sentiment:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "sentiment_logs",
            filter: `student_id=eq.${user.id}`,
          },
          () => {
            // Refetch full history so the list is always consistent
            fetchSentiment();
            setLiveIndicator(true);
            setTimeout(() => setLiveIndicator(false), 2000);
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        import("@/lib/supabase").then(({ supabase }) => supabase.removeChannel(channel!));
      }
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] bg-[#080d1a] items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const activeSubjects = subjects.filter((s) => s.total_chapters > 0);
  const totalChaptersDone = subjects.reduce((sum, s) => sum + s.chapters_completed, 0);
  const totalChapters = subjects.reduce((sum, s) => sum + s.total_chapters, 0);
  const scoredSubjects = subjects.filter((s) => s.average_score !== null);
  const avgScore = scoredSubjects.length
    ? Math.round(scoredSubjects.reduce((sum, s) => sum + (s.average_score ?? 0), 0) / scoredSubjects.length)
    : null;

  const allStrengths = subjects.flatMap((s) => s.strengths ?? []);
  const allWeaknesses = subjects.flatMap((s) => s.weaknesses ?? []);

  // Chart data
  const scoreBarData = scoredSubjects.map((s) => ({
    name: s.subject_name.length > 10 ? s.subject_name.slice(0, 10) + "…" : s.subject_name,
    score: Math.round(s.average_score ?? 0),
    fill: (s.average_score ?? 0) >= 80 ? "#22c55e" : (s.average_score ?? 0) >= 60 ? "#eab308" : "#ef4444",
  }));

  const emotionCounts: Record<string, number> = {};
  for (const e of sentimentLogs) emotionCounts[e.emotion] = (emotionCounts[e.emotion] ?? 0) + 1;
  const pieData = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, fill: EMOTION_CONFIG[name]?.hex ?? "#64748b" }));

  const timelineData = buildSentimentTimeline(sentimentLogs.slice(0, 100));

  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#080d1a] px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Your Progress</h1>
            <p className="text-sm text-white/40 mt-1">Track mastery, streaks, and achievements across all subjects.</p>
          </div>
          <div className="flex items-center gap-2">
            {liveIndicator && (
              <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live update
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.05] transition-all disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={refreshing ? "animate-spin" : ""}>
                <path d="M10 6A4 4 0 112 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M10 3v3h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Workspace stats row */}
        <section className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard value={workspace ? workspace.learner.xp.toLocaleString() : "—"} label="Total XP" color="text-amber-400" />
          <StatCard value={workspace ? `Level ${workspace.learner.level}` : "—"} label="Current Level" color="text-blue-400" />
          <StatCard value={workspace ? `${workspace.learner.streak_days} 🔥` : "—"} label="Day Streak" color="text-orange-400" />
          <StatCard value={workspace ? `${Math.round(workspace.analytics.average_mastery * 100)}%` : avgScore !== null ? `${avgScore}%` : "—"} label="Avg Mastery" color="text-emerald-400" />
        </section>

        {/* Achievements */}
        {workspace && workspace.achievements.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workspace.achievements.map((a) => (
                <div key={a.code} className="bg-gradient-to-br from-amber-950/60 to-orange-950/60 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-lg">🏆</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-300">{a.title}</p>
                    <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mastery snapshot */}
        {workspace && workspace.mastery_snapshot.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Topic Mastery</h2>
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-6 space-y-4">
              {workspace.mastery_snapshot.slice(0, 8).map((t) => {
                const pct = Math.round(t.score * 100);
                const barColor = pct >= 80 ? "from-emerald-500 to-green-400" : pct >= 50 ? "from-blue-500 to-blue-400" : "from-orange-500 to-amber-400";
                const trendIcon = t.trend === "improving" ? "↑" : t.trend === "declining" ? "↓" : "→";
                const trendColor = t.trend === "improving" ? "text-emerald-400" : t.trend === "declining" ? "text-red-400" : "text-white/30";
                return (
                  <div key={t.topic_id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-white/80 truncate">{t.title}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={cn("text-xs font-bold", trendColor)}>{trendIcon}</span>
                          <span className="text-white/40">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div className={cn("h-full bg-gradient-to-r rounded-full transition-all duration-700", barColor)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Score bar chart ── */}
        {scoreBarData.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Score by Subject</h2>
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreBarData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {scoreBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 justify-center text-xs text-white/30">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />≥80%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />60–79%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />&lt;60%</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Per-subject progress bars ── */}
        {activeSubjects.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Chapter Progress</h2>
            <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-6 space-y-5">
              {activeSubjects.map((s) => {
                const pct = s.total_chapters > 0 ? Math.round((s.chapters_completed / s.total_chapters) * 100) : 0;
                return (
                  <div key={s.subject_id} className="flex items-center gap-4">
                    <span className="text-xl w-8 flex-shrink-0">{SUBJECT_EMOJIS[s.subject_name] ?? "📚"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-white/80">{s.subject_name}</span>
                        <span className="text-white/40">{s.chapters_completed} / {s.total_chapters}</span>
                      </div>
                      <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {s.average_score !== null && (
                      <span className="text-sm font-bold text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2.5 py-1 rounded-full flex-shrink-0">
                        {Math.round(s.average_score)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Sentiment section ── */}
        {sentimentLogs.length > 0 && (
          <>
            {/* Emotion timeline area chart */}
            {timelineData.length > 1 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                  Engagement Timeline
                  <span className="ml-2 text-white/25 font-normal normal-case">30-min buckets</span>
                </h2>
                <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<DarkTooltip />} />
                      {EMOTION_KEYS.map((key) => (
                        <Area
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stackId="1"
                          stroke={EMOTION_CONFIG[key].hex}
                          fill={EMOTION_CONFIG[key].hex}
                          fillOpacity={0.6}
                          strokeWidth={1.5}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Pie chart + recent readings side by side */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                Emotion Distribution
                <span className="ml-2 text-white/25 font-normal normal-case">· {sentimentLogs.length} readings</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Donut chart */}
                <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, EMOTION_CONFIG[String(name)]?.label ?? name]}
                        contentStyle={{ background: "#0d1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                        itemStyle={{ color: "rgba(255,255,255,0.8)" }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
                            {EMOTION_CONFIG[value]?.emoji} {EMOTION_CONFIG[value]?.label ?? value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent readings list */}
                <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recent Readings</p>
                    {liveIndicator && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-white/[0.04] max-h-[220px] overflow-y-auto">
                    {sentimentLogs.slice(0, 12).map((entry, i) => {
                      const cfg = EMOTION_CONFIG[entry.emotion];
                      return (
                        <div key={i} className="px-5 py-2.5 flex items-center gap-3">
                          <span className="text-base">{cfg?.emoji ?? "😶"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm font-medium", cfg?.color ?? "text-white/60")}>
                                {cfg?.label ?? entry.emotion}
                              </span>
                              <span className="text-xs text-white/25">
                                {Math.round(entry.confidence * 100)}%
                              </span>
                            </div>
                            {entry.action_taken && (
                              <p className="text-xs text-white/25 truncate mt-0.5">{entry.action_taken}</p>
                            )}
                          </div>
                          <span className="text-xs text-white/20 shrink-0">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}



        {/* Learning profile */}
        {(allStrengths.length > 0 || allWeaknesses.length > 0) && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Learning Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allStrengths.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-3">Strengths</h3>
                  <ul className="space-y-2">
                    {allStrengths.map((s, i) => (
                      <li key={i} className="text-sm text-white/60 flex gap-2 items-start">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {allWeaknesses.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-3">Areas to Improve</h3>
                  <ul className="space-y-2">
                    {allWeaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-white/60 flex gap-2 items-start">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {subjects.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
                <path d="M2 12l3.5-4 3 2.5 3-5.5 2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="font-medium text-white/50">No data yet.</p>
            <p className="text-sm text-white/30 mt-1 mb-4">Generate a curriculum and start learning to see your analytics.</p>
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
            >
              Go to Dashboard →
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
