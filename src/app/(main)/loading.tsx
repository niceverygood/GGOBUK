export default function MainLoading() {
  return (
    <main className="px-5 pt-8 pb-32 relative min-h-dvh">
      <div className="hanji-overlay" />
      <div className="relative space-y-5 animate-pulse">
        <div>
          <div className="h-3 w-24 rounded-full bg-navy/10" />
          <div className="mt-3 h-7 w-40 rounded-full bg-navy/15" />
        </div>
        <div className="h-56 rounded-3xl bg-white/70 border border-navy/10 shadow-[0_12px_30px_rgba(44,62,80,0.06)]" />
        <div className="space-y-3">
          <div className="h-24 rounded-3xl bg-white/70 border border-navy/10" />
          <div className="h-24 rounded-3xl bg-white/60 border border-navy/10" />
        </div>
      </div>
    </main>
  );
}
