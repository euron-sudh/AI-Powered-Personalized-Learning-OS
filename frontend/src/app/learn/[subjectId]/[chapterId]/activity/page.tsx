"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiGet, apiPost, invalidateCache } from "@/lib/api";

interface Question {
  id: string;
  type: "multiple_choice" | "short_answer" | "problem";
  question: string;
  options?: string[];
  hint?: string;
}

interface ActivityData {
  activity_id: string;
  type: string;
  status: string;
  prompt: {
    title: string;
    instructions: string;
    questions: Question[];
  };
}

interface EvaluationResult {
  score: number;
  correctness: { overall: string; details: Record<string, string> };
  feedback: string;
  guidance: string;
}

export default function ActivityPage({
  params,
}: {
  params: { subjectId: string; chapterId: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"quiz" | "submitted" | "evaluated">("quiz");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    apiGet<ActivityData>(`/api/activities/${params.chapterId}/activity`)
      .then((data) => {
        setActivity(data);
        if (data.status === "evaluated") setPhase("evaluated");
        else if (data.status === "submitted") setPhase("submitted");
      })
      .catch(() => setError("No activity found for this chapter yet. Complete the lesson first!"))
      .finally(() => setLoading(false));
  }, [user, authLoading, params.chapterId, router]);

  function setResponse(questionId: string, value: string) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!activity) return;
    const unanswered = activity.prompt.questions.filter((q) => !responses[q.id]);
    if (unanswered.length > 0) {
      setError(`Please answer all questions. (${unanswered.length} remaining)`);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await apiPost(`/api/activities/${activity.activity_id}/submit`, { responses });
      setPhase("submitted");

      // Immediately evaluate
      const result = await apiPost<EvaluationResult>(
        `/api/activities/${activity.activity_id}/evaluate`,
        {}
      );
      setEvaluation(result);
      setPhase("evaluated");
      // Invalidate cached progress and curriculum so dashboard updates immediately
      invalidateCache("/api/progress");
      invalidateCache("/api/curriculum");
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/learn/${params.subjectId}/${params.chapterId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Go back to the lesson
          </Link>
        </div>
      </div>
    );
  }

  if (!activity) return null;

  const scoreColor =
    (evaluation?.score ?? 0) >= 80
      ? "text-green-600"
      : (evaluation?.score ?? 0) >= 60
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/learn/${params.subjectId}/${params.chapterId}`}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to Lesson
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{activity.prompt.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{activity.prompt.instructions}</p>
        </div>

        {/* Evaluation results */}
        {phase === "evaluated" && evaluation && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <div className="text-center mb-6">
              <div className={`text-5xl font-bold ${scoreColor}`}>{evaluation.score}%</div>
              <div className={`text-sm font-medium mt-1 capitalize ${scoreColor}`}>
                {evaluation.correctness.overall}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 text-sm mb-1">Feedback</h3>
                <p className="text-blue-800 text-sm">{evaluation.feedback}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="font-semibold text-amber-900 text-sm mb-1">What to review</h3>
                <p className="text-amber-800 text-sm">{evaluation.guidance}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Link
                href={`/learn/${params.subjectId}/${params.chapterId}`}
                className="flex-1 text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Review Lesson
              </Link>
              <Link
                href={`/learn/${params.subjectId}`}
                className="flex-1 text-center bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Next Chapter →
              </Link>
            </div>
          </div>
        )}

        {/* Questions */}
        {phase !== "evaluated" && (
          <div className="space-y-5">
            {activity.prompt.questions.map((question, idx) => (
              <div key={question.id} className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-gray-900 text-sm font-medium leading-relaxed">{question.question}</p>
                </div>

                {question.type === "multiple_choice" && question.options && (
                  <div className="space-y-2 ml-10">
                    {question.options.map((option) => (
                      <label key={option} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={question.id}
                          value={option.charAt(0)}
                          onChange={(e) => setResponse(question.id, e.target.value)}
                          checked={responses[question.id] === option.charAt(0)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {(question.type === "short_answer" || question.type === "problem") && (
                  <div className="ml-10">
                    {question.hint && (
                      <p className="text-xs text-amber-600 mb-2">💡 Hint: {question.hint}</p>
                    )}
                    <textarea
                      rows={3}
                      value={responses[question.id] ?? ""}
                      onChange={(e) => setResponse(question.id, e.target.value)}
                      placeholder="Write your answer here…"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {phase === "submitted" && !evaluation && (
              <div className="text-center py-6 text-gray-500">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm">Evaluating your answers…</p>
              </div>
            )}

            {phase === "quiz" && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {submitting ? "Submitting…" : "Submit Answers"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
