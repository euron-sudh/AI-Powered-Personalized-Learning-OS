"use client";

import { useRef, useEffect } from "react";
import { useVoiceChat } from "@/hooks/useVoiceChat";

interface VoiceChatProps {
  chapterId: string;
  lessonTitle?: string;
  chapterDescription?: string;
  keyConcepts?: string[];
  summary?: string;
  grade?: string;
  board?: string;
  subjectName?: string;
}

export default function VoiceChat({
  chapterId,
  lessonTitle,
  chapterDescription,
  keyConcepts,
  summary,
  grade,
  board,
  subjectName,
}: VoiceChatProps) {
  const {
    isConnected,
    isListening,
    isAISpeaking,
    transcript,
    error,
    connect,
    disconnect,
    toggleListening,
  } = useVoiceChat({ chapterId, lessonTitle, chapterDescription, keyConcepts, summary, grade, board, subjectName });

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom as new lines arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-gray-900 text-lg mb-0.5">Voice Tutor</h3>
        <p className="text-gray-500 text-sm">
          Talk to your AI tutor hands-free. Ask questions and get spoken explanations in real time.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Connection controls */}
      <div className="flex items-center gap-3">
        {!isConnected ? (
          <button
            onClick={connect}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <span>🎙️</span> Start Voice Session
          </button>
        ) : (
          <>
            {/* Mic toggle */}
            <button
              onClick={toggleListening}
              disabled={isAISpeaking}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow transition-all ${
                isListening
                  ? "bg-red-500 text-white scale-110 animate-pulse"
                  : isAISpeaking
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
              }`}
              title={
                isAISpeaking
                  ? "AI is speaking…"
                  : isListening
                  ? "Stop listening"
                  : "Start listening"
              }
            >
              {isListening ? "🔴" : "🎤"}
            </button>

            {/* Status */}
            <div className="flex-1">
              {isAISpeaking ? (
                <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium">
                  <span className="flex gap-0.5 items-end">
                    <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
                    <span className="w-1 h-5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
                    <span className="w-1 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "400ms" }} />
                  </span>
                  <span>AI is speaking…</span>
                </div>
              ) : isListening ? (
                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Listening… speak now
                </div>
              ) : (
                <p className="text-sm text-gray-500">Tap the mic to speak</p>
              )}
            </div>

            <button
              onClick={disconnect}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition"
            >
              End session
            </button>
          </>
        )}
      </div>

      {/* Transcript */}
      {isConnected ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Transcript
            </span>
            {transcript.length > 0 && (
              <button
                onClick={() => {
                  const text = transcript.join("\n");
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `voice-session-${chapterId}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs text-blue-500 hover:text-blue-700 transition"
              >
                Download
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border p-3 space-y-2">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 text-gray-400">
                <span className="text-3xl mb-2">🎙️</span>
                <p className="text-sm">Your conversation will appear here…</p>
              </div>
            ) : (
              transcript.map((line, i) => {
                const isStudent =
                  line.startsWith("You:") || line.startsWith("Student:");
                return (
                  <div
                    key={i}
                    className={`flex ${isStudent ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                        isStudent
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {line}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400 max-w-xs">
            <div className="text-5xl mb-3">🎙️</div>
            <p className="font-medium text-gray-500 mb-1">Voice tutoring</p>
            <p className="text-sm">
              Start a session to speak directly with your AI tutor using real-time speech recognition and audio responses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
