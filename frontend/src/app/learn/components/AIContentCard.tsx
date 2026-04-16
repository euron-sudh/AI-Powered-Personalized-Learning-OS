"use client";

import { useState } from "react";
import DiagramRenderer from "./DiagramRenderer";

export interface AIContentCardProps {
  id: string;
  type: "youtube" | "diagram" | "question" | "stage_change";
  videoId?: string;
  title?: string;
  concept?: string;
  mermaidCode?: string;
  question?: string;
  hint?: string;
  stage?: string;
  emotion?: string;
  onAnswered?: (answer: string) => void;
}

export function AIContentCard(props: AIContentCardProps) {
  const [answer, setAnswer] = useState("");
  const [answered, setAnswered] = useState(false);

  if (props.type === "youtube") {
    return (
      <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-semibold text-blue-900 mb-2">
          📺 {props.title || "Video"}
        </p>
        {props.concept && (
          <p className="text-xs text-blue-700 mb-3">{props.concept}</p>
        )}
        <div className="aspect-video w-full bg-black rounded overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${props.videoId}`}
            title={props.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (props.type === "diagram") {
    return (
      <div className="my-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm font-semibold text-purple-900 mb-3">
          📊 {props.title || "Diagram"}
        </p>
        <div className="bg-white rounded border border-purple-100 p-4">
          <DiagramRenderer mermaidCode={props.mermaidCode || ""} />
        </div>
      </div>
    );
  }

  if (props.type === "question") {
    return (
      <div className="my-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-semibold text-amber-900 mb-2">
          ❓ Comprehension Check
        </p>
        <p className="text-sm text-amber-900 mb-3">{props.question}</p>
        {props.hint && (
          <p className="text-xs text-amber-700 italic mb-2">💡 Hint: {props.hint}</p>
        )}
        {!answered ? (
          <div className="space-y-2">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer or say it verbally..."
              className="w-full px-3 py-2 border border-amber-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAnswered(true)}
                className="flex-1 px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600"
              >
                Submit
              </button>
              <button
                onClick={() => setAnswered(true)}
                className="flex-1 px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300"
              >
                Answer verbally
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-700">✓ Waiting for next question...</p>
        )}
      </div>
    );
  }

  if (props.type === "stage_change") {
    const stageColors: Record<string, { bg: string; text: string }> = {
      SIMPLIFY: { bg: "bg-red-100", text: "text-red-700" },
      ENGAGE: { bg: "bg-yellow-100", text: "text-yellow-700" },
      CHALLENGE: { bg: "bg-green-100", text: "text-green-700" },
      ENCOURAGE: { bg: "bg-blue-100", text: "text-blue-700" },
      BREAK: { bg: "bg-slate-100", text: "text-slate-700" },
    };

    const colors = stageColors[props.stage || "TEACH"] || {
      bg: "bg-slate-100",
      text: "text-slate-700",
    };

    return (
      <div className={`my-3 px-3 py-1 ${colors.bg} rounded-full text-center text-xs font-semibold ${colors.text}`}>
        — STAGE: {props.stage} {props.emotion && `(${props.emotion})`} —
      </div>
    );
  }

  return null;
}
