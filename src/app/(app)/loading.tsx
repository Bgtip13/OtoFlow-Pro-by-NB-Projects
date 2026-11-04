export default function AppLoading() {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="skeleton h-11 w-11 rounded-2xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[76px] rounded-2xl" />
        ))}
      </div>

      <div className="mt-4 skeleton h-14 rounded-2xl" />

      <div className="mt-4 space-y-2 rounded-3xl border border-white/80 bg-white/70 p-4 backdrop-blur-xl">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-8" />
        ))}
      </div>
    </div>
  );
}
