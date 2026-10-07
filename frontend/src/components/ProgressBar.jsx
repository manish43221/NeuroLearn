export default function ProgressBar({ value = 0, color = 'bg-brand-600' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
