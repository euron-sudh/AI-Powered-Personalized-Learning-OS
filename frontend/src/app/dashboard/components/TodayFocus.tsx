"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Topic {
  id: string;
  title: string;
  status: "weak" | "improving";
  score: number;
  duration: number;
  priority: number;
}

interface TodayFocusData {
  primary: Topic | null;
  secondary: Topic[];
}

export default function TodayFocus() {
  const [data, setData] = useState<TodayFocusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const result = await apiGet<TodayFocusData>("/api/progress/today-focus", 10_000);
        setData(result);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
          <div className="h-32 bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data || !data.primary) {
    return null;
  }

  const { primary, secondary } = data;
  const statusBadge = primary.status === "weak"
    ? { emoji: "⚠", color: "text-yellow-400", label: `You struggled here (${primary.score}%)` }
    : { emoji: "📈", color: "text-green-400", label: "You're improving — let's strengthen it" };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Start Here</h2>
        <p className="text-sm text-white/60 mt-1">Your AI-picked next step based on your recent performance</p>
      </div>

      {/* Primary task */}
      <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="text-md font-semibold text-white mb-1">
              🔥 {primary.title}
            </h3>
            <p className={cn("text-sm font-medium mb-3", statusBadge.color)}>
              {statusBadge.emoji} {statusBadge.label}
            </p>

            <div className="text-sm text-white/70 space-y-1 mb-3">
              <p>• Reteach with simpler examples</p>
              <p>• Guided practice</p>
              <p>• Quick check for understanding</p>
            </div>

            <p className="text-xs text-white/50">
              ⏱ {primary.duration} min
            </p>
          </div>

          <Link
            href={`/session?topic=${primary.id}`}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-900/40"
          >
            Start Now →
          </Link>
        </div>
      </div>

      {/* Secondary items */}
      {secondary.length > 0 && (
        <div>
          <h4 className="text-sm text-white/60 mb-3 font-medium">Next Up</h4>
          <div className="space-y-2">
            {secondary.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.06] p-3 rounded-lg text-sm transition-colors"
              >
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  {item.status === "improving" && (
                    <p className="text-xs text-green-400 mt-0.5">📈 Improving</p>
                  )}
                </div>
                <span className="text-xs text-white/50 whitespace-nowrap ml-2">
                  {item.duration} min
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
