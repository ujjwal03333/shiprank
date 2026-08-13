"use client";

import type { PromptScore } from "@shiprank/compile/client";

const DIMENSIONS: Array<{ key: keyof Omit<PromptScore, "total">; label: string }> = [
  { key: "stackClarity", label: "Stack clarity" },
  { key: "securityCoverage", label: "Security coverage" },
  { key: "completeness", label: "Completeness" },
  { key: "structure", label: "Structure" },
  { key: "testability", label: "Testability" },
];

function scoreTone(n: number): string {
  if (n >= 70) return "text-success-ink";
  if (n >= 40) return "text-warning-ink";
  return "text-danger-ink";
}

export function PromptScoreCard({
  label,
  score,
}: {
  label: string;
  score: PromptScore;
}) {
  return (
    <div className="reveal flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">{label}</span>
        <span className={`font-display text-lg ${scoreTone(score.total)}`}>{score.total}/100</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5 sm:gap-2">
        {DIMENSIONS.map((d) => (
          <div key={d.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:gap-0.5">
              <span className="font-body text-[11px] text-ink-subtle">{d.label}</span>
              <span className="font-mono text-[11px] text-ink-muted">{score[d.key]}/20</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="grow-bar h-full rounded-full bg-linear-to-r from-brand to-brand-hover"
                style={{ width: `${(score[d.key] / 20) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
