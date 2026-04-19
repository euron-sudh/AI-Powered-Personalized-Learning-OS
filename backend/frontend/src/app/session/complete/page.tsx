"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SessionCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const xp = searchParams.get("xp") || "0";
  const streak = searchParams.get("streak") || "0";
  const level = searchParams.get("level") || "1";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Card className="w-full max-w-md p-8 text-center bg-slate-800 border-slate-700">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-white mb-2">Session Complete!</h1>
        
        <div className="space-y-4 my-8 text-left">
          <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
            <span className="text-slate-300">XP Earned:</span>
            <span className="text-2xl font-bold text-yellow-400">{xp}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
            <span className="text-slate-300">Streak:</span>
            <span className="text-2xl font-bold text-orange-400">{streak} days</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-slate-700/50 rounded-lg">
            <span className="text-slate-300">Level:</span>
            <span className="text-2xl font-bold text-purple-400">{level}</span>
          </div>
        </div>

        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full py-3 text-lg font-semibold mt-6"
        >
          Continue to Coach
        </Button>
      </Card>
    </div>
  );
}
