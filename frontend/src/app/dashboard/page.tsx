"use client";

import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import Nav from "@/components/Nav";
import Link from "next/link";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-[var(--bg-base)]" />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Nav />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, Ravi!</h1>
          <p className="text-[var(--text-muted)]">Here's your learning journey today</p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Lessons Done", value: "9", icon: "📚" },
            { label: "Avg Score", value: "92%", icon: "⭐" },
            { label: "Day Streak", value: "7 days", icon: "🔥" },
            { label: "Total XP", value: "2,450", icon: "✨" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[var(--bg-surface)] border border-[var(--bg-raised)] rounded-xl p-6"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-[12px] text-[var(--text-muted)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CONTENT GRID */}
        <div className="grid grid-cols-3 gap-6">
          {/* CONTINUE LEARNING */}
          <div className="col-span-2">
            <h2 className="text-lg font-bold text-white mb-4">Continue Learning</h2>
            <div className="space-y-3">
              {[
                {
                  subject: "Mathematics",
                  chapter: "Linear Equations & Graphing",
                  progress: 60,
                  timeLeft: "~20 min",
                  color: "#5b5eff",
                },
                {
                  subject: "Science",
                  chapter: "Photosynthesis & Respiration",
                  progress: 40,
                  timeLeft: "~35 min",
                  color: "#1d9e75",
                },
                {
                  subject: "English",
                  chapter: "Literary Analysis",
                  progress: 75,
                  timeLeft: "~15 min",
                  color: "#ef9f27",
                },
              ].map((item, i) => (
                <Link
                  key={i}
                  href="/learn"
                  className="block bg-[var(--bg-surface)] border border-[var(--bg-raised)] rounded-xl p-4 hover:border-[var(--border-mid)] transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-[12px] font-[500]" style={{ color: item.color }}>
                        {item.subject}
                      </div>
                      <div className="text-[14px] font-[500] text-white">{item.chapter}</div>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">⏱️ {item.timeLeft}</div>
                  </div>
                  <div className="h-2 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        backgroundColor: item.color,
                        width: `${item.progress}%`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-2">{item.progress}% complete</div>
                </Link>
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/learn"
                className="block bg-[var(--accent)] text-white rounded-xl p-4 text-center font-[500] hover:opacity-90 transition"
              >
                📖 View Curriculum
              </Link>
              <Link
                href="/practice"
                className="block bg-[var(--bg-surface)] border border-[var(--bg-raised)] text-white rounded-xl p-4 text-center font-[500] hover:border-[var(--border-mid)] transition"
              >
                ✏️ Practice Quiz
              </Link>
              <Link
                href="/learn"
                className="block bg-[var(--bg-surface)] border border-[var(--bg-raised)] text-white rounded-xl p-4 text-center font-[500] hover:border-[var(--border-mid)] transition"
              >
                🤖 AI Tutor
              </Link>
              <Link
                href="/analytics"
                className="block bg-[var(--bg-surface)] border border-[var(--bg-raised)] text-white rounded-xl p-4 text-center font-[500] hover:border-[var(--border-mid)] transition"
              >
                📊 Progress
              </Link>
            </div>
          </div>
        </div>

        {/* SUBJECT OVERVIEW */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white mb-4">Subject Progress</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: "Mathematics", progress: 45, lessons: "5/8 lessons", color: "#5b5eff" },
              { name: "Science", progress: 35, lessons: "3/6 lessons", color: "#1d9e75" },
              { name: "English", progress: 50, lessons: "4/6 lessons", color: "#ef9f27" },
              { name: "History", progress: 0, lessons: "0/4 lessons", color: "#e24b4a" },
            ].map((subject, i) => (
              <div key={i} className="bg-[var(--bg-surface)] border border-[var(--bg-raised)] rounded-xl p-4">
                <div className="text-[14px] font-[500] text-white mb-3">{subject.name}</div>
                <div className="h-2 bg-[var(--bg-raised)] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full"
                    style={{
                      backgroundColor: subject.color,
                      width: `${subject.progress}%`,
                    }}
                  />
                </div>
                <div className="text-[12px] text-[var(--text-muted)]">{subject.progress}%</div>
                <div className="text-[11px] text-[var(--text-faint)] mt-1">{subject.lessons}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
