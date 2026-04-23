"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArcadeShell, PixelBar, Byte } from "@/components/arcade";

interface Subject {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  chapters_completed: number;
  total_chapters: number;
  progress_percent: number;
  average_score?: number;
}

const SUBJECT_STYLE: Record<string, { color: string; icon: string }> = {
  mathematics: { color: "var(--s-math)", icon: "∑" },
  math: { color: "var(--s-math)", icon: "∑" },
  science: { color: "var(--s-sci)", icon: "⚛" },
  biology: { color: "var(--s-sci)", icon: "🧬" },
  chemistry: { color: "var(--neon-lime)", icon: "⚗" },
  physics: { color: "var(--neon-cyan)", icon: "Φ" },
  english: { color: "var(--s-eng)", icon: "A" },
  literature: { color: "var(--s-eng)", icon: "A" },
  history: { color: "var(--s-his)", icon: "⚜" },
  geography: { color: "var(--neon-lime)", icon: "🌍" },
  economics: { color: "var(--neon-yel)", icon: "$" },
  "political science": { color: "var(--neon-mag)", icon: "⚖" },
  politics: { color: "var(--neon-mag)", icon: "⚖" },
  civics: { color: "var(--neon-mag)", icon: "⚖" },
  psychology: { color: "var(--neon-vio)", icon: "ψ" },
  sociology: { color: "var(--neon-ora)", icon: "☉" },
  philosophy: { color: "var(--neon-vio)", icon: "Φ" },
  "computer science": { color: "var(--s-cs)", icon: "</>" },
  coding: { color: "var(--s-cs)", icon: "</>" },
  programming: { color: "var(--s-cs)", icon: "</>" },
  arts: { color: "var(--s-art)", icon: "🎨" },
  art: { color: "var(--s-art)", icon: "🎨" },
  music: { color: "var(--neon-cyan)", icon: "♪" },
  "physical education": { color: "var(--neon-ora)", icon: "⚽" },
  pe: { color: "var(--neon-ora)", icon: "⚽" },
  business: { color: "var(--neon-yel)", icon: "₿" },
  accounting: { color: "var(--neon-yel)", icon: "Σ" },
};

// Deterministic fallback palette for any subject not in the explicit map.
const FALLBACK_PALETTE: { color: string; icon: string }[] = [
  { color: "var(--neon-cyan)", icon: "★" },
  { color: "var(--neon-mag)", icon: "✦" },
  { color: "var(--neon-yel)", icon: "◆" },
  { color: "var(--neon-lime)", icon: "♛" },
  { color: "var(--neon-vio)", icon: "♆" },
  { color: "var(--neon-ora)", icon: "♜" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function styleFor(name: string) {
  const key = name.toLowerCase().trim();
  if (SUBJECT_STYLE[key]) return SUBJECT_STYLE[key];
  // Try each word individually (e.g. "Advanced Biology" → "biology")
  for (const word of key.split(/\s+/)) {
    if (SUBJECT_STYLE[word]) return SUBJECT_STYLE[word];
  }
  return FALLBACK_PALETTE[hashStr(key) % FALLBACK_PALETTE.length];
}

export default function LearnPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      fetchSubjects();
    }
  }, [user, authLoading, router]);

  async function fetchSubjects() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/onboarding/subjects`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const subjectsData = (data.subjects || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          status: s.status || "not_started",
          chapters_completed: s.chapters_completed || 0,
          total_chapters: s.chapter_count ?? s.total_chapters ?? 0,
          progress_percent: s.progress_percent || 0,
          average_score: s.average_score,
        }));
        setSubjects(subjectsData);
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div
        className="arcade-root"
        data-grade="68"
        data-motion="on"
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--ink)",
          fontFamily: "var(--f-display)",
          background:
            "radial-gradient(circle at 50% 40%, rgba(155,92,255,0.18), transparent 60%)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div className="anim-float" style={{ display: "inline-block" }}>
            <Byte size={120} />
          </div>
          <div
            className="h-display"
            style={{
              marginTop: 22,
              fontSize: 16,
              color: "var(--neon-cyan)",
              letterSpacing: "0.08em",
            }}
          >
            Byte is lining up your subjects
            <span className="byte-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </div>
          <style jsx>{`
            .byte-dots span {
              display: inline-block;
              margin-left: 2px;
              animation: byte-dot-pulse 1.2s ease-in-out infinite;
              opacity: 0.2;
            }
            .byte-dots span:nth-child(2) { animation-delay: 0.2s; }
            .byte-dots span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes byte-dot-pulse {
              0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
              40%           { opacity: 1;   transform: translateY(-3px); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const totalChapters = subjects.reduce((sum, s) => sum + s.total_chapters, 0);
  const completedChapters = subjects.reduce((sum, s) => sum + s.chapters_completed, 0);
  const overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return { color: "var(--neon-lime)", text: "Done" };
      case "in_progress":
        return { color: "var(--neon-cyan)", text: "Active" };
      default:
        return { color: "var(--ink-mute)", text: "New" };
    }
  }

  return (
    <ArcadeShell active="Learn" pixels={14}>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <span className="label" style={{ color: "var(--neon-cyan)" }}>World Map</span>
          <h1 className="h-display" style={{ fontSize: 44, margin: "8px 0 6px" }}>
            Choose your <span style={{ color: "var(--neon-mag)" }}>adventure</span>
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 15 }}>
            {subjects.length} worlds · {totalChapters} chapters
          </p>
        </div>
      </div>

      {/* Overall progress */}
      {subjects.length > 0 && (
        <div className="panel cyan" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>Overall Progress</span>
            <span
              className="h-display"
              style={{ fontSize: 14, color: "var(--ink)" }}
            >
              {completedChapters} / {totalChapters} chapters
            </span>
          </div>
          <PixelBar value={overallProgress} color="var(--neon-cyan)" />
          <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 8 }}>
            {overallProgress}% complete — keep going!
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📚</div>
          <p style={{ color: "var(--ink-dim)", marginBottom: 20 }}>
            No subjects available yet. Complete onboarding to generate your curriculum.
          </p>
          <Link
            href="/onboarding"
            className="chunky-btn cyan"
            style={{ justifyContent: "center", textDecoration: "none", display: "inline-flex" }}
          >
            ▶ Complete Onboarding
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 20 }}>
          {subjects.map((subject) => {
            const style = styleFor(subject.name);
            const badge = getStatusBadge(subject.status);
            return (
              <Link
                key={subject.id}
                href={`/learn/${subject.id}`}
                className="panel"
                style={{
                  padding: 22,
                  position: "relative",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "var(--ink)",
                  cursor: "pointer",
                  display: "block",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -30,
                    right: -30,
                    width: 180,
                    height: 180,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${style.color}22, transparent 70%)`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 14,
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                    <div
                      className="subj-chip"
                      style={{ color: style.color, width: 56, height: 56, flexShrink: 0 }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--f-display)",
                          fontWeight: 900,
                          fontSize: 24,
                          color: style.color,
                          textShadow: `0 0 10px ${style.color}`,
                          lineHeight: 1,
                        }}
                      >
                        {style.icon}
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="h-display"
                        style={{
                          fontSize: 18,
                          textTransform: "capitalize",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {subject.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                        {subject.chapters_completed} / {subject.total_chapters} chapters
                      </div>
                    </div>
                  </div>
                  <span
                    className="pill"
                    style={{
                      color: badge.color,
                      borderColor: badge.color,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontSize: 10,
                      padding: "5px 10px",
                    }}
                  >
                    {badge.text}
                  </span>
                </div>
                <PixelBar value={subject.progress_percent} color={style.color} />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--ink-mute)" }}>
                    {subject.progress_percent}% complete
                    {subject.average_score != null && (
                      <> · Avg {Math.round(subject.average_score)}%</>
                    )}
                  </div>
                  {subject.status !== "completed" && (
                    <span
                      style={{
                        fontSize: 11,
                        color: style.color,
                        fontFamily: "var(--f-display)",
                        fontWeight: 800,
                      }}
                    >
                      PLAY →
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </ArcadeShell>
  );
}
