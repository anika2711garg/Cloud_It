import { AlertTriangle } from "lucide-react";
import { SkeletonCard, SkeletonLine } from "./Skeleton";

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonLine className="h-10 w-full" />
    </div>
  );
}

export function ErrorState({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 backdrop-blur dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
      <AlertTriangle size={16} className="mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
