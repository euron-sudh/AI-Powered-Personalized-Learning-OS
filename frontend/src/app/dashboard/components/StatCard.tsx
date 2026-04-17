import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  scrollTo?: string;
  subBar?: { done: number; total: number };
}

export default function StatCard({ value, label, icon, color, href, scrollTo, subBar }: StatCardProps) {
  const inner = (
    <>
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", color)}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-white/40 mt-1 font-medium">{label}</p>
        {subBar && (
          <div className="mt-2.5 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
              style={{ width: `${Math.min((subBar.done / subBar.total) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>
    </>
  );

  const base = "bg-[#0d1424] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-4";
  const interactive = "cursor-pointer hover:border-white/[0.14] hover:bg-[#111c35] transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(base, interactive)}>
        {inner}
      </Link>
    );
  }

  if (scrollTo) {
    return (
      <button
        onClick={() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className={cn(base, interactive, "w-full text-left")}
      >
        {inner}
      </button>
    );
  }

  return <div className={cn(base)}>{inner}</div>;
}
