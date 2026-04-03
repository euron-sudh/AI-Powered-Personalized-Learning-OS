"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, invalidateCache } from "@/lib/api";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

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
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">← Back to Profile</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Preferences</h1>
          <p className="text-gray-500 text-sm">Update your grade, board, and subjects.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">Saved! Redirecting…</div>
        )}

        {/* Name & Grade */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Info</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Year</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select grade</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Board */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Curriculum Board</h2>
          <div className="grid grid-cols-1 gap-2">
            {BOARD_OPTIONS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBoard(b.id)}
                className={`text-left px-4 py-3 rounded-lg border transition text-sm ${
                  board === b.id
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span className="font-medium">{b.label}</span>
                <span className="text-gray-400 ml-2">— {b.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  interests.includes(s)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Background <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            rows={3}
            placeholder="e.g. I love science and want to study engineering..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || success}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Preferences"}
        </button>
      </div>
    </main>
  );
}
