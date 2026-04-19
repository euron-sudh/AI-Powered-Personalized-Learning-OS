"use client";

import { useRouter } from "next/navigation";

interface ProgressCardProps {
  name: string;
  percent: number;
  description: string;
}

export default function ProgressCard({
  name,
  percent,
  description,
}: ProgressCardProps) {
  const router = useRouter();

  const getColor = () => {
    if (percent < 50) return "text-red-400";
    if (percent < 60) return "text-orange-400";
    if (percent < 70) return "text-yellow-400";
    return "text-green-400";
  };

  const getStatus = () => {
    if (percent < 50) return "👉 Focus here next";
    if (percent < 60) return "👉 Getting better";
    if (percent < 70) return "👉 Improving";
    return "👉 Good progress";
  };

  return (
    <div
      onClick={() => router.push(`/session?topic=${encodeURIComponent(name)}`)}
      className="p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-600 cursor-pointer transition"
    >
      {/* Title + Percent */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-white">{name}</h3>
        <span className={`font-bold ${getColor()}`}>{percent}%</span>
      </div>

      {/* Definition */}
      <p className="text-sm text-gray-400 mt-1">{description}</p>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 h-2 rounded mt-3">
        <div
          className="h-2 rounded bg-blue-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Status */}
      <p className={`text-sm mt-2 ${getColor()}`}>{getStatus()}</p>
    </div>
  );
}
