export default function TenderDetailLoading() {
  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-sky-50/70 via-white to-violet-50/60 p-2">
      <div className="h-8 w-80 animate-pulse rounded-lg bg-slate-200" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-slate-200" />
        ))}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-none backdrop-blur">
        <div className="mb-3 h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="mb-3 h-11 w-[340px] animate-pulse rounded-full bg-slate-200" />
        <div className="h-64 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
      </div>
    </div>
  );
}
