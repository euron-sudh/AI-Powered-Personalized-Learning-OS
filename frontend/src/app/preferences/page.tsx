"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, invalidateCache } from "@/lib/api";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ArcadeShell } from "@/components/arcade";

const GRADE_OPTIONS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Geography", "English", "Computer Science",
  "Economics", "Political Science", "Psychology", "Art",
];
const BOARD_OPTIONS = [
  { id: "CBSE", label: "CBSE", desc: "Central Board of Secondary Education (India)" },
  { id: "ICSE", label: "ICSE", desc: "Indian Certificate of Secondary Education" },
  { id: "Cambridge IGCSE", label: "Cambridge IGCSE", desc: "International GCSE" },
  { id: "IB", label: "IB", desc: "International Baccalaureate" },
  { id: "Common Core", label: "Common Core (US)", desc: "US Common Core State Standards" },
  { id: "Other", label: "Other / Not sure", desc: "AI-tailored curriculum" },
];

interface Profile {
  name: string;
  grade: string;
  board: string | null;
  interests: string[];
  background: string | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "2px solid var(--line)",
  background: "rgba(0,0,0,0.35)",
  color: "var(--ink)",
  fontFamily: "var(--f-body)",
  fontSize: 14,
  outline: "none",
};

export default function PreferencesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [background, setBackground] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    apiGet<Profile>("/api/onboarding/profile", 0)
      .then((p) => {
        setName(p.name ?? "");
        setGrade(p.grade ?? "");
        setBoard(p.board ?? "");
        setInterests(p.interests ?? []);
        setBackground(p.background ?? "");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  function toggleSubject(s: string) {
    setInterests((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    if (!grade) { setError("Grade is required."); return; }
    if (interests.length === 0) { setError("Select at least one subject."); return; }
    setError(null);
    setSaving(true);

    try {
      await apiPost("/api/onboarding", {
        name,
        grade,
        board: board === "Other" || !board ? null : board,
        interests,
        background: background || null,
        learning_goals: null,
      });
      invalidateCache("/api/onboarding/profile");
      setSuccess(true);
      setTimeout(() => router.push("/profile"), 1000);
    } catch (err: unknown) {
      let msg = "Failed to save preferences.";
      if (err instanceof Error) msg = err.message;
      setError(msg);
      setSaving(false);
    }
  }

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
    <ArcadeShell active="Dashboard" pixels={12}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        <div>
          <Link
            href="/profile"
            style={{
              color: "var(--neon-cyan)",
              fontSize: 12,
              fontFamily: "var(--f-display)",
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← Back to Profile
          </Link>
          <h1 className="h-display" style={{ fontSize: 32, margin: "8px 0 0", letterSpacing: 1 }}>
            Edit <span style={{ color: "var(--neon-mag)" }}>Preferences</span>
          </h1>
          <p style={{ color: "var(--ink-mute)", fontSize: 13, marginTop: 4 }}>
            Update your grade, board, and subjects.
          </p>
        </div>

        {error && (
          <div
            className="panel"
            style={{
              padding: "14px 18px",
              borderColor: "var(--neon-mag)",
              color: "var(--neon-mag)",
              fontSize: 13,
              fontFamily: "var(--f-body)",
            }}
          >
            ⚠ {error}
          </div>
        )}
        {success && (
          <div
            className="panel"
            style={{
              padding: "14px 18px",
              borderColor: "var(--neon-lime)",
              color: "var(--neon-lime)",
              fontSize: 13,
              fontFamily: "var(--f-body)",
            }}
          >
            ✓ Saved! Redirecting…
          </div>
        )}

        <div className="panel cyan" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="h-display" style={{ fontSize: 16, color: "var(--neon-cyan)" }}>BASIC INFO</div>
          <div>
            <label className="label" style={{ display: "block", marginBottom: 8 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="label" style={{ display: "block", marginBottom: 8 }}>Grade / Year</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select grade</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="panel mag" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="h-display" style={{ fontSize: 16, color: "var(--neon-mag)" }}>CURRICULUM BOARD</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {BOARD_OPTIONS.map((b) => {
              const active = board === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setBoard(b.id)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: `2px solid ${active ? "var(--neon-mag)" : "var(--line)"}`,
                    background: active ? "rgba(255,62,165,0.12)" : "rgba(0,0,0,0.35)",
                    color: active ? "var(--neon-mag)" : "var(--ink-dim)",
                    cursor: "pointer",
                    fontFamily: "var(--f-body)",
                    fontSize: 13,
                    boxShadow: active ? "0 0 14px rgba(255,62,165,0.35)" : "none",
                    transition: "all 150ms ease",
                  }}
                >
                  <span style={{ fontFamily: "var(--f-display)", fontWeight: 800, letterSpacing: 0.5 }}>{b.label}</span>
                  <span style={{ color: "var(--ink-mute)", marginLeft: 8 }}>— {b.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel yel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="h-display" style={{ fontSize: 16, color: "var(--neon-yel)" }}>SUBJECTS</div>
          <div style={{ color: "var(--ink-mute)", fontSize: 12 }}>
            Pick all that apply. These unlock your adaptive curriculum.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUBJECT_OPTIONS.map((s) => {
              const active = interests.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: `2px solid ${active ? "var(--neon-yel)" : "var(--line)"}`,
                    background: active ? "var(--neon-yel)" : "rgba(0,0,0,0.35)",
                    color: active ? "#170826" : "var(--ink-dim)",
                    cursor: "pointer",
                    fontFamily: "var(--f-display)",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    boxShadow: active ? "0 3px 0 0 #170826, 0 0 14px rgba(255,229,61,0.35)" : "none",
                    transition: "all 150ms ease",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="h-display" style={{ fontSize: 16, color: "var(--neon-lime)" }}>
            BACKGROUND{" "}
            <span style={{ color: "var(--ink-mute)", fontSize: 11, fontWeight: 500 }}>(optional)</span>
          </div>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={4}
            placeholder="e.g. I love science and want to study engineering..."
            style={{ ...inputStyle, resize: "none", fontFamily: "var(--f-body)" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Link href="/profile" className="pill" style={{ textDecoration: "none" }}>
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || success}
            className="chunky-btn cyan"
            style={{
              opacity: saving || success ? 0.6 : 1,
              cursor: saving || success ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      </div>
    </ArcadeShell>
  );
}
