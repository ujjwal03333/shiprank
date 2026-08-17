export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-14">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="skeleton h-3.5 w-20 rounded" />
          <div className="skeleton mt-3 h-9 w-56 rounded-md" />
          <div className="skeleton mt-3 h-4 w-96 max-w-full rounded" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-5 py-3.5">
              <div className="skeleton h-6 w-10 rounded" />
              <div className="skeleton h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Aggregate tables */}
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2].map((t) => (
          <div key={t}>
            <div className="skeleton mb-3 h-3 w-24 rounded" />
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border/70 px-5 py-3 last:border-0"
                >
                  <div className="skeleton h-3.5 w-24 rounded" />
                  <div className="skeleton h-3.5 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-7 w-28 rounded-md" />
            <div className="skeleton h-7 w-32 rounded-md" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border/70 px-5 py-3 last:border-0"
            >
              <div className="skeleton size-6 shrink-0 rounded-full" />
              <div className="skeleton h-4 flex-1 max-w-48 rounded" />
              <div className="skeleton hidden h-3 w-16 rounded sm:block" />
              <div className="skeleton hidden h-3 w-20 rounded lg:block" />
              <div className="skeleton h-4 w-12 rounded" />
              <div className="skeleton h-4 w-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
