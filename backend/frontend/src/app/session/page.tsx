"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Concept {
  id: string;
  title: string;
  explanation: string;
  order_index: number;
}

interface Question {
  prompt: string;
  options: string[];
  type: string;
}

interface SessionStartResponse {
  session_id: string;
  chapter_title: string;
  step: number;
  concept: Concept;
  question: Question;
}

interface StepResponse {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  xp_earned: number;
  next?: { concept: Concept; question: Question } | null;
}

type State = "loading" | "question" | "feedback" | "complete";

export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subjectId");
  const chapterId = searchParams.get("chapterId");
  
  const [state, setstate] = useState<State>("loading");
  const [sessionId, setSessionId] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [step, setStep] = useState<number>(1);
  const [concept, setConcept] = useState<Concept | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [feedback, setFeedback] = useState<StepResponse | null>(null);
  const [listeningAudio, setListeningAudio] = useState<boolean>(false);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [cumulativeXp, setCumulativeXp] = useState<number>(0);

  useEffect(() => {
    if (!subjectId || !chapterId) {
      router.push("/dashboard");
      return;
    }

    const startSession = async () => {
      try {
        const data = await apiPost<SessionStartResponse>("/sessions/start", {
          subject_id: subjectId,
          chapter_id: chapterId,
        });

        setSessionId(data.session_id);
        setChapterTitle(data.chapter_title);
        setStep(data.step);
        setConcept(data.concept);
        setQuestion(data.question);
        setstate("question");
      } catch (err) {
        console.error("Failed to start session:", err);
        router.push("/dashboard");
      }
    };

    startSession();
  }, [subjectId, chapterId, router]);

  const handleListen = async () => {
    if (!concept?.explanation) return;
    setListeningAudio(true);
    try {
      const utterance = new SpeechSynthesisUtterance(concept.explanation);
      utterance.rate = 0.9;
      utterance.onend = () => setListeningAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("TTS failed:", err);
      setListeningAudio(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!concept || !sessionId) return;
    setstate("loading");
    try {
      const data = await apiPost<StepResponse>(`/sessions/${sessionId}/step`, {
        concept_id: concept.id,
        user_answer: selectedAnswer,
        time_taken_seconds: 30,
      });
      setFeedback(data);
      setstate("feedback");
      setCumulativeXp((prev) => prev + data.xp_earned);
      setTotalSteps((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setstate("question");
    }
  };

  const handleContinue = async () => {
    if (!feedback || !sessionId) return;
    if (feedback.next) {
      setConcept(feedback.next.concept);
      setQuestion(feedback.next.question);
      setSelectedAnswer("");
      setFeedback(null);
      setStep((prev) => prev + 1);
      setstate("question");
    } else {
      setstate("complete");
      try {
        await apiPost(`/sessions/${sessionId}/end`, {});
        setTimeout(() => {
          router.push(`/session/complete?xp=${cumulativeXp}&streak=1&level=1`);
        }, 1000);
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }
  };

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading concept...</p>
        </div>
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="w-96 p-8 text-center bg-slate-800 border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-4">Session Complete!</h1>
          <p className="text-slate-300 mb-6">Redirecting...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{chapterTitle}</h1>
            <p className="text-slate-400">Step {step}</p>
          </div>
          <div className="text-2xl font-bold text-yellow-400">XP: {cumulativeXp}</div>
        </div>

        <Card className="bg-slate-800 border-slate-700 p-8 mb-6">
          {state === "question" && concept && question && (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">{concept.title}</h2>
                <p className="text-slate-300 leading-relaxed mb-6">{concept.explanation}</p>
                <button
                  onClick={handleListen}
                  disabled={listeningAudio}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition"
                >
                  <span className="text-lg">Listen</span>
                </button>
              </div>

              <div className="border-t border-slate-700 pt-8">
                <h3 className="text-lg font-semibold text-white mb-4">{question.prompt}</h3>

                <div className="space-y-3 mb-8">
                  {question.options.map((option, idx) => (
                    <label key={idx} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-700 transition">
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={selectedAnswer === option}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-slate-200">{option}</span>
                    </label>
                  ))}
                </div>

                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="w-full py-3 text-lg font-semibold"
                >
                  Submit Answer
                </Button>
              </div>
            </>
          )}

          {state === "feedback" && feedback && (
            <>
              <div className={`p-6 rounded-lg mb-6 ${feedback.is_correct ? "bg-green-900/30 border border-green-600" : "bg-red-900/30 border border-red-600"}`}>
                <h3 className={feedback.is_correct ? "text-green-300" : "text-red-300" + " text-lg font-bold mb-2"}>
                  {feedback.is_correct ? "Correct!" : "Not quite right"}
                </h3>
                <p className="text-slate-300 mb-4">{feedback.explanation}</p>
                {!feedback.is_correct && (
                  <p className="text-sm text-slate-400">Correct answer: <span className="font-semibold">{feedback.correct_answer}</span></p>
                )}
                <div className="mt-4 text-lg font-bold text-yellow-400">+{feedback.xp_earned} XP</div>
              </div>

              <Button onClick={handleContinue} className="w-full py-3 text-lg font-semibold">
                {feedback.next ? "Continue" : "Finish Session"}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
