export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
      {label}
    </div>
  );
}

export function ErrorState({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}
