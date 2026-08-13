"use client";

export interface Stage {
  label: string;
}

export function StageProgress({
  stages,
  activeIndex,
  completedIndices,
}: {
  stages: Stage[];
  /** Index of the stage currently running, or -1 if all are done. */
  activeIndex: number;
  completedIndices: Set<number>;
}) {
  return (
    <div className="reveal flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm">
      {stages.map((stage, i) => {
        const done = completedIndices.has(i);
        const active = i === activeIndex;
        return (
          <div key={stage.label} className="flex items-center gap-2.5">
            <span
              className={`grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
                done
                  ? "border-success bg-success"
                  : active
                    ? "border-brand"
                    : "border-border"
              }`}
            >
              {done ? (
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                  <path
                    d="m3 8.5 3.5 3.5L13 5"
                    stroke="var(--color-ink-onbrand)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : active ? (
                <span className="pulse-dot size-1.5 rounded-full bg-brand" />
              ) : null}
            </span>
            <span
              className={`font-body text-sm transition-colors ${
                done ? "text-ink-subtle line-through decoration-border-strong" : active ? "text-ink" : "text-ink-subtle"
              }`}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
