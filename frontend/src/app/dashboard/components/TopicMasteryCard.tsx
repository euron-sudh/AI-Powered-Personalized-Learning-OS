"use client";

type Topic = {
  id: string;
  title: string;
  score: number;
};

const topics: Topic[] = [
  { id: "1", title: "Argument Structure", score: 48 },
  { id: "2", title: "Algorithmic Thinking", score: 53 },
  { id: "3", title: "Forces and Motion", score: 58 },
  { id: "4", title: "Algebraic Patterns", score: 63 },
];

function getStatus(score: number) {
  if (score < 50) return { label: "Needs Help", color: "text-red-400" };
  if (score < 60) return { label: "Improving", color: "text-yellow-400" };
  if (score < 75) return { label: "Good", color: "text-green-400" };
  return { label: "Strong", color: "text-blue-400" };
}

export default function TopicMasteryCard() {
  const sorted = [...topics].sort((a, b) => a.score - b.score);

  const primary = sorted[0];
  const secondary = sorted.slice(1);

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full">

      {/* HEADER */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">
          Your Learning Focus
        </h2>
        <p className="text-sm text-white/60">
          Based on your recent performance
        </p>
      </div>

      {/* PRIMARY (START HERE) */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-md font-semibold text-white">
              🔥 Start Here
            </h3>
            <p className="text-lg mt-2 font-medium text-white">
              {primary.title}
            </p>
            <p className="text-sm text-white/60 mt-1">
              {primary.score}% •{" "}
              <span className={getStatus(primary.score).color}>
                {getStatus(primary.score).label}
              </span>
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm text-white transition-colors">
            Start →
          </button>
        </div>
      </div>

      {/* SECONDARY */}
      <div className="space-y-3">
        {secondary.map((topic) => {
          const status = getStatus(topic.score);
          return (
            <div
              key={topic.id}
              className="flex justify-between items-center bg-white/5 hover:bg-white/10 transition p-4 rounded-lg cursor-pointer"
            >
              <div>
                <p className="text-white">{topic.title}</p>
                <p className="text-xs text-white/60">
                  {topic.score}% •{" "}
                  <span className={status.color}>{status.label}</span>
                </p>
              </div>
              <div className="text-xs text-white/40">→</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
