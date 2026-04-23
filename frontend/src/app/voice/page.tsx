"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import { SUBJECT_EMOJIS } from "@/lib/constants";
import VoiceChat from "@/app/learn/components/VoiceChat";
import type { ProgressResponse } from "@/types/student";
import { ArcadeShell, Byte } from "@/components/arcade";

interface Chapter {
  id: string;
  order_index: number;
  title: string;
  description: string;
  status: "locked" | "available" | "in_progress" | "completed";
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

export default function VoicePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    async function loadSubjects() {
      try {
        const progress = await apiGet<ProgressResponse>(`/api/progress/${user!.id}`);
        const withChapters: SubjectWithChapters[] = [];
        for (const sub of progress.subjects) {
          if (sub.total_chapters > 0) {
            try {
              const curriculum = await apiGet<CurriculumResponse>(`/api/curriculum/${sub.subject_id}`);
              const available = curriculum.chapters.filter((c) => c.status !== "locked");
              if (available.length > 0) {
                withChapters.push({
                  subject_id: sub.subject_id,
                  subject_name: sub.subject_name,
                  chapters: available,
                });
              }
            } catch {
              // skip
            }
          }
        }
        setSubjects(withChapters);
      } catch {
        // silently handle
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div
        className="arcade-root"
        data-grade="68"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--ink)" }}
      >
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return (
    <ArcadeShell active="Buddy" pixels={14}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero */}
        <section
          className="panel mag"
          style={{
            padding: "28px 32px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Orb mic */}
          <div
            className="anim-bop"
            style={{
              position: "relative",
              width: 120,
              height: 120,
              flex: "0 0 120px",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              className="anim-glow"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, var(--neon-mag) 0%, rgba(255,62,165,0.2) 60%, transparent 80%)",
                filter: "blur(4px)",
              }}
            />
            <div
              style={{
                position: "relative",
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                border: "3px solid #170826",
                boxShadow: "0 6px 0 0 #170826, 0 0 28px rgba(255,62,165,0.6)",
                display: "grid",
                placeItems: "center",
                fontSize: 40,
              }}
            >
              🎙
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pill" style={{ marginBottom: 10 }}>
              <span style={{ color: "var(--neon-mag)" }}>●</span> VOICE BOOTH
            </div>
            <h1 className="h-display" style={{ fontSize: 32, margin: 0 }}>
              Talk to <span style={{ color: "var(--neon-mag)" }}>Byte</span>.
            </h1>
            <p className="label" style={{ marginTop: 8 }}>
              Hands-free tutoring with real-time speech. Pick a chapter, hit start, start chatting.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div className="pill">
              <span style={{ color: selectedChapterId ? "var(--neon-lime)" : "var(--ink-mute)" }}>●</span>
              {selectedChapterId ? "READY" : "STANDBY"}
            </div>
            <Byte size={56} mood={selectedChapterId ? "happy" : "neutral"} />
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 340px) 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Chapter selector */}
          <aside className="panel" style={{ padding: 18 }}>
            <div className="h-display" style={{ fontSize: 14, color: "var(--neon-cyan)", marginBottom: 12 }}>
              ▶ PICK A CHAPTER
            </div>

            {loadingSubjects ? (
              <div className="label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    border: "2px solid var(--neon-cyan)",
                    borderTopColor: "transparent",
                    animation: "spin 1s linear infinite",
                  }}
                />
                LOADING SUBJECTS…
              </div>
            ) : subjects.length === 0 ? (
              <div style={{ textAlign: "center", padding: "18px 8px" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📚</div>
                <p className="label" style={{ marginBottom: 10 }}>No chapters available yet.</p>
                <a
                  href="/dashboard"
                  style={{
                    color: "var(--neon-cyan)",
                    fontFamily: "var(--f-display)",
                    fontSize: 12,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  GENERATE CURRICULUM →
                </a>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {subjects.map((sub) => (
                  <div key={sub.subject_id}>
                    <div
                      className="label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                        color: "var(--neon-yel)",
                      }}
                    >
                      <span>{SUBJECT_EMOJIS[sub.subject_name] ?? "📚"}</span>
                      {sub.subject_name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sub.chapters.map((chapter) => {
                        const active = selectedChapterId === chapter.id;
                        return (
                          <button
                            key={chapter.id}
                            onClick={() => {
                              setSelectedChapterId(chapter.id);
                              setSelectedChapterTitle(chapter.title);
                            }}
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              borderRadius: 10,
                              fontSize: 13,
                              fontFamily: "var(--f-body)",
                              border: `2px solid ${active ? "#170826" : "var(--line-soft)"}`,
                              background: active ? "var(--neon-mag)" : "rgba(255,255,255,0.03)",
                              color: active ? "#170826" : "var(--ink)",
                              fontWeight: active ? 800 : 500,
                              cursor: "pointer",
                              boxShadow: active ? "0 3px 0 0 #170826" : "none",
                              transition: "all 140ms ease",
                            }}
                          >
                            <span style={{ opacity: 0.6, marginRight: 6, fontSize: 11 }}>
                              {chapter.order_index}.
                            </span>
                            {chapter.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Voice chat panel */}
          <section
            className={selectedChapterId ? "panel cyan" : "panel"}
            style={{ padding: 20, minHeight: 460, display: "flex", flexDirection: "column" }}
          >
            {selectedChapterId ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 14,
                    marginBottom: 14,
                    borderBottom: "2px solid var(--line-soft)",
                  }}
                >
                  <div>
                    <div className="label" style={{ color: "var(--neon-cyan)" }}>TUTORING</div>
                    <div
                      className="h-display"
                      style={{ fontSize: 18, color: "var(--ink)", marginTop: 4 }}
                    >
                      {selectedChapterTitle}
                    </div>
                  </div>
                  <div className="pill">
                    <span className="anim-glow" style={{ color: "var(--neon-lime)" }}>●</span> LIVE
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 380, display: "flex", flexDirection: "column" }}>
                  <VoiceChat chapterId={selectedChapterId} />
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  padding: 40,
                  color: "var(--ink-dim)",
                }}
              >
                <div>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🎙️</div>
                  <div
                    className="h-display"
                    style={{ fontSize: 20, color: "var(--ink)", marginBottom: 8 }}
                  >
                    Pick a chapter to start
                  </div>
                  <p className="label">
                    Byte will tutor you on that topic — hands-free.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ArcadeShell>
  );
}
