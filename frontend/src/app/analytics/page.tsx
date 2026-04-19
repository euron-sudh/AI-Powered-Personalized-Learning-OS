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

      const [progressRes, profileRes] = await Promise.all([
        fetch(`/api/proxy/api/progress/${user?.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/proxy/api/onboarding/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (progressRes.ok) {
        const data = await progressRes.json();
        const subjectList: SubjectProgress[] = data.subjects || [];
        setSubjects(subjectList);
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
      <div className="flex min-h-[calc(100vh-54px)] items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
          <p className="text-[#6b7280] text-sm">Loading progress…</p>
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
    <div className="min-h-[calc(100vh-54px)] bg-[#0d1117] flex">
      {/* Sidebar */}
      <div className="w-[200px] bg-[#0a0d14] border-r border-[#1a1f2e] flex flex-col shrink-0 p-5">
        {/* View Filters */}
        <div className="mb-6">
          <p className="text-[10px] text-[#3a3f55] font-[500] uppercase tracking-wider mb-3">
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
                    ? "bg-[#111520] text-[#a8aaee]"
                    : "text-[#6b7280] hover:text-[#c5c9d6] hover:bg-[#111520]"
                )}
              >
                {view}
              </div>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div>
          <p className="text-[10px] text-[#3a3f55] font-[500] uppercase tracking-wider mb-3">
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
                    ? "bg-[#111520] text-[#a8aaee]"
                    : "text-[#6b7280] hover:text-[#c5c9d6] hover:bg-[#111520]"
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
        <div className="shrink-0 px-6 py-6 border-b border-[#1a1f2e] bg-[#0d1117]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-[500] text-white">Your progress</h2>
              <p className="text-[12px] text-[#6b7280] mt-1">
                Grade {userGrade} • {weekLabel}
              </p>
            </div>
            <div className="text-[11px] text-[#6b7280]">
              {weekLabel}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Stats Cards — 4 column grid */}
          <div className="grid grid-cols-4 gap-2.5 mb-5">
            {/* Lessons completed */}
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[#1a1f35] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a8aaee" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M4 19L8 5l4 8 4-6 4 12"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.lessonsCompleted}</div>
              <div className="text-[11px] text-[#6b7280] mb-1">Lessons completed</div>
              <div className="text-[11px] text-[#1d9e75]">↑ 3 this week</div>
            </div>

            {/* Quiz accuracy */}
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[#0f2a1f] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1d9e75" strokeWidth="1.5" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.accuracy}%</div>
              <div className="text-[11px] text-[#6b7280] mb-1">Quiz accuracy</div>
              <div className="text-[11px] text-[#1d9e75]">↑ 6% vs last week</div>
            </div>

            {/* AI tutor sessions */}
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[#1a1f35] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#5b5eff" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.sessions}</div>
              <div className="text-[11px] text-[#6b7280] mb-1">AI tutor sessions</div>
              <div className="text-[11px] text-[#6b7280]">6.4 hrs total</div>
            </div>

            {/* Day streak */}
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="w-8 h-8 rounded-2xl bg-[#1f1a0f] flex items-center justify-center mb-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef9f27" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
                </svg>
              </div>
              <div className="text-2xl font-[500] text-white leading-none mb-1">{stats.streak}</div>
              <div className="text-[11px] text-[#6b7280] mb-1">Day streak</div>
              <div className="flex gap-1 flex-wrap mt-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-5 h-5 rounded text-[9px] flex items-center justify-center font-[500]",
                      i === 6
                        ? "bg-[#5b5eff] text-white"
                        : i < 6
                        ? "bg-[#3d3faa] text-[#a8aaee]"
                        : "bg-[#1e2330] text-[#3a3f55]"
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
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="text-[11px] text-[#6b7280] font-[500] uppercase tracking-wider mb-3">
                Subject progress
              </div>
              <div className="space-y-2.5">
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <div key={subject.subject_id} className="flex items-center gap-2.5">
                      <span className="text-[12px] text-[#c5c9d6] w-24 flex-shrink-0">{subject.subject_name}</span>
                      <div className="flex-1 h-1.5 bg-[#1e2330] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${subject.progress_percent}%`,
                            background: SUBJECT_COLORS[subject.subject_name] || "#5b5eff",
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[#6b7280] w-8 text-right">{subject.progress_percent}%</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-2xl ${SUBJECT_BADGES[subject.subject_name] || 'badge-math'} bg-[#1a1f35] text-[#a8aaee]`}>
                        {subject.chapters_completed}/{subject.total_chapters}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-[#6b7280]">No subjects yet.</p>
                )}
              </div>
            </div>

            {/* Weekly accuracy bar chart */}
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="text-[11px] text-[#6b7280] font-[500] uppercase tracking-wider mb-3">
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
                      <div className="w-full h-14 bg-[#1e2330] rounded-t-lg flex items-end justify-center">
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
                      <span className="text-[9px] text-[#3a3f55]">{value ? value + '%' : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[#3a3f55] mt-2 px-0.5">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          {/* Two-col: Sessions Table + Recommendations */}
          <div className="grid grid-cols-2 gap-3">
            {/* Recent tutor sessions */}
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="text-[11px] text-[#6b7280] font-[500] uppercase tracking-wider mb-3">
                Recent tutor sessions
              </div>
              <table className="w-full text-[12px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-[#6b7280] font-[500] uppercase tracking-wider pb-2 font-normal">Subject</th>
                    <th className="text-left text-[10px] text-[#6b7280] font-[500] uppercase tracking-wider pb-2 font-normal">Topic</th>
                    <th className="text-left text-[10px] text-[#6b7280] font-[500] uppercase tracking-wider pb-2 font-normal">Duration</th>
                    <th className="text-left text-[10px] text-[#6b7280] font-[500] uppercase tracking-wider pb-2 font-normal">Score</th>
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
                    <tr key={i} className="border-t border-[#1a1f2e] hover:bg-[#1e2330]">
                      <td className="py-2 text-[#c5c9d6]">{session.subject}</td>
                      <td className="py-2 text-[#6b7280]">{session.topic}</td>
                      <td className="py-2 text-[#6b7280]">{session.duration}</td>
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
            <div className="bg-[#161b27] border border-[#1a1f2e] rounded-3xl p-4">
              <div className="text-[11px] text-[#6b7280] font-[500] uppercase tracking-wider mb-3">
                Recommended next
              </div>
              <div className="space-y-2">
                {[
                  { dot: "#5b5eff", title: "Systems of equations", sub: "Math · Lesson 3" },
                  { dot: "#1d9e75", title: "Genetics & DNA", sub: "Science · Lesson 3" },
                  { dot: "#ef9f27", title: "Essay argumentation", sub: "English · Lesson 2" },
                  { dot: "#e24b4a", title: "The Great War", sub: "History · Lesson 2" },
                ].map((rec, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-[#1e2330] rounded-2xl p-2.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: rec.dot }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#c5c9d6] font-[500]">{rec.title}</div>
                      <div className="text-[11px] text-[#6b7280]">{rec.sub}</div>
                    </div>
                    <a href="/learn" className="text-[11px] text-[#5b5eff] hover:text-[#a8aaee] whitespace-nowrap">
                      Start →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
