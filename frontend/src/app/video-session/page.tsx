"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import VideoFeed from "@/app/learn/components/VideoFeed";

const SENTIMENT_LEGEND = [
  { label: "Engaged", color: "bg-green-400", description: "Actively focused and learning" },
  { label: "Happy", color: "bg-green-300", description: "Positive and motivated" },
  { label: "Confused", color: "bg-yellow-400", description: "May need re-explanation" },
  { label: "Bored", color: "bg-orange-400", description: "Content may need variation" },
  { label: "Frustrated", color: "bg-red-400", description: "Needs encouragement or a break" },
  { label: "Drowsy", color: "bg-gray-400", description: "Suggest a short activity break" },
];

export default function VideoSessionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useSupabaseAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
          ← Dashboard
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📹 Video Learning Session</h1>
          <p className="text-gray-500 mt-1">
            Your camera feed is analyzed in real-time to detect your emotional state and adapt your learning experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video feed */}
          <div>
            <VideoFeed chapterId="general" />
          </div>

          {/* Info panel */}
          <div className="flex flex-col gap-4">
            {/* Sentiment legend */}
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 text-sm">Emotion Legend</h2>
              <div className="space-y-3">
                {SENTIMENT_LEGEND.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${item.color}`} />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{item.label}</span>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <h2 className="font-semibold text-blue-900 mb-3 text-sm">How It Works</h2>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex gap-2 items-start">
                  <span className="flex-shrink-0 mt-0.5">1.</span>
                  <span>Your camera captures a frame every 5 seconds.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="flex-shrink-0 mt-0.5">2.</span>
                  <span>AI analyzes your facial expression to detect your emotional state.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="flex-shrink-0 mt-0.5">3.</span>
                  <span>Your tutor adapts the lesson pace and style in real time.</span>
                </li>
              </ul>
            </div>

            {/* Privacy notice */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 flex gap-2 items-start">
                <span className="text-gray-400 flex-shrink-0">🔒</span>
                <span>
                  <strong className="text-gray-600">Privacy:</strong> Video frames are analyzed immediately and discarded.
                  No raw video is stored. Only emotion labels and confidence scores are saved.
                  You can stop the camera at any time.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-3">
            For the best experience, use video sentiment during a live lesson.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Go to a Lesson →
          </Link>
        </div>
      </div>
    </main>
  );
}
