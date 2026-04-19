"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SentimentLog {
  id: string;
  emotion: string;
  confidence: number;
  timestamp: string;
  chapter_id?: string;
  action_taken?: string;
}

const EMOTION_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  engaged: { bg: "bg-green-600", text: "text-green-600", icon: "🎯" },
  confused: { bg: "bg-yellow-600", text: "text-yellow-600", icon: "😕" },
  bored: { bg: "bg-blue-600", text: "text-blue-600", icon: "😑" },
  frustrated: { bg: "bg-red-600", text: "text-red-600", icon: "😤" },
  happy: { bg: "bg-pink-600", text: "text-pink-600", icon: "😊" },
  drowsy: { bg: "bg-gray-600", text: "text-gray-600", icon: "😴" },
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
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading sentiment history…</p>
        </div>
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

  const sortedByConfidence = [...sentiments].sort((a, b) => b.confidence - a.confidence);
  const timelineData = sentiments
    .slice(-20)
    .map((s) => ({ ...s, time: new Date(s.timestamp).toLocaleTimeString() }));

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--bg-base)] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Sentiment Journey</h1>
          <p className="text-[var(--text-muted)]">Track your emotions and engagement during learning sessions</p>
        </div>

        {/* Time Range Filter */}
        <div className="flex gap-3 mb-8">
          {["Today", "This week", "This month"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                timeRange === range
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[#5b5eff] border border-[var(--border)]"
              )}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Emotion Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {emotionStats.map(({ emotion, count, percentage, avgConfidence, icon, text, bg }) => (
            <button
              key={emotion}
              onClick={() => setSelectedEmotion(selectedEmotion === emotion ? null : emotion)}
              className={cn(
                "p-6 rounded-lg border transition-all cursor-pointer",
                selectedEmotion === emotion
                  ? `${bg} text-white border-opacity-50`
                  : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-[#5b5eff]"
              )}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{icon}</span>
                <div className="text-left">
                  <p className="text-sm font-semibold capitalize">{emotion}</p>
                  <p className={cn("text-2xl font-bold", selectedEmotion === emotion ? "text-white" : text)}>
                    {count}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={selectedEmotion === emotion ? "text-white/80" : "text-[var(--text-muted)]"}>
                    Frequency
                  </span>
                  <span className={selectedEmotion === emotion ? "text-white" : "font-bold"}>{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                  <div
                    className={cn(bg, "h-full transition-all")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <p className={cn("text-xs mt-3", selectedEmotion === emotion ? "text-white/70" : "text-[var(--text-muted)]")}>
                Avg confidence: {avgConfidence}%
              </p>
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-6">Recent Sentiments (Last 20)</h2>
          <div className="space-y-2">
            {timelineData.length > 0 ? (
              timelineData.reverse().map((sentiment) => {
                const emotionData = EMOTION_COLORS[sentiment.emotion];
                return (
                  <div
                    key={sentiment.id}
                    className="flex items-center gap-4 p-3 bg-[var(--bg-deep)] rounded-lg border border-[var(--border)]"
                  >
                    <span className="text-2xl">{emotionData?.icon || "❓"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white capitalize">{sentiment.emotion}</p>
                      <p className="text-xs text-[var(--text-muted)]">{sentiment.time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                        <div
                          className={cn(emotionData?.bg || "bg-gray-600", "h-full")}
                          style={{ width: `${sentiment.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-white w-12 text-right">
                        {Math.round(sentiment.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[var(--text-muted)] text-center py-8">No sentiment data yet. Start a learning session to track emotions!</p>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Insights</h2>
          <div className="space-y-3">
            {sentiments.length === 0 ? (
              <p className="text-[var(--text-muted)]">Complete a learning session to see insights about your learning patterns.</p>
            ) : (
              <>
                <div className="flex justify-between items-center p-3 bg-[var(--bg-deep)] rounded-lg">
                  <p className="text-white">Most common emotion</p>
                  <p className="text-lg font-bold">
                    {emotionStats.reduce((a, b) => (a.count > b.count ? a : b)).emotion}
                  </p>
                </div>
                <div className="flex justify-between items-center p-3 bg-[var(--bg-deep)] rounded-lg">
                  <p className="text-white">Average confidence</p>
                  <p className="text-lg font-bold">
                    {Math.round(
                      (sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length) * 100
                    )}
                    %
                  </p>
                </div>
                <div className="flex justify-between items-center p-3 bg-[var(--bg-deep)] rounded-lg">
                  <p className="text-white">Total data points</p>
                  <p className="text-lg font-bold">{sentiments.length}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
