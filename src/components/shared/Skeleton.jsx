export function SkeletonLine({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-700/70 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <SkeletonLine className="h-4 w-28" />
      <SkeletonLine className="mt-4 h-8 w-20" />
      <SkeletonLine className="mt-5 h-2 w-full" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
