"use client";

import { useCallback, useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { ArcadeShell, PixelBar } from "@/components/arcade";

interface Subject {
  id: string;
  name: string;
}

interface Milestone {
  day: number;
  title: string;
  tasks: string[];
  deliverable: string;
}

interface Project {
  title: string;
  pitch: string;
  estimated_days: number;
  skills_used: string[];
  milestones: Milestone[];
  stretch_goal: string;
}

export default function ProjectModePage() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string>("");
  const [theme, setTheme] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const auth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : null;
  }, []);

  // Hydrate any saved checkpoint from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("learnos.project");
    if (cached) {
      try {
        const { project: p, done: d } = JSON.parse(cached);
        if (p) setProject(p);
        if (d) setDone(d);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (project) {
      localStorage.setItem("learnos.project", JSON.stringify({ project, done }));
    }
  }, [project, done]);

  // Fetch the student's subjects
  useEffect(() => {
    if (!user || authLoading) return;
    (async () => {
      const headers = await auth();
      if (!headers) return;
      // The Quest Builder dropdown was empty because this was hitting
      // /api/curriculum (no root handler → 404). The real endpoint for
      // "list this student's subjects" is /api/onboarding/subjects.
      const res = await fetch("/api/proxy/api/onboarding/subjects", { headers });
      if (res.ok) {
        const data = await res.json();
        const list: Subject[] = (data.subjects || []).map((s: any) => ({
          id: s.id,
          name: s.name,
        }));
        setSubjects(list);
        if (list.length && !subjectId) setSubjectId(list[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, auth]);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const headers = await auth();
      if (!headers) {
        setErr("Please sign in.");
        return;
      }
      const res = await fetch("/api/proxy/api/projects/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: subjectId || null,
          theme: theme || null,
        }),
      });
      if (!res.ok) {
        setErr("Couldn't generate a project right now.");
        return;
      }
      setProject(await res.json());
      setDone({});
    } finally {
      setBusy(false);
    }
  }

  function toggleTask(key: string) {
    setDone((d) => ({ ...d, [key]: !d[key] }));
  }

  function reset() {
    setProject(null);
    setDone({});
    localStorage.removeItem("learnos.project");
  }

  const totalTasks = project?.milestones.reduce((n, m) => n + m.tasks.length, 0) ?? 0;
  const doneCount = Object.values(done).filter(Boolean).length;
  const pct = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

  if (authLoading || !user) {
    return (
      <ArcadeShell active="Dashboard" pixels={10}>
        <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center" }}>
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0 auto 16px",
                borderRadius: 12,
                background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                border: "3px solid #170826",
                boxShadow: "0 0 24px rgba(255,62,165,0.6)",
              }}
              className="anim-bop"
            />
            <span className="label" style={{ color: "var(--neon-mag)" }}>LOADING QUEST…</span>
          </div>
        </div>
      </ArcadeShell>
    );
  }

  return (
    <ArcadeShell active="Dashboard" pixels={14}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span className="label" style={{ color: "var(--neon-mag)" }}>⚒ MULTI-DAY QUEST</span>
        <h1 className="h-display" style={{ fontSize: 40, margin: "8px 0 4px" }}>
          Quest <span style={{ color: "var(--neon-mag)" }}>Builder</span>
        </h1>
        <p style={{ color: "var(--ink-dim)" }}>
          Apply what you&rsquo;ve learned to build something real.
        </p>
      </div>

      {/* Generation form (no project yet) */}
      {!project && !busy && (
        <div className="panel mag" style={{ padding: 28, position: "relative", overflow: "hidden" }}>
          <div className="scanline" />

          <div style={{ marginBottom: 16, position: "relative" }}>
            <span className="label" style={{ color: "var(--neon-cyan)" }}>
              ◆ CHOOSE A SUBJECT
            </span>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.5)",
                border: "2px solid var(--line)",
                borderRadius: 12,
                color: "var(--ink)",
                fontFamily: "var(--f-body)",
                fontSize: 14,
                outline: "none",
              }}
            >
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20, position: "relative" }}>
            <span className="label" style={{ color: "var(--neon-yel)" }}>
              ✦ THEME OR INTEREST (OPTIONAL)
            </span>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. space, music, sports, environment"
              style={{
                marginTop: 8,
                width: "100%",
                padding: "12px 14px",
                background: "rgba(0,0,0,0.5)",
                border: "2px solid var(--line)",
                borderRadius: 12,
                color: "var(--ink)",
                fontFamily: "var(--f-body)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={generate}
            disabled={busy}
            className="chunky-btn"
            style={{
              width: "100%",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
              position: "relative",
            }}
          >
            ✦ GENERATE QUEST
          </button>

          {err && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                border: "2px solid var(--neon-mag)",
                background: "rgba(255,62,165,0.1)",
                color: "var(--neon-mag)",
                fontSize: 13,
                position: "relative",
              }}
            >
              {err}
            </div>
          )}
        </div>
      )}

      {/* Generation loading (Byte drafting) */}
      {busy && !project && (
        <div
          className="panel mag"
          style={{ padding: 40, textAlign: "center", position: "relative", overflow: "hidden" }}
        >
          <div className="scanline" />
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 8 }} className="anim-wobble">🤖</div>
          <span className="label" style={{ color: "var(--neon-mag)" }}>WORKING…</span>
          <h2 className="h-display" style={{ fontSize: 26, margin: "8px 0 6px" }}>
            Byte is drafting your quest
          </h2>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, maxWidth: 400, margin: "0 auto 18px" }}>
            Designing milestones, tasks, and a stretch goal just for you.
          </p>
          <div style={{ maxWidth: 280, margin: "0 auto" }}>
            <PixelBar value={70} color="var(--neon-mag)" />
          </div>
        </div>
      )}

      {/* Active project */}
      {project && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Overview */}
          <div className="panel cyan" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
            <div className="scanline" />
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
                marginBottom: 10,
                position: "relative",
              }}
            >
              <h2 className="h-display" style={{ fontSize: 28, lineHeight: 1.2 }}>
                {project.title}
              </h2>
              <span
                className="pill"
                style={{
                  color: "var(--neon-yel)",
                  borderColor: "var(--neon-yel)",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {project.estimated_days} days
              </span>
            </div>
            <p
              style={{
                color: "var(--ink-dim)",
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 16,
                position: "relative",
              }}
            >
              {project.pitch}
            </p>

            {project.skills_used?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18, position: "relative" }}>
                {project.skills_used.map((s) => (
                  <span
                    key={s}
                    className="pill"
                    style={{ color: "var(--neon-lime)", borderColor: "var(--neon-lime)", fontSize: 10 }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Progress */}
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="label" style={{ color: "var(--neon-cyan)" }}>Progress</span>
                <span className="label">{doneCount} / {totalTasks} tasks · {pct}%</span>
              </div>
              <PixelBar value={pct} color="var(--neon-cyan)" />
            </div>
          </div>

          {/* Milestones */}
          {project.milestones.map((m, mi) => {
            const milestoneDoneAll = m.tasks.every((_, ti) => done[`${mi}-${ti}`]);
            return (
              <div
                key={mi}
                className={`panel ${milestoneDoneAll ? "lime" : ""}`}
                style={{
                  padding: 22,
                  position: "relative",
                  overflow: "hidden",
                  borderColor: milestoneDoneAll ? "var(--neon-lime)" : undefined,
                }}
              >
                <div className="scanline" />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: milestoneDoneAll
                        ? "linear-gradient(135deg, var(--neon-lime), var(--neon-cyan))"
                        : "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                      border: "2px solid #170826",
                      boxShadow: milestoneDoneAll
                        ? "0 3px 0 #170826, 0 0 14px rgba(164,255,94,0.5)"
                        : "0 3px 0 #170826, 0 0 14px rgba(255,62,165,0.5)",
                      display: "grid",
                      placeItems: "center",
                      fontFamily: "var(--f-display)",
                      fontWeight: 900,
                      fontSize: 13,
                      color: "#170826",
                      flexShrink: 0,
                    }}
                  >
                    D{m.day}
                  </div>
                  <h3 className="h-display" style={{ fontSize: 18, lineHeight: 1.3 }}>
                    {m.title}
                  </h3>
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    position: "relative",
                  }}
                >
                  {m.tasks.map((t, ti) => {
                    const key = `${mi}-${ti}`;
                    const isDone = !!done[key];
                    return (
                      <li key={ti}>
                        <button
                          onClick={() => toggleTask(key)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            textAlign: "left",
                            padding: "10px 12px",
                            background: isDone ? "rgba(164,255,94,0.08)" : "rgba(255,255,255,0.03)",
                            border: `2px solid ${isDone ? "var(--neon-lime)" : "var(--line)"}`,
                            borderRadius: 10,
                            color: isDone ? "var(--neon-lime)" : "var(--ink)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            fontFamily: "var(--f-body)",
                            fontSize: 13,
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: `2px solid ${isDone ? "var(--neon-lime)" : "var(--ink-mute)"}`,
                              background: isDone ? "var(--neon-lime)" : "transparent",
                              color: "#170826",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 900,
                              flexShrink: 0,
                              marginTop: 1,
                              boxShadow: isDone ? "0 0 10px rgba(164,255,94,0.6)" : "none",
                            }}
                          >
                            {isDone ? "✓" : ""}
                          </span>
                          <span
                            style={{
                              textDecoration: isDone ? "line-through" : "none",
                              opacity: isDone ? 0.75 : 1,
                              lineHeight: 1.5,
                            }}
                          >
                            {t}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div
                  style={{
                    padding: "10px 14px",
                    borderLeft: "4px solid var(--neon-yel)",
                    background: "rgba(255,229,61,0.08)",
                    borderRadius: "0 10px 10px 0",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span className="label" style={{ color: "var(--neon-yel)" }}>
                      🎯 Deliverable
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink-dim)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {m.deliverable}
                  </p>
                </div>
              </div>
            );
          })}

          {project.stretch_goal && (
            <div className="panel yel" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
              <div className="scanline" />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  position: "relative",
                }}
              >
                <span style={{ fontSize: 18 }}>🚀</span>
                <span className="label" style={{ color: "var(--neon-yel)" }}>
                  STRETCH GOAL
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-dim)",
                  lineHeight: 1.6,
                  margin: 0,
                  position: "relative",
                }}
              >
                {project.stretch_goal}
              </p>
            </div>
          )}

          <button
            onClick={reset}
            className="chunky-btn"
            style={{ width: "100%", cursor: "pointer" }}
          >
            ↻ START A NEW QUEST
          </button>
        </div>
      )}
    </ArcadeShell>
  );
}
