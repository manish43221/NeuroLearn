export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      {text}
    </div>
  );
}
