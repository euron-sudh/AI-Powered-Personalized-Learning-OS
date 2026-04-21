"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Hammer,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
      const res = await fetch("/api/proxy/api/curriculum", { headers });
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
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Hammer className="w-7 h-7 text-[var(--brand-blue)]" strokeWidth={2} />
            Project mode
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Apply what you&rsquo;ve learned to build something real.
          </p>
        </header>

        {!project && (
          <section className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-blue)]"
              >
                <option value="">Any subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Theme or interest (optional)
              </label>
              <input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. space, music, sports, environment"
                className="mt-1 w-full bg-[var(--bg-deep)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--brand-blue)]"
              />
            </div>

            <button
              onClick={generate}
              disabled={busy}
              className="w-full bg-[var(--brand-blue)] hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center gap-2"
            >
              {busy ? (
                <><Sparkles className="w-4 h-4 animate-pulse" /> Designing your project…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate project</>
              )}
            </button>

            {err && (
              <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm rounded-xl px-4 py-2">
                {err}
              </div>
            )}
          </section>
        )}

        {project && (
          <div className="space-y-5">
            <section className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
                  {project.title}
                </h2>
                <span className="bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0">
                  {project.estimated_days} days
                </span>
              </div>
              <p className="text-[var(--text-body)] leading-relaxed mb-4">{project.pitch}</p>

              {project.skills_used?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {project.skills_used.map((s) => (
                    <span
                      key={s}
                      className="bg-[var(--bg-deep)] text-[var(--text-muted)] text-[11px] font-bold px-2.5 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  <span>Progress</span>
                  <span>{doneCount} / {totalTasks} tasks</span>
                </div>
                <div className="h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand-blue)] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </section>

            {project.milestones.map((m, mi) => {
              const milestoneDoneAll = m.tasks.every((_, ti) => done[`${mi}-${ti}`]);
              return (
                <section
                  key={mi}
                  className={cn(
                    "bg-white border rounded-2xl p-5 shadow-card transition-colors",
                    milestoneDoneAll ? "border-[var(--brand-blue)]" : "border-[var(--border)]",
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        milestoneDoneAll
                          ? "bg-[var(--brand-blue)] text-white"
                          : "bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]",
                      )}
                    >
                      D{m.day}
                    </div>
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                      {m.title}
                    </h3>
                  </div>
                  <ul className="space-y-2 mb-3">
                    {m.tasks.map((t, ti) => {
                      const key = `${mi}-${ti}`;
                      const isDone = !!done[key];
                      return (
                        <li key={ti}>
                          <button
                            onClick={() => toggleTask(key)}
                            className="w-full flex items-start gap-2 text-left hover:bg-[var(--bg-deep)] rounded-lg px-2 py-1.5 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-[var(--brand-blue)] shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                            )}
                            <span
                              className={cn(
                                "text-sm",
                                isDone ? "text-[var(--text-muted)] line-through" : "text-[var(--text-body)]",
                              )}
                            >
                              {t}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="bg-[var(--brand-blue-soft)] border-l-4 border-[var(--brand-blue)] rounded-r-lg px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-[var(--brand-blue)] mb-0.5 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Deliverable
                    </div>
                    <p className="text-xs text-[var(--text-body)]">{m.deliverable}</p>
                  </div>
                </section>
              );
            })}

            {project.stretch_goal && (
              <section className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-card">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
                  <Rocket className="w-4 h-4 text-[var(--subject-coding)]" /> Stretch goal
                </div>
                <p className="text-sm text-[var(--text-body)]">{project.stretch_goal}</p>
              </section>
            )}

            <button
              onClick={reset}
              className="w-full bg-white border border-[var(--border)] hover:bg-[var(--bg-deep)] text-[var(--text-body)] font-semibold rounded-xl py-3 text-sm"
            >
              Start a new project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
