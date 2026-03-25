"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, ApiError } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import VideoFeed from "@/app/learn/components/VideoFeed";
import type { ProgressResponse, StudentProfile } from "@/types/student";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  order_index: number;
  title: string;
  description: string;
  status: string;
}

interface CurriculumResponse {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

interface SubjectWithChapters {
  subject_id: string;
  subject_name: string;
  chapters: Chapter[];
}

// ─── Sentiment legend data ─────────────────────────────────────────────────

const SENTIMENT_LEGEND = [
  { label: "Engaged",    color: "bg-green-400",   description: "Actively focused and learning" },
  { label: "Happy",      color: "bg-emerald-300",  description: "Positive and motivated" },
  { label: "Confused",   color: "bg-yellow-400",   description: "May need re-explanation" },
  { label: "Bored",      color: "bg-orange-400",   description: "Content may need variation" },
  { label: "Frustrated", color: "bg-red-400",      description: "Needs encouragement or a break" },
  { label: "Drowsy",     color: "bg-slate-400",    description: "Suggest a short activity break" },
];

// ─── Video type presets ────────────────────────────────────────────────────────

const VIDEO_TYPES = [
  { label: "Explanation",       suffix: "explained simply",    icon: "💡" },
  { label: "Tutorial",          suffix: "full tutorial",       icon: "🎓" },
  { label: "Practice Problems", suffix: "practice problems",   icon: "✏️" },
  { label: "Animation",         suffix: "animated",            icon: "🎬" },
  { label: "Exam Tips",         suffix: "exam tips tricks",    icon: "📝" },
] as const;

type VideoType = typeof VIDEO_TYPES[number]["label"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBaseQuery(subject: string, chapter: string, board?: string | null, grade?: string | null) {
  const parts = [board, grade ? `grade ${grade}` : null, subject, chapter].filter(Boolean);
  return parts.join(" ");
}

function buildTypedQuery(base: string, suffix: string) {
  return `${base} ${suffix}`;
}

function youtubeSearchEmbed(query: string) {
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&rel=0&modestbranding=1`;
}

function youtubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoSessionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  const [tab, setTab] = useState<"videos" | "live">("videos");
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Selected chapter + video type for embed
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithChapters | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [videoType, setVideoType] = useState<VideoType>("Explanation");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function load() {
      try {
        const [prof, progress] = await Promise.all([
          apiGet<StudentProfile>("/api/onboarding/profile").catch(() => null),
          apiGet<ProgressResponse>(`/api/progress/${user!.id}`),
        ]);
        setProfile(prof);

        const eligible = progress.subjects.filter((s) => s.total_chapters > 0);

        // Fetch all curricula in parallel
        const curriculumResults = await Promise.allSettled(
          eligible.map((sub) =>
            apiGet<CurriculumResponse>(`/api/curriculum/${sub.subject_id}`, 120_000)
              .then((curriculum) => ({ sub, curriculum }))
          )
        );

        const withChapters: SubjectWithChapters[] = [];
        for (const r of curriculumResults) {
          if (r.status !== "fulfilled") continue;
          const { sub, curriculum } = r.value;
          const seen = new Set<number>();
          const chapters = curriculum.chapters.filter((c) => {
            if (seen.has(c.order_index)) return false;
            seen.add(c.order_index);
            return true;
          });
          if (chapters.length > 0) {
            withChapters.push({ subject_id: sub.subject_id, subject_name: sub.subject_name, chapters });
          }
        }

        setSubjects(withChapters);
        // Auto-select first subject + chapter
        if (withChapters.length > 0) {
          setSelectedSubject(withChapters[0]);
          setSelectedChapter(withChapters[0].chapters[0] ?? null);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) router.push("/login");
      } finally {
        setLoadingSubjects(false);
      }
    }

    load();
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] bg-[#080d1a] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const baseQuery = selectedSubject && selectedChapter
    ? buildBaseQuery(selectedSubject.subject_name, selectedChapter.title, profile?.board, profile?.grade)
    : null;

  const activeTypeSuffix = VIDEO_TYPES.find((t) => t.label === videoType)?.suffix ?? "";
  const embedQuery = baseQuery ? buildTypedQuery(baseQuery, activeTypeSuffix) : null;

  return (
    <main className="h-[calc(100vh-64px)] bg-[#080d1a] flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/[0.06] px-6 flex items-center justify-between flex-shrink-0 h-12">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </Link>
          <span className="text-white/[0.12]">|</span>
          <h1 className="font-semibold text-white text-sm">Videos</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-1">
          <button
            onClick={() => setTab("videos")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all",
              tab === "videos"
                ? "bg-blue-600 text-white shadow"
                : "text-white/50 hover:text-white/80"
            )}
          >
            Course Videos
          </button>
          <button
            onClick={() => setTab("live")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-all",
              tab === "live"
                ? "bg-blue-600 text-white shadow"
                : "text-white/50 hover:text-white/80"
            )}
          >
            Live Session
          </button>
        </div>
      </div>

      {/* ── Course Videos tab ── */}
      {tab === "videos" && (
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Sidebar: subjects → chapters */}
          <div className="w-64 flex-shrink-0 border-r border-white/[0.06] overflow-y-auto flex flex-col">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Your Subjects</p>
            </div>

            {loadingSubjects ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 rounded-full border-2 border-blue-900 border-t-blue-500 animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-white/40 mb-2">No subjects found.</p>
                <Link href="/dashboard" className="text-xs text-blue-400 hover:text-blue-300">
                  Go to Dashboard →
                </Link>
              </div>
            ) : (
              <div className="py-2">
                {subjects.map((sub) => (
                  <div key={sub.subject_id}>
                    {/* Subject header */}
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className="text-sm">{SUBJECT_EMOJIS[sub.subject_name] ?? "📚"}</span>
                      <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">
                        {sub.subject_name}
                      </span>
                    </div>
                    {/* Chapter list */}
                    {sub.chapters.map((ch) => {
                      const isSelected = selectedChapter?.id === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => { setSelectedSubject(sub); setSelectedChapter(ch); setVideoType("Explanation"); }}
                          className={cn(
                            "w-full text-left px-4 py-2 text-xs transition-all",
                            isSelected
                              ? "bg-blue-600/20 text-blue-300 border-r-2 border-blue-500"
                              : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                          )}
                        >
                          <span className="text-white/20 mr-1.5">{ch.order_index}.</span>
                          {ch.title}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main: video embed */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {!selectedChapter || !baseQuery || !embedQuery ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.05] flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" className="text-white/30">
                      <rect x="1" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
                      <path d="M11 6.5l3-2v7l-3-2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <p className="text-white/50 font-medium">Select a chapter</p>
                  <p className="text-sm text-white/30 mt-1">Choose a subject and chapter from the sidebar</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full min-h-0">

                {/* ── Chapter info + type filter ── */}
                <div className="px-5 py-3 border-b border-white/[0.06] flex-shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wide">
                        {selectedSubject?.subject_name}
                      </p>
                      <h2 className="text-sm font-semibold text-white mt-0.5 truncate">
                        {selectedChapter.order_index}. {selectedChapter.title}
                      </h2>
                    </div>
                    {/* YouTube open link for active type */}
                    <a
                      href={youtubeSearchUrl(embedQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-600/20 transition-colors"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Open on YouTube
                    </a>
                  </div>

                  {/* Video type filter pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {VIDEO_TYPES.map((vt) => (
                      <button
                        key={vt.label}
                        onClick={() => setVideoType(vt.label)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                          videoType === vt.label
                            ? "bg-blue-600 text-white shadow shadow-blue-900/40"
                            : "bg-white/[0.05] text-white/50 hover:bg-white/[0.09] hover:text-white/80 border border-white/[0.07]"
                        )}
                      >
                        <span>{vt.icon}</span>
                        {vt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Embedded YouTube player ── */}
                <div className="flex-1 bg-black relative min-h-0">
                  <iframe
                    key={embedQuery}
                    src={youtubeSearchEmbed(embedQuery)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title={`${videoType} – ${selectedChapter.title}`}
                  />
                </div>

                {/* ── Quick YouTube link cards ── */}
                <div className="flex-shrink-0 border-t border-white/[0.06] px-4 py-3">
                  <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-2.5">
                    More on YouTube
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {VIDEO_TYPES.map((vt) => {
                      const q = buildTypedQuery(baseQuery, vt.suffix);
                      return (
                        <a
                          key={vt.label}
                          href={youtubeSearchUrl(q)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                            videoType === vt.label
                              ? "bg-red-600/15 border-red-500/30 text-red-300"
                              : "bg-white/[0.04] border-white/[0.07] text-white/50 hover:bg-white/[0.08] hover:text-white/80 hover:border-white/[0.14]"
                          )}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 opacity-70">
                            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          {vt.icon} {vt.label}
                        </a>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Live Session tab ── */}
      {tab === "live" && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-3xl mx-auto px-6 py-8">

            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Live Sentiment Session</h2>
              <p className="text-sm text-white/40 mt-1">
                Your camera is analyzed in real-time to detect engagement and adapt your learning experience.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Video feed */}
              <div>
                <VideoFeed chapterId="general" />
              </div>

              {/* Info panel */}
              <div className="flex flex-col gap-4">
                {/* Sentiment legend */}
                <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Emotion Legend</h3>
                  <div className="space-y-3">
                    {SENTIMENT_LEGEND.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.color}`} />
                        <div>
                          <span className="text-sm font-medium text-white/80">{item.label}</span>
                          <p className="text-xs text-white/30">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How it works */}
                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5">
                  <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">How It Works</h3>
                  <ul className="space-y-2.5 text-sm text-white/60">
                    {[
                      "Your camera captures a frame every 5 seconds.",
                      "AI analyzes your facial expression to detect your emotional state.",
                      "Your tutor adapts the lesson pace and style in real time.",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2.5 items-start">
                        <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Privacy */}
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex gap-2.5 items-start">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white/30 flex-shrink-0 mt-0.5">
                      <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7V4L8 1z" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                    </svg>
                    <p className="text-xs text-white/40 leading-relaxed">
                      <span className="text-white/60 font-medium">Privacy: </span>
                      Frames are analyzed and immediately discarded. No raw video is stored — only emotion labels are saved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
