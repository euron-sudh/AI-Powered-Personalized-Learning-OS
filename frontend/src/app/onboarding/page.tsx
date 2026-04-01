"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import StepIndicator from "./components/StepIndicator";
import BoardSelector from "./components/BoardSelector";
import SubjectSelector from "./components/SubjectSelector";
import MarksheetUpload from "./components/MarksheetUpload";

const GRADE_OPTIONS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Geography", "English", "Computer Science",
  "Economics", "Political Science", "Psychology", "Art",
];

const BOARD_OPTIONS = [
  {
    id: "CBSE",
    name: "CBSE",
    description: "Central Board of Secondary Education (India) — NCERT-aligned",
    flag: "🇮🇳",
  },
  {
    id: "ICSE",
    name: "ICSE",
    description: "Indian Certificate of Secondary Education — in-depth syllabus",
    flag: "🇮🇳",
  },
  {
    id: "Cambridge IGCSE",
    name: "Cambridge IGCSE",
    description: "International General Certificate of Secondary Education",
    flag: "🇬🇧",
  },
  {
    id: "IB",
    name: "IB (International Baccalaureate)",
    description: "MYP / Diploma Programme — inquiry-based international curriculum",
    flag: "🌐",
  },
  {
    id: "Common Core",
    name: "Common Core (US)",
    description: "US Common Core State Standards",
    flag: "🇺🇸",
  },
  {
    id: "Other",
    name: "Other / Not sure",
    description: "We'll generate an AI-tailored curriculum for you",
    flag: "📚",
  },
];

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [background, setBackground] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [marksheetFile, setMarksheetFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }

  function toggleSubject(subject: string) {
    setInterests((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  }

  async function handleFinish() {
    if (interests.length === 0) {
      setError("Please select at least one subject.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      // Upload marksheet if provided
      if (marksheetFile) {
        const formData = new FormData();
        formData.append("file", marksheetFile);
        const { supabase } = await import("@/lib/supabase");
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/onboarding/marksheet`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });
        }
      }

      await apiPost("/api/onboarding", {
        name,
        grade,
        board: board === "Other" ? null : board || null,
        interests,
        background: background || null,
        learning_goals: learningGoals || null,
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      let msg = "Something went wrong. Please try again.";
      if (err instanceof Error) {
        try { msg = (JSON.parse(err.message) as { detail?: string }).detail ?? err.message; }
        catch { msg = err.message; }
      }
      setError(msg);
      setSubmitting(false);
    }
  }

  const steps = [
    { label: "Your Info", num: 1 },
    { label: "Board", num: 2 },
    { label: "Subjects", num: 3 },
    { label: "Background", num: 4 },
    { label: "Marksheet", num: 5 },
  ];

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Step indicator */}
        <StepIndicator steps={steps} currentStep={step} />

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tell us about yourself</h2>
                <p className="text-gray-500 text-sm mt-1">We&apos;ll personalise everything for you.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Alex"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Year</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select your grade</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g === "K" ? "Kindergarten" : `Grade ${g}`}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (!name.trim()) return setError("Please enter your name.");
                  if (!grade) return setError("Please select your grade.");
                  setError(null);
                  setStep(2);
                }}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Next →
              </button>
            </div>
          )}

          {/* Step 2: Board selection */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Which curriculum board?</h2>
                <p className="text-gray-500 text-sm mt-1">
                  We&apos;ll use the official syllabus so chapter names match your textbooks exactly.
                </p>
              </div>
              <BoardSelector options={BOARD_OPTIONS} selected={board} onSelect={setBoard} />
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!board) return setError("Please select a curriculum board.");
                    setError(null);
                    setStep(3);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Subject selection */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">What do you want to learn?</h2>
                <p className="text-gray-500 text-sm mt-1">Pick one or more subjects. You can add more later.</p>
              </div>
              <SubjectSelector options={SUBJECT_OPTIONS} selected={interests} onToggle={toggleSubject} />
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (interests.length === 0) return setError("Select at least one subject.");
                    setError(null);
                    setStep(4);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Background */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your background</h2>
                <p className="text-gray-500 text-sm mt-1">This helps us tailor the difficulty and examples. Optional.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic background or prior knowledge
                </label>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. I've studied basic algebra. I love football and cooking."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Learning goals
                </label>
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. I want to ace my Physics exam this semester."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button onClick={() => { setError(null); setStep(5); }} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Marksheet upload */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Upload your marksheet</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Optional — helps us understand your current level and personalise your curriculum.
                </p>
              </div>
              <MarksheetUpload file={marksheetFile} onChange={setMarksheetFile} />

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(4)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? "Setting up your account…" : "Finish Setup"}
                </button>
              </div>
            </div>
          )}

          {error && step !== 5 && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
