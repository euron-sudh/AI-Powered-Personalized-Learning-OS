"use client";

import { useEffect, useRef } from "react";
import { useVideoFeed } from "@/hooks/useVideoFeed";
import { useSentiment } from "@/hooks/useSentiment";

interface SentimentData {
  emotion: string;
  confidence: number;
  action_taken?: string | null;
}

interface ExternalSentimentContext {
  currentSentiment: SentimentData | null;
  sendFrame: (frame: string, chapterId: string) => void;
  analyzing: boolean;
  history: SentimentData[];
  connect: (chapterId: string) => void;
  disconnect: () => void;
}

interface VideoFeedProps {
  chapterId: string;
  externalSentiment?: ExternalSentimentContext;
}

const EMOTION_CONFIG: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  engaged:    { color: "text-green-400",   bg: "bg-green-500",   label: "Engaged",    emoji: "🎯" },
  happy:      { color: "text-emerald-400", bg: "bg-emerald-400", label: "Happy",      emoji: "😊" },
  confused:   { color: "text-yellow-400",  bg: "bg-yellow-400",  label: "Confused",   emoji: "🤔" },
  bored:      { color: "text-orange-400",  bg: "bg-orange-400",  label: "Bored",      emoji: "😐" },
  frustrated: { color: "text-red-400",     bg: "bg-red-500",     label: "Frustrated", emoji: "😤" },
  drowsy:     { color: "text-slate-400",   bg: "bg-slate-500",   label: "Drowsy",     emoji: "😴" },
};

const HISTORY_COLORS: Record<string, string> = {
  engaged: "bg-green-500", happy: "bg-emerald-400", confused: "bg-yellow-400",
  bored: "bg-orange-400", frustrated: "bg-red-500", drowsy: "bg-slate-500",
};

export default function VideoFeed({ chapterId, externalSentiment }: VideoFeedProps) {
  const { isActive, videoRef, startCamera, stopCamera, captureFrame } = useVideoFeed();
  // Use external sentiment if provided, otherwise create internal instance
  const internalSentiment = useSentiment();
  const { currentSentiment, history, analyzing, connect, disconnect, sendFrame } = externalSentiment || internalSentiment;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    connect(chapterId);
    return () => {
      stopCamera();
      disconnect();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [chapterId, connect, disconnect, stopCamera]);

  async function handleToggleCamera() {
    if (isActive) {
      stopCamera();
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    } else {
      await startCamera();
      intervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame) sendFrame(frame, chapterId);
      }, 5000);
    }
  }

  const cfg = currentSentiment ? (EMOTION_CONFIG[currentSentiment.emotion] ?? EMOTION_CONFIG.engaged) : null;

  return (
    <div className="bg-[#0d1424] border border-white/[0.07] rounded-2xl overflow-hidden flex flex-col gap-0">

      {/* ── Video area ── */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${!isActive ? "hidden" : ""}`}
        />

        {/* Offline placeholder */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/30">
                <path d="M15 10l4.553-2.07A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <p className="text-xs text-white/30">Camera off</p>
          </div>
        )}

        {/* Live sentiment overlay */}
        {isActive && cfg && currentSentiment && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.bg} animate-pulse`} />
              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
              <span className="text-xs text-white/40">{Math.round(currentSentiment.confidence * 100)}%</span>
            </div>
            {analyzing && (
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1.5">
                <div className="w-3 h-3 rounded-full border border-blue-400 border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Analyzing spinner (first analysis, no result yet) */}
        {isActive && analyzing && !currentSentiment && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1.5 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-blue-400 border-t-transparent animate-spin" />
            <span className="text-xs text-white/50">Analyzing…</span>
          </div>
        )}
      </div>

      {/* ── Controls + info ── */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live · analyzing every 5s
            </span>
          ) : (
            <span className="text-xs text-white/30">Start camera to enable sentiment tracking</span>
          )}
        </div>
        <button
          onClick={handleToggleCamera}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
            isActive
              ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              : "bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20"
          }`}
        >
          {isActive ? "Stop Camera" : "Start Camera"}
        </button>
      </div>

      {/* ── Current sentiment card ── */}
      {cfg && currentSentiment && (
        <div className="px-4 pb-3">
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 bg-white/[0.04] border border-white/[0.07]`}>
            <span className="text-2xl">{cfg.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
              <div className="mt-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${cfg.bg}`}
                  style={{ width: `${Math.round(currentSentiment.confidence * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-bold text-white/60 shrink-0">
              {Math.round(currentSentiment.confidence * 100)}%
            </span>
          </div>

          {/* Adaptive action */}
          {currentSentiment.action_taken && (
            <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-300 leading-relaxed">
              💡 {currentSentiment.action_taken}
            </div>
          )}
        </div>
      )}

      {/* ── Emotion history timeline ── */}
      {history.length > 0 && (
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">
          <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-2">Session history</p>
          <div className="flex gap-1 flex-wrap">
            {history.slice(-20).map((entry, i) => (
              <div
                key={i}
                title={`${EMOTION_CONFIG[entry.emotion]?.label ?? entry.emotion} (${Math.round(entry.confidence * 100)}%)`}
                className={`w-4 h-4 rounded-full cursor-default ${HISTORY_COLORS[entry.emotion] ?? "bg-slate-500"}`}
                style={{ opacity: 0.4 + entry.confidence * 0.6 }}
              />
            ))}
          </div>
        </div>
      )}

      <p className="px-4 pb-3 text-xs text-white/20 leading-relaxed">
        Frames are analyzed every 5s and immediately discarded. No video is stored.
      </p>
    </div>
  );
}
