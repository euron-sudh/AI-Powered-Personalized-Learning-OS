"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Question {
  subj: string;
  cls: string;
  text: string;
  opts: string[];
  correct: number;
  exp: string;
}

interface AnswerRecord {
  q: string;
  correct: boolean;
  chosen: string;
  answer: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  Math: "#5b5eff",
  Science: "#1d9e75",
  English: "#ef9f27",
  History: "#e24b4a",
};

const SUBJECT_CLASSES: Record<string, string> = {
  Math: "badge-math",
  Science: "badge-sci",
  English: "badge-eng",
  History: "badge-hist",
};

// Sample questions pool (in production, fetch from API)
const ALL_QUESTIONS: Question[] = [
  {
    subj: "Math",
    cls: "badge-math",
    text: "What is the slope of the line y = 3x − 4?",
    opts: ["−4", "3", "7", "−3"],
    correct: 1,
    exp: "The slope is the coefficient of x. Here that is 3; the −4 is the y-intercept.",
  },
  {
    subj: "Math",
    cls: "badge-math",
    text: "Which point lies on the line y = 2x + 1?",
    opts: ["(0,0)", "(1,3)", "(2,4)", "(3,8)"],
    correct: 1,
    exp: "When x = 1: y = 2(1) + 1 = 3. So (1, 3) is on the line.",
  },
  {
    subj: "Science",
    cls: "badge-sci",
    text: "What is the primary function of the mitochondria?",
    opts: ["Protein synthesis", "Energy production", "DNA storage", "Cell division"],
    correct: 1,
    exp: "Mitochondria produce ATP through cellular respiration — they are the powerhouse of the cell.",
  },
  {
    subj: "Science",
    cls: "badge-sci",
    text: "How many chromosomes do human body cells normally contain?",
    opts: ["23", "44", "46", "48"],
    correct: 2,
    exp: "Human somatic cells contain 46 chromosomes (23 pairs). Gametes contain 23.",
  },
  {
    subj: "English",
    cls: "badge-eng",
    text: "Which literary device attributes human traits to non-human things?",
    opts: ["Simile", "Metaphor", "Personification", "Alliteration"],
    correct: 2,
    exp: "Personification gives human qualities to animals, objects, or abstract ideas.",
  },
  {
    subj: "English",
    cls: "badge-eng",
    text: "What is a thesis statement?",
    opts: [
      "A question the essay asks",
      "The final sentence of a conclusion",
      "A central argument that guides the essay",
      "A list of supporting evidence",
    ],
    correct: 2,
    exp: "A thesis is the central claim of an essay, usually appearing at the end of the introduction.",
  },
  {
    subj: "History",
    cls: "badge-hist",
    text: "Which acronym describes the main causes of World War I?",
    opts: ["STEM", "MAIN", "FACE", "DARE"],
    correct: 1,
    exp: "MAIN stands for Militarism, Alliances, Imperialism, Nationalism — the four root causes.",
  },
  {
    subj: "History",
    cls: "badge-hist",
    text: "In which year did World War II end?",
    opts: ["1943", "1944", "1945", "1946"],
    correct: 2,
    exp: "WWII ended in 1945 — V-E Day (May 8) in Europe, V-J Day (September 2) in the Pacific.",
  },
];

export default function PracticePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (!authLoading && user) {
      buildQuestions();
      setLoading(false);
    }
  }, [user, authLoading, router]);

  function buildQuestions() {
    const pool = subjectFilter === "all" ? ALL_QUESTIONS : ALL_QUESTIONS.filter((q) => q.subj === subjectFilter);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, 5));
    restartQuiz(shuffled.slice(0, 5));
  }

  function restartQuiz(qs: Question[] = questions) {
    setCurrentIdx(0);
    setScore(0);
    setAnswered(false);
    setStreak(0);
    setBestStreak(0);
    setAnswers([]);
    setShowResults(false);
    setSelectedOption(null);
    setFeedback(null);
  }

  function handleSubjectFilter(subj: string) {
    setSubjectFilter(subj);
    const pool = subj === "all" ? ALL_QUESTIONS : ALL_QUESTIONS.filter((q) => q.subj === subj);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, 5);
    setQuestions(qs);
    restartQuiz(qs);
  }

  function selectOption(optIdx: number) {
    if (answered) return;

    const q = questions[currentIdx];
    const isCorrect = optIdx === q.correct;

    setSelectedOption(optIdx);
    setAnswered(true);

    if (isCorrect) {
      setScore(score + 1);
      setStreak(streak + 1);
      setBestStreak(Math.max(bestStreak, streak + 1));
      setFeedback({ correct: true, text: `Correct! ${q.exp}` });
    } else {
      setStreak(0);
      setFeedback({ correct: false, text: `Not quite. ${q.exp}` });
    }

    setAnswers([...answers, { q: q.text, correct: isCorrect, chosen: q.opts[optIdx], answer: q.opts[q.correct] }]);
  }

  function nextQuestion() {
    if (currentIdx >= questions.length - 1) {
      setShowResults(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setAnswered(false);
      setFeedback(null);
    }
  }

  function skipQuestion() {
    const q = questions[currentIdx];
    setAnswers([...answers, { q: q.text, correct: false, chosen: "Skipped", answer: q.opts[q.correct] }]);
    setStreak(0);
    if (currentIdx >= questions.length - 1) {
      setShowResults(true);
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setAnswered(false);
      setFeedback(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-54px)] items-center justify-center bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-sm">Loading practice…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const q = questions[currentIdx];
  const accuracy = answers.length > 0 ? Math.round((score / answers.length) * 100) : 0;
  const totalAccuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-54px)] bg-[var(--bg-base)] flex">
      {/* Sidebar */}
      <div className="w-[200px] bg-[var(--bg-deep)] border-r border-[var(--border)] flex flex-col shrink-0 p-5">
        {/* Quiz filter */}
        <div className="mb-6">
          <div className="text-[10px] text-[var(--text-faint)] font-[500] uppercase tracking-wider mb-3">Quiz filter</div>
          <div className="space-y-1">
            {["all", "Math", "Science", "English", "History"].map((subj) => (
              <div
                key={subj}
                onClick={() => handleSubjectFilter(subj)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-[12px] cursor-pointer rounded transition-all",
                  subjectFilter === subj
                    ? "bg-[#111520] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[#111520]"
                )}
              >
                {subj !== "all" && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: SUBJECT_COLORS[subj] || "#5b5eff" }}
                  />
                )}
                <span>{subj === "all" ? "All subjects" : subj}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz meta */}
        <div className="border-t border-[var(--border)] pt-4">
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Questions</span>
              <span className="text-[var(--text-body)] font-[500]">{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Correct</span>
              <span className="text-[#1d9e75] font-[500]">{score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Accuracy</span>
              <span className="text-[var(--text-body)] font-[500]">{answers.length ? accuracy + "%" : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Streak</span>
              <span className="text-[var(--text-body)] font-[500]">{streak}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center p-6">
        {!showResults && q && (
          <div className="w-full max-w-[600px]">
            {/* Progress row */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="flex-1 h-1 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
              <div className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">{currentIdx + 1} / {questions.length}</div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-3 py-1 text-[12px] text-[var(--text-body)] whitespace-nowrap">
                Score: <span className="font-[500]">{score}</span> / <span className="font-[500]">{questions.length}</span>
              </div>
            </div>

            {/* Question card */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 mb-4">
              <div className={cn("text-[11px] font-[500] uppercase tracking-wider mb-3 px-2 py-1 rounded w-fit", `badge ${SUBJECT_CLASSES[q.subj] || "badge-math"}`)}>
                {q.subj}
              </div>
              <h3 className="text-base font-[500] text-white mb-6 leading-relaxed">{q.text}</h3>

              {/* Options */}
              <div className="space-y-2.5 mb-4">
                {q.opts.map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => selectOption(i)}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all",
                      selectedOption === i && !answered
                        ? "border-[#3d3faa] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : answered && i === q.correct
                        ? "border-[#1d9e75] bg-[#0f2a1f] text-[#5dcaa5]"
                        : answered && i === selectedOption && i !== q.correct
                        ? "border-[#e24b4a] bg-[#2a1a1a] text-[#f09595]"
                        : "border-[var(--border-mid)] bg-[var(--bg-raised)] text-[var(--text-body)] hover:border-[#3d3faa] hover:bg-[var(--accent-soft)]",
                      answered && "cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-[500] flex-shrink-0",
                        answered && i === q.correct
                          ? "bg-[#1d9e75] text-white"
                          : answered && i === selectedOption && i !== q.correct
                          ? "bg-[#e24b4a] text-white"
                          : selectedOption === i && !answered
                          ? "bg-[#3d3faa] text-white"
                          : "bg-[#2a2d45] text-[var(--text-muted)]"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    {opt}
                  </div>
                ))}
              </div>

              {/* Feedback */}
              {feedback && (
                <div
                  className={cn(
                    "p-3.5 rounded-2xl border flex gap-2.5 items-start",
                    feedback.correct
                      ? "bg-[#0f2a1f] border-[#1d9e75] text-[#5dcaa5]"
                      : "bg-[#2a1a1a] border-[#7a2a2a] text-[#f09595]"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      feedback.correct ? "bg-[#1d9e75]" : "bg-[#e24b4a]"
                    )}
                  >
                    {feedback.correct ? (
                      <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-white fill-none" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-white fill-none" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                  <div className="text-[13px] leading-relaxed">{feedback.text}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button onClick={skipQuestion} className="px-4 py-2 text-[12px] text-[var(--accent)] border border-[var(--border-mid)] rounded-2xl hover:bg-[#1a1f2e] transition-all">
                Skip
              </button>
              <button
                onClick={nextQuestion}
                disabled={!answered}
                className={cn(
                  "px-4 py-2 text-[12px] rounded-2xl font-[500] transition-all",
                  answered
                    ? "bg-[var(--accent)] text-white hover:bg-[#3d3faa]"
                    : "bg-[#2a2d45] text-[var(--text-muted)] cursor-not-allowed opacity-50"
                )}
              >
                {currentIdx === questions.length - 1 ? "See results →" : "Next question →"}
              </button>
            </div>
          </div>
        )}

        {showResults && (
          <div className="w-full max-w-[600px] text-center py-8">
            {/* Results icon */}
            <div className="w-20 h-20 rounded-full bg-[#0f2a1f] border-2 border-[#1d9e75] flex items-center justify-center mx-auto mb-6">
              <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-[#1d9e75] fill-none" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="text-xl font-[500] text-white mb-1">Quiz complete!</h2>
            <p className="text-[12px] text-[var(--text-muted)] mb-6">
              You scored {score} out of {questions.length} {totalAccuracy >= 80 ? "— great work!" : "— keep practising!"}
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3">
                <div className="text-xl font-[500] text-white">{score}/{questions.length}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Score</div>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3">
                <div className="text-xl font-[500] text-white">{totalAccuracy}%</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Accuracy</div>
              </div>
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-3">
                <div className="text-xl font-[500] text-white">{bestStreak}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Best streak</div>
              </div>
            </div>

            {/* Question breakdown */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-4 mb-6 text-left">
              <div className="space-y-2.5">
                {answers.map((ans, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-1 border-b border-[var(--border)] last:border-b-0">
                    <span className="text-[12px] text-[var(--text-muted)] flex-1 truncate">{ans.q.slice(0, 50)}{ans.q.length > 50 ? "…" : ""}</span>
                    <span className={cn("text-[11px] font-[500] whitespace-nowrap", ans.correct ? "text-[#5dcaa5]" : "text-[#f09595]")}>
                      {ans.correct ? `✓ ${ans.answer}` : `✗ ${ans.chosen}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button onClick={() => handleSubjectFilter(subjectFilter)} className="flex-1 px-4 py-2.5 text-[12px] bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--accent)] rounded-2xl hover:bg-[#1a1f2e] transition-all font-[500]">
                Try again →
              </button>
              <button onClick={() => router.push("/learn")} className="flex-1 px-4 py-2.5 text-[12px] bg-[var(--accent)] border border-[#5b5eff] text-white rounded-2xl hover:bg-[#3d3faa] transition-all font-[500]">
                Ask AI tutor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
