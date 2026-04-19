"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";

interface Chapter {
  id: string;
  title: string;
  description: string;
}

interface Message {
  role: "student" | "tutor";
  content: string;
}

interface EmotionData {
  emotion: string;
  confidence: number;
  color: string;
}

const EMOTIONS: Record<string, { label: string; color: string; bgColor: string }> = {
  engaged: { label: "Engaged", color: "#1d9e75", bgColor: "#0f2a1f" },
  confused: { label: "Confused", color: "#ef9f27", bgColor: "#1f1a0f" },
  frustrated: { label: "Frustrated", color: "#e24b4a", bgColor: "#2a1a1a" },
  bored: { label: "Bored", color: "#6b7280", bgColor: "#1e2330" },
};

export default function TutorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null);
  const [sessionStarted, setSessionStarted] = useState(new Date());
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!authLoading && user) {
      loadChapter();
      // Simulate emotion detection every 5 seconds
      const emotionInterval = setInterval(() => {
        const emotions = Object.keys(EMOTIONS);
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        const emotionInfo = EMOTIONS[randomEmotion];
        setCurrentEmotion({
          emotion: randomEmotion,
          confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
          color: emotionInfo.color,
        });
      }, 5000);
      return () => clearInterval(emotionInterval);
    }
  }, [user, authLoading, router, chapterId]);

  async function loadChapter() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/curriculum/${subjectId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const ch = data.chapters?.find((c: any) => c.id === chapterId);
        if (ch) setChapter(ch);
      }
    } catch (err) {
      console.error("Failed to load chapter:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!inputValue.trim()) return;

    setMessages([...messages, { role: "student", content: inputValue }]);
    setInputValue("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/proxy/api/lessons/${chapterId}/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "tutor", content: data.response || "Let me explain..." }]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[calc(100vh-54px)] items-center justify-center bg-[#0d1117]">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#3d3faa] border-t-[#5b5eff] animate-spin mx-auto mb-3" />
          <p className="text-[#6b7280] text-sm">Loading lesson…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-54px)] bg-[#0d1117] flex">
      {/* Video Panel (Left) */}
      <div className="flex-1 border-r border-[#1a1f2e] flex flex-col">
        {/* Video Area */}
        <div className="flex-1 bg-[#0a0d14] flex items-center justify-center p-8 relative">
          <div className="w-full max-w-2xl relative">
            {/* Main Video */}
            <div className="aspect-video bg-gradient-to-br from-[#1a1f35] to-[#0a0d14] rounded-3xl border border-[#1a1f2e] flex items-center justify-center relative overflow-hidden">
              {/* Tutor Avatar */}
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#3d3faa] to-[#5b5eff] flex items-center justify-center animate-pulse">
                    <span className="text-6xl">🧠</span>
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#5b5eff] animate-pulse" style={{ animationDelay: "0.5s" }} />
                </div>
                <p className="text-white font-[500] text-lg">AI Tutor</p>
                <p className="text-[12px] text-[#6b7280] mt-1">{chapter?.title}</p>
              </div>

              {/* Emotion Detection Bar (Top Right) */}
              {currentEmotion && (
                <div className="absolute top-6 right-6 bg-[#0a0d14]/90 border border-[#1a1f2e] rounded-2xl px-3 py-2">
                  <div className="text-[10px] font-[500] text-white mb-2">
                    {EMOTIONS[currentEmotion.emotion].label}
                  </div>
                  <div className="w-24 h-1.5 bg-[#1e2330] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${currentEmotion.confidence * 100}%`,
                        background: currentEmotion.color,
                      }}
                    />
                  </div>
                  <div className="text-[9px] text-[#6b7280] mt-1">
                    {Math.round(currentEmotion.confidence * 100)}% confident
                  </div>
                </div>
              )}

              {/* Student Camera Preview (Bottom Right) */}
              {isVideoOn && (
                <div className="absolute bottom-4 right-4 w-24 h-20 bg-[#161b27] border-2 border-[#1a1f2e] rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">📹</span>
                </div>
              )}

              {/* Session Timer (Bottom Center) */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#0a0d14]/90 border border-[#1a1f2e] rounded-full px-3 py-1">
                <p className="text-[11px] text-[#a8aaee] font-[500]">
                  {Math.floor((Date.now() - sessionStarted.getTime()) / 60000)}:
                  {String(Math.floor(((Date.now() - sessionStarted.getTime()) % 60000) / 1000)).padStart(2, "0")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Emotion Indicators */}
        {currentEmotion && (
          <div className="border-t border-[#1a1f2e] bg-[#0a0d14] p-4">
            <div className="text-[10px] text-[#6b7280] mb-2 font-[500]">Student Sentiment</div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(EMOTIONS).map(([key, { label, color, bgColor }]) => (
                <div
                  key={key}
                  className="px-2 py-1.5 rounded-lg text-center transition-all"
                  style={{
                    background: currentEmotion.emotion === key ? bgColor : "#1e2330",
                    border: currentEmotion.emotion === key ? `1px solid ${color}` : "1px solid #1a1f2e",
                  }}
                >
                  <div className="text-[10px] font-[500]" style={{ color: currentEmotion.emotion === key ? color : "#6b7280" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="border-t border-[#1a1f2e] p-4 flex justify-center gap-4 bg-[#0a0d14]">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-3 rounded-full transition-all ${
              isMicOn ? "bg-[#1a1f35] text-[#a8aaee] border border-[#3d3faa]" : "bg-[#1e2330] text-[#6b7280]"
            }`}
          >
            🎤
          </button>
          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3 rounded-full transition-all ${
              isVideoOn ? "bg-[#1a1f35] text-[#a8aaee] border border-[#3d3faa]" : "bg-[#1e2330] text-[#6b7280]"
            }`}
          >
            📹
          </button>
          <button className="p-3 rounded-full bg-[#1e2330] text-[#6b7280] hover:text-white hover:bg-[#2a2d45] transition-all">
            🔇
          </button>
          <button
            onClick={() => router.back()}
            className="p-3 rounded-full bg-[#e24b4a] text-white hover:bg-[#f09595] transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat Panel (Right) */}
      <div className="w-80 border-l border-[#1a1f2e] flex flex-col bg-[#0a0d14]">
        {/* Header */}
        <div className="border-b border-[#1a1f2e] p-4">
          <h3 className="text-[12px] font-[500] text-white">{chapter?.title}</h3>
          <p className="text-[10px] text-[#6b7280] mt-1">Active session</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[12px] text-[#6b7280]">Start asking questions about this topic</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs rounded-2xl px-4 py-2 text-[12px] leading-relaxed ${
                  msg.role === "student"
                    ? "bg-[#5b5eff] text-white"
                    : "bg-[#161b27] text-[#c5c9d6]"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-[#1a1f2e] p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ask a question..."
              className="flex-1 bg-[#161b27] border border-[#1a1f2e] rounded-2xl px-3 py-2 text-[12px] text-[#c5c9d6] placeholder-[#3a3f55] outline-none focus:border-[#5b5eff]"
            />
            <button
              onClick={sendMessage}
              className="p-2 bg-[#5b5eff] text-white rounded-2xl hover:bg-[#3d3faa] transition-all"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
