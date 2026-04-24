"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, Byte } from "@/components/arcade";

interface Chapter {
  id: string;
  order_index: number;
  title: string;
  description: string;
  status: string;
}

export default function SubjectPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjectName, setSubjectName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const subjectId = params.subjectId as string;

  async function markChapterComplete(chapterId: string) {
    if (completingId) return;
    setCompletingId(chapterId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `/api/proxy/api/lessons/${chapterId}/complete`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        alert(`Couldn't mark complete: ${res.status} ${txt}`);
        return;
      }
      // Optimistically flip the status so the UI updates immediately; the
      // next fetchChapters would re-confirm.
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, status: "completed" } : c)),
      );
    } catch (err) {
      alert(`Couldn't mark complete: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCompletingId(null);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      fetchChapters();
    }
  }, [user, authLoading, router, subjectId]);

  async function fetchChapters() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/curriculum/${subjectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.subject_name) setSubjectName(data.subject_name);
        setChapters(data.chapters || []);
      }
    } catch (err) {
      console.error("Failed to fetch chapters:", err);
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
            Byte is unpacking your chapters
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

  return (
    <ArcadeShell active="Learn" pixels={12}>
      <button
        onClick={() => router.push("/learn")}
        className="pill"
        style={{
          cursor: "pointer",
          color: "var(--neon-cyan)",
          borderColor: "var(--neon-cyan)",
          marginBottom: 16,
        }}
      >
        ← Back to subjects
      </button>

      <div style={{ marginBottom: 24 }}>
        <span className="label" style={{ color: "var(--neon-yel)" }}>Chapter map</span>
        <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 6px", textTransform: "capitalize" }}>
          {subjectName || "Chapters"} <span style={{ color: "var(--neon-cyan)" }}>quests</span>
        </h1>
        <p style={{ color: "var(--ink-dim)" }}>{chapters.length} chapters in your learning path</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {chapters.map((ch, i) => {
          const isExpanded = expandedId === ch.id;
          const isComplete = ch.status === "completed";
          const isInProgress = ch.status === "in_progress";
          const isLocked = ch.status === "locked";

          const badgeColor = isComplete
            ? "var(--neon-lime)"
            : isInProgress
              ? "var(--neon-cyan)"
              : isLocked
                ? "var(--ink-mute)"
                : "var(--neon-yel)";
          const badgeText = isComplete ? "Complete" : isInProgress ? "In progress" : isLocked ? "Locked" : "Available";

          return (
            <div key={ch.id} className="panel" style={{ overflow: "hidden" }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : ch.id);
                  }
                }}
                style={{
                  width: "100%",
                  padding: 18,
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: isComplete
                      ? "var(--neon-lime)"
                      : isInProgress
                        ? "var(--neon-cyan)"
                        : isLocked
                          ? "rgba(255,255,255,0.06)"
                          : "var(--neon-yel)",
                    color: isLocked ? "var(--ink-mute)" : "#170826",
                    border: "2px solid #170826",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--f-display)",
                    fontWeight: 900,
                    fontSize: 18,
                    flexShrink: 0,
                    boxShadow: isLocked ? "none" : "0 4px 0 0 #170826",
                  }}
                >
                  {isComplete ? "✓" : isLocked ? "🔒" : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="h-display"
                    style={{
                      fontSize: 16,
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ch.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-mute)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ch.description}
                  </div>
                </div>
                {!isComplete && !isLocked && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markChapterComplete(ch.id);
                    }}
                    disabled={completingId === ch.id}
                    title="Mark this chapter as complete"
                    className="pill"
                    style={{
                      color: "var(--neon-yel)",
                      borderColor: "var(--neon-yel)",
                      whiteSpace: "nowrap",
                      cursor: completingId === ch.id ? "default" : "pointer",
                      fontWeight: 700,
                      opacity: completingId === ch.id ? 0.7 : 1,
                    }}
                  >
                    {completingId === ch.id ? "Saving…" : "✓ Complete"}
                  </button>
                )}
                <span
                  className="pill"
                  style={{ color: badgeColor, borderColor: badgeColor, whiteSpace: "nowrap" }}
                >
                  {badgeText}
                </span>
                <span
                  style={{
                    color: "var(--ink-mute)",
                    transition: "transform 200ms ease",
                    transform: isExpanded ? "rotate(180deg)" : "none",
                    fontSize: 12,
                  }}
                >
                  ▼
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    borderTop: "2px solid var(--line-soft)",
                    padding: 18,
                    background: "rgba(0,0,0,0.3)",
                  }}
                >
                  <p style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 14 }}>{ch.description}</p>
                  <div style={{ marginBottom: 14 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Topics covered</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {["Fundamentals", "Applications", "Practice"].map((topic) => (
                        <span
                          key={topic}
                          style={{
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 8,
                            border: "1.5px solid var(--line-soft)",
                            background: "rgba(255,255,255,0.04)",
                            color: "var(--ink-dim)",
                          }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => router.push(`/learn/${subjectId}/${ch.id}`)}
                      disabled={isLocked}
                      className="chunky-btn"
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        opacity: isLocked ? 0.5 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                      }}
                    >
                      {isComplete ? "Review Lesson" : "🎙️ Start with AI Tutor"}
                    </button>
                    <button
                      onClick={() => router.push(`/learn/${subjectId}/${ch.id}/activity`)}
                      disabled={isLocked}
                      className="chunky-btn cyan"
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        opacity: isLocked ? 0.5 : 1,
                        cursor: isLocked ? "not-allowed" : "pointer",
                      }}
                    >
                      Take Quiz →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ArcadeShell>
  );
}
