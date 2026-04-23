"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet } from "@/lib/api";
import type { StudentProfile } from "@/types/student";
import { ArcadeShell, Byte, PixelBar } from "@/components/arcade";

interface ProgressData {
  subjects: Array<{
    subject_id: string;
    subject_name: string;
    chapters_completed: number;
    total_chapters: number;
    progress_percent: number;
    average_score: number | null;
    strengths: string[];
    weaknesses: string[];
  }>;
  streak_days: number;
  total_xp: number;
  current_level: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    Promise.all([
      apiGet<StudentProfile>("/api/onboarding/profile")
        .then(setProfile)
        .catch(() => setProfile(null)),
      apiGet<ProgressData>(`/api/progress/${user.id}`)
        .then(setProgress)
        .catch(() => setProgress(null)),
    ]).finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const initials = user?.email ? user.email[0].toUpperCase() : "U";
  const displayName = user?.user_metadata?.full_name ?? profile?.name ?? user?.email ?? "Student";

  if (authLoading || loading) {
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

  return (
    <ArcadeShell active="Dashboard" pixels={14}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="label" style={{ color: "var(--neon-cyan)" }}>Player Profile</div>
            <h1 className="h-display" style={{ fontSize: 34, margin: "6px 0 0", letterSpacing: 1 }}>
              {displayName}
            </h1>
            <div style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 4 }}>{user?.email}</div>
          </div>
          <span
            className="pill"
            style={{
              borderColor: "var(--neon-lime)",
              color: "var(--neon-lime)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--neon-lime)",
                boxShadow: "0 0 8px var(--neon-lime)",
              }}
            />
            ACTIVE STUDENT
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 20 }}>

          <div className="panel mag" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", padding: 24 }}>
            <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
              <Byte size={96} mood="happy" />
              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  right: -6,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, var(--neon-mag), var(--neon-vio))",
                  border: "2px solid #170826",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--f-display)",
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#fff",
                  boxShadow: "0 3px 0 0 #170826, 0 0 12px rgba(255,62,165,0.5)",
                }}
              >
                {initials}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="h-display" style={{ fontSize: 18 }}>{displayName}</div>
              <div style={{ color: "var(--ink-mute)", fontSize: 12, marginTop: 4 }}>
                {profile?.grade ? `Grade ${profile.grade}` : "Unranked"}
              </div>
            </div>

            {progress && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                <StatLine label="LEVEL" value={`LV ${progress.current_level}`} color="var(--neon-cyan)" />
                <StatLine label="TOTAL XP" value={`${progress.total_xp.toLocaleString()}`} color="var(--neon-yel)" />
                <StatLine label="STREAK" value={`${progress.streak_days}d`} color="var(--neon-ora)" />
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" }}>
              <a href="/preferences" className="pill" style={{ textDecoration: "none" }}>
                Edit Prefs
              </a>
              <a href="/analytics" className="pill" style={{ textDecoration: "none" }}>
                Analytics
              </a>
              <a href="/learn" className="pill" style={{ textDecoration: "none" }}>
                Subjects
              </a>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            <div className="panel cyan" style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
                <div className="h-display" style={{ fontSize: 16, color: "var(--neon-cyan)" }}>ACCOUNT DETAILS</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Row label="Email" value={user?.email ?? "—"} />
                <Row label="Name" value={profile?.name ?? displayName} />
                <Row label="Grade" value={profile?.grade ?? "—"} />
                <Row label="Board" value={(profile as any)?.board ?? "—"} />
                <Row
                  label="Member Since"
                  value={
                    user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"
                  }
                />
              </div>
            </div>

            {profile && (
              <div className="panel yel" style={{ padding: 0 }}>
                <div style={{ padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
                  <div className="h-display" style={{ fontSize: 16, color: "var(--neon-yel)" }}>LEARNING PROFILE</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {profile.interests && profile.interests.length > 0 && (
                    <div
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--line-soft)",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <span className="label" style={{ flexShrink: 0 }}>Interests</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                        {profile.interests.map((interest) => (
                          <span
                            key={interest}
                            className="pill"
                            style={{ borderColor: "var(--neon-cyan)", color: "var(--neon-cyan)", fontSize: 11 }}
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.background && (
                    <div
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <span className="label" style={{ flexShrink: 0 }}>Background</span>
                      <span style={{ color: "var(--ink-dim)", fontSize: 13, textAlign: "right", maxWidth: 400 }}>
                        {profile.background}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {progress && progress.subjects && progress.subjects.length > 0 && (
              <div className="panel" style={{ padding: 0 }}>
                <div style={{ padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
                  <div className="h-display" style={{ fontSize: 16, color: "var(--neon-lime)" }}>SUBJECT MASTERY</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {progress.subjects.map((subject, idx) => (
                    <div
                      key={subject.subject_id}
                      style={{
                        padding: "16px 20px",
                        borderBottom:
                          idx === progress.subjects.length - 1 ? "none" : "1px solid var(--line-soft)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={{ fontFamily: "var(--f-display)", fontWeight: 800, color: "var(--ink)", fontSize: 14 }}>
                          {subject.subject_name}
                        </span>
                        <span className="label" style={{ fontSize: 10 }}>
                          {subject.chapters_completed}/{subject.total_chapters} CHAPTERS
                        </span>
                      </div>
                      <PixelBar value={subject.progress_percent} color="var(--neon-cyan)" height={12} />
                      {subject.average_score !== null && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                          <span className="label" style={{ fontSize: 10 }}>Average Score</span>
                          <span style={{ fontSize: 12, color: "var(--neon-yel)", fontFamily: "var(--f-display)", fontWeight: 800 }}>
                            {Math.round(subject.average_score)}%
                          </span>
                        </div>
                      )}
                      {(subject.strengths?.length > 0 || subject.weaknesses?.length > 0) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {subject.strengths && subject.strengths.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {subject.strengths.map((strength) => (
                                <span
                                  key={strength}
                                  className="pill"
                                  style={{ borderColor: "var(--neon-lime)", color: "var(--neon-lime)", fontSize: 10 }}
                                >
                                  + {strength}
                                </span>
                              ))}
                            </div>
                          )}
                          {subject.weaknesses && subject.weaknesses.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {subject.weaknesses.map((weakness) => (
                                <span
                                  key={weakness}
                                  className="pill"
                                  style={{ borderColor: "var(--neon-ora)", color: "var(--neon-ora)", fontSize: 10 }}
                                >
                                  ! {weakness}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="panel" style={{ padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
                <div className="h-display" style={{ fontSize: 16, color: "var(--neon-mag)" }}>QUICK ACTIONS</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <ActionRow
                  label="Edit Preferences"
                  description="Update your grade, subjects, and learning goals"
                  href="/preferences"
                />
                <ActionRow
                  label="View Analytics"
                  description="See your learning progress and scores"
                  href="/analytics"
                />
                <ActionRow
                  label="My Subjects"
                  description="Browse and continue your enrolled subjects"
                  href="/learn"
                  last
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <a href="/preferences" className="chunky-btn cyan" style={{ textDecoration: "none" }}>
                Edit Profile
              </a>
            </div>
          </div>
        </div>
      </div>
    </ArcadeShell>
  );
}

function StatLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 10,
        background: "rgba(0,0,0,0.35)",
        border: "2px solid var(--line-soft)",
      }}
    >
      <span className="label" style={{ fontSize: 10 }}>{label}</span>
      <span style={{ fontFamily: "var(--f-display)", fontWeight: 900, fontSize: 14, color, textShadow: `0 0 10px ${color}` }}>
        {value}
      </span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--line-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span className="label">{label}</span>
      <span style={{ color: "var(--ink-dim)", fontSize: 13, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ActionRow({
  label,
  description,
  href,
  last,
}: {
  label: string;
  description: string;
  href: string;
  last?: boolean;
}) {
  return (
    <a
      href={href}
      style={{
        padding: "14px 20px",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        textDecoration: "none",
        transition: "background 150ms ease",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(39,224,255,0.05)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <div>
        <div style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: 13, color: "var(--ink)" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 2 }}>{description}</div>
      </div>
      <span style={{ color: "var(--neon-cyan)", fontFamily: "var(--f-display)", fontWeight: 900 }}>→</span>
    </a>
  );
}
