export default function StatCard({ value, label, icon }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="stat-card-icon flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-900/40">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}
