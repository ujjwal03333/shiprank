export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton mt-3 h-7 w-64 rounded-md" />
        <div className="mt-2 flex gap-3">
          <div className="skeleton h-5 w-16 rounded" />
          <div className="skeleton h-5 w-20 rounded" />
          <div className="skeleton h-5 w-24 rounded" />
        </div>
      </div>

      {/* Score + Stations */}
      <div className="grid items-start gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="skeleton size-44 rounded-full" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-3.5 w-24 rounded" />
                  <div className="skeleton h-3.5 w-10 rounded" />
                </div>
                <div className="skeleton h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="skeleton h-3 w-14 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Findings */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-56 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
              </div>
              <div className="skeleton h-3 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
