"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

interface DailyTask {
  title: string;
  description: string;
  subject: string;
  subject_id: string;
  chapter_id: string | null;
  chapter_title: string | null;
  action: "learn" | "review" | "quiz";
  estimated_minutes: number;
}

interface DailyPlanResponse {
  tasks: DailyTask[];
  tip: string;
}

const ACTION_CONFIG = {
  learn: {
    label: "Start Learning",
    badge: "Learn",
    color: "blue",
    tabActiveBg: "bg-gradient-to-r from-blue-600/20 to-blue-500/5",
    tabActiveBorder: "border-blue-500/50",
    tabInactive: "border-white/[0.05] hover:border-blue-500/25 hover:bg-blue-500/5",
    badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    btnClass: "bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/60",
    progressBar: "bg-gradient-to-r from-blue-600 to-blue-400",
    dotClass: "bg-blue-400",
    accentText: "text-blue-400",
    panelGradient: "from-blue-600/10 via-blue-600/3 to-transparent",
    panelBorder: "border-blue-500/20",
    numberBg: "bg-blue-500/20 border-blue-500/30 text-blue-300",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  review: {
    label: "Review Now",
    badge: "Review",
    color: "amber",
    tabActiveBg: "bg-gradient-to-r from-amber-600/20 to-amber-500/5",
    tabActiveBorder: "border-amber-500/50",
    tabInactive: "border-white/[0.05] hover:border-amber-500/25 hover:bg-amber-500/5",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    btnClass: "bg-amber-600 hover:bg-amber-500 shadow-xl shadow-amber-900/60",
    progressBar: "bg-gradient-to-r from-amber-600 to-amber-400",
    dotClass: "bg-amber-400",
    accentText: "text-amber-400",
    panelGradient: "from-amber-600/10 via-amber-600/3 to-transparent",
    panelBorder: "border-amber-500/20",
    numberBg: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 4.5V7l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  quiz: {
    label: "Take Quiz",
    badge: "Quiz",
    color: "emerald",
    tabActiveBg: "bg-gradient-to-r from-emerald-600/20 to-emerald-500/5",
    tabActiveBorder: "border-emerald-500/50",
    tabInactive: "border-white/[0.05] hover:border-emerald-500/25 hover:bg-emerald-500/5",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    btnClass: "bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/60",
    progressBar: "bg-gradient-to-r from-emerald-600 to-emerald-400",
    dotClass: "bg-emerald-400",
    accentText: "text-emerald-400",
    panelGradient: "from-emerald-600/10 via-emerald-600/3 to-transparent",
    panelBorder: "border-emerald-500/20",
    numberBg: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 5h6M4 7.5h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
};

const AUTO_ADVANCE_MS = 7000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidId(id: string | null | undefined): boolean {
  return !!id && UUID_RE.test(id);
}

function taskHref(task: DailyTask): string {
  if (!isValidId(task.subject_id)) return "/dashboard";
  if (isValidId(task.chapter_id)) return `/learn/${task.subject_id}/${task.chapter_id}`;
  return `/learn/${task.subject_id}`;
}

export default function TodaysPlan() {
  const [plan, setPlan] = useState<DailyPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    apiGet<DailyPlanResponse>("/api/progress/daily-plan/me")
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!plan || plan.tasks.length < 2) return;
    setProgress(0);

    tickRef.current = setInterval(() => {
      if (!pausedRef.current)
        setProgress((p) => Math.min(100, p + 100 / (AUTO_ADVANCE_MS / 50)));
    }, 50);

    timerRef.current = setTimeout(() => {
      if (pausedRef.current) return;
      setAnimating(true);
      setTimeout(() => {
        setActive((a) => (a + 1) % plan.tasks.length);
        setAnimating(false);
      }, 220);
    }, AUTO_ADVANCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [active, plan]);

  function selectTab(idx: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    setAnimating(true);
    setTimeout(() => {
      setActive(idx);
      setProgress(0);
      setAnimating(false);
    }, 160);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-indigo-500/20 bg-[#07091a] p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="h-3 w-48 rounded-lg bg-white/[0.03] animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />)}
        </div>
        <div className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  // Filter out any tasks with invalid/missing subject IDs
  const validTasks = (plan?.tasks ?? []).filter(t => isValidId(t.subject_id));

  if (!plan || validTasks.length === 0) return null;

  // Clamp active index in case tasks shrank
  const safeActive = Math.min(active, validTasks.length - 1);
  const task = validTasks[safeActive];
  const cfg = ACTION_CONFIG[task.action] ?? ACTION_CONFIG.learn;
  const totalMin = validTasks.reduce((s, t) => s + t.estimated_minutes, 0);

  return (
    <div
      className="relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* ── Animated glow ring ── */}
      <div
        className="absolute -inset-px rounded-2xl pointer-events-none z-0"
        style={{
          background: "linear-gradient(120deg, rgba(99,102,241,0.5), rgba(139,92,246,0.5), rgba(99,102,241,0.5))",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />

      {/* ── Card ── */}
      <div className="relative z-10 rounded-2xl bg-[#07091a] overflow-hidden border border-white/[0.03]">

        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/3 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 right-0 w-64 h-64 bg-violet-600/6 rounded-full blur-3xl" />
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative p-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-900/40">
                {/* pulsing ring */}
                <div className="absolute inset-0 rounded-xl border border-indigo-400/30 animate-ping opacity-30" style={{ animationDuration: "2.5s" }} />
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-indigo-300">
                  <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6l2-6z" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Today&apos;s Plan</h2>
                  <span className="inline-flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDuration: "1.5s" }} />
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">AI</span>
                  </span>
                </div>
                <p className="text-xs text-white/35 mt-0.5">Your personalized study agenda for today</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-white/30">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
                <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="text-xs font-semibold text-white/50">{totalMin} min</span>
            </div>
          </div>

          {/* ── Tab strip ── */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {validTasks.map((t, idx) => {
              const c = ACTION_CONFIG[t.action] ?? ACTION_CONFIG.learn;
              const isActive = idx === safeActive;
              return (
                <button
                  key={idx}
                  onClick={() => selectTab(idx)}
                  className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border transition-all duration-300 overflow-hidden text-left ${
                    isActive
                      ? `${c.tabActiveBg} ${c.tabActiveBorder} shadow-lg`
                      : c.tabInactive
                  }`}
                >
                  {/* Step badge */}
                  <div className="flex items-center gap-2 w-full">
                    <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border flex-shrink-0 transition-all duration-300 ${
                      isActive ? c.numberBg : "bg-white/[0.04] border-white/[0.08] text-white/25"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors duration-300 ${
                      isActive ? c.accentText : "text-white/20"
                    }`}>
                      {c.badge}
                    </span>
                  </div>

                  {/* Subject name */}
                  <p className={`text-xs font-semibold leading-tight transition-colors duration-300 ${
                    isActive ? "text-white" : "text-white/35"
                  }`}>
                    {t.subject}
                  </p>

                  {/* Time */}
                  <p className={`text-[10px] transition-colors duration-300 ${
                    isActive ? "text-white/40" : "text-white/18"
                  }`}>
                    {t.estimated_minutes} min
                  </p>

                  {/* Progress bar at bottom */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.05]">
                      <div
                        className={`h-full rounded-full ${c.progressBar}`}
                        style={{ width: `${progress}%`, transition: "none" }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Active task detail ── */}
          <div
            className={`relative rounded-xl border ${cfg.panelBorder} overflow-hidden transition-all duration-220 ${
              animating ? "opacity-0 translate-y-2 scale-[0.99]" : "opacity-100 translate-y-0 scale-100"
            }`}
            style={{ transition: "opacity 220ms ease, transform 220ms ease" }}
          >
            {/* Panel background */}
            <div className={`absolute inset-0 bg-gradient-to-r ${cfg.panelGradient} pointer-events-none`} />

            <div className="relative p-5 flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Left */}
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} animate-pulse`} />
                    {cfg.badge}
                  </span>
                  <span className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">
                    {task.subject}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[17px] font-bold text-white leading-snug mb-2">
                  {task.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/50 leading-relaxed">
                  {task.description}
                </p>

                {/* Chapter */}
                {task.chapter_title && (
                  <div className="flex items-center gap-1.5 mt-3">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-white/25 flex-shrink-0">
                      <path d="M1.5 3h9M1.5 6h7M1.5 9h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <span className="text-[11px] text-white/30 truncate">{task.chapter_title}</span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <Link
                  href={taskHref(task)}
                  className={`inline-flex items-center gap-2 ${cfg.btnClass} text-white text-sm font-bold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap`}
                >
                  {cfg.label}
                  {cfg.icon}
                </Link>
                <span className="text-[10px] text-white/20">{task.estimated_minutes} min estimated</span>
              </div>
            </div>
          </div>

          {/* ── Tip ── */}
          {plan.tip && (
            <div className="flex items-center gap-3 mt-4 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-xs text-white/40 italic leading-relaxed">{plan.tip}</p>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
