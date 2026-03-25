interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export default function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="w-full">
      {label && <span className="text-sm text-white/60">{label}</span>}
      <div className="w-full bg-white/[0.08] rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-400 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-white/40">{percentage}%</span>
    </div>
  );
}
