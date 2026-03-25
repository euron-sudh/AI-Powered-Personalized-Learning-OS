export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2 pt-0.5">
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-2 bg-slate-100 rounded w-full" />
        <div className="h-2 bg-slate-100 rounded w-4/5" />
      </div>
      <div className="h-9 bg-slate-100 rounded-xl w-full" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
      <div className="h-8 bg-slate-100 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-3/4" />
    </div>
  );
}
