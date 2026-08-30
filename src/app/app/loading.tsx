export default function AppLoading() {
  return (
    <div className="animate-pulse px-4 py-5" aria-hidden>
      <div className="mb-5 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shrink-0 space-y-2">
            <div className="h-14 w-14 rounded-full bg-ink-3" />
            <div className="mx-auto h-2 w-10 rounded bg-ink-3" />
          </div>
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mb-5 border-b border-line pb-5">
          <div className="flex gap-3">
            <div className="h-11 w-11 shrink-0 rounded-full bg-ink-3" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-28 rounded bg-ink-3" />
              <div className="h-3 w-16 rounded bg-ink-3" />
              <div className="mt-3 h-3 w-full rounded bg-ink-3" />
              <div className="h-3 w-[80%] rounded bg-ink-3" />
              <div className="mt-3 h-40 w-full rounded-2xl bg-ink-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
