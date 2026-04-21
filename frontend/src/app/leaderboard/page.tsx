"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Flame, Medal, Trophy } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

const RANK_ICON: Record<number, JSX.Element> = {
  1: <Crown className="w-5 h-5 text-[#f5c542]" strokeWidth={2.2} />,
  2: <Trophy className="w-5 h-5 text-[#b9bbbf]" strokeWidth={2.2} />,
  3: <Medal className="w-5 h-5 text-[#c97a3d]" strokeWidth={2.2} />,
};

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
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Trophy className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
              Leaderboard
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Friendly competition — names are partly anonymized.
            </p>
          </div>

          <div className="flex bg-white border border-[var(--border)] rounded-full p-1 shadow-card">
            {(["weekly", "all_time"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-full transition",
                  scope === s
                    ? "bg-[var(--brand-blue)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)]",
                )}
              >
                {s === "weekly" ? "This week" : "All time"}
              </button>
            ))}
          </div>
        </div>

        {loading || !data ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-10 text-center text-sm text-[var(--text-muted)] shadow-card">
            Loading leaderboard…
          </div>
        ) : data.entries.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-10 text-center shadow-card">
            <p className="text-[var(--text-body)] mb-3">No entries yet — be the first!</p>
            <Link href="/practice" className="text-[var(--brand-blue)] font-semibold text-sm">
              Start a practice quiz →
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-2xl shadow-card overflow-hidden">
            <ul>
              {data.entries.map((e) => (
                <li
                  key={e.rank}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0",
                    e.is_me && "bg-[var(--brand-blue-soft)]",
                  )}
                >
                  <div className="w-8 text-center font-extrabold text-[var(--text-muted)]">
                    {RANK_ICON[e.rank] ?? `#${e.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {e.display_name} {e.is_me && <span className="text-[10px] text-[var(--brand-blue)]">(you)</span>}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-3 mt-0.5">
                      <span>Lv {e.level}</span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {e.streak_days}d
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-[var(--text-primary)]">
                      {e.score.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      {e.score_label}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data?.me && !data.entries.some((e) => e.is_me) && (
          <div className="mt-4 bg-[var(--brand-blue-soft)] border border-[var(--brand-blue)] rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-card">
            <div className="w-8 text-center font-extrabold text-[var(--brand-blue)]">
              #{data.me.rank}
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {data.me.display_name} (you)
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Lv {data.me.level} · {data.me.streak_days}-day streak
              </div>
            </div>
            <div className="text-base font-extrabold text-[var(--brand-blue)]">
              {data.me.score.toLocaleString()} {data.me.score_label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
