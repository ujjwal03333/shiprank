import { ScoreGauge } from "./score-gauge";

const SAMPLE_STATIONS = [
  { key: "security", label: "Security", score: 82 },
  { key: "code-quality", label: "Code Quality", score: 90 },
  { key: "performance", label: "Performance", score: 74 },
  { key: "accessibility", label: "Accessibility", score: 88 },
  { key: "growth", label: "Growth", score: 61 },
] as const;

const SAMPLE_FINDINGS = [
  {
    id: "SEC-001",
    severity: "critical",
    title: "Service-role key referenced in client bundle",
    fix: "15 min",
  },
  {
    id: "PERF-003",
    severity: "warning",
    title: "1.2 MB hero image served unoptimized",
    fix: "5 min",
  },
  {
    id: "GROW-002",
    severity: "info",
    title: "No Open Graph image — links share blank cards",
    fix: "20 min",
  },
] as const;

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

export function SampleReport() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
      {/* Faux window chrome */}
      <div className="flex items-center justify-between border-b border-border bg-surface-raised/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-danger/40" />
          <span className="size-2.5 rounded-full bg-warning/40" />
          <span className="size-2.5 rounded-full bg-success/40" />
        </div>
        <span className="font-mono text-xs text-ink-subtle">
          shiprank.dev/scan/8f2e…c41a
        </span>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-mono text-[11px] text-brand-ink">
          sample
        </span>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[auto_1fr]">
        {/* Gauge + verdict */}
        <div className="flex flex-col items-center gap-3 lg:pr-8 lg:border-r lg:border-border/60">
          <ScoreGauge score={87} grade="A" size={168} />
          <div className="text-center">
            <p className="font-display text-base text-ink">Ship it — almost.</p>
            <p className="mt-1 max-w-[200px] font-body text-xs leading-relaxed text-ink-subtle">
              3 fixes stand between this project and the top decile.
            </p>
          </div>
        </div>

        {/* Stations + findings */}
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            {SAMPLE_STATIONS.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 font-body text-xs text-ink-muted">
                  {s.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="grow-bar h-full rounded-full"
                    style={{
                      width: `${s.score}%`,
                      background: `var(--color-station-${s.key})`,
                    }}
                  />
                </div>
                <span className="w-7 text-right font-mono text-xs text-ink">
                  {s.score}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
              Top fixes by ROI
            </span>
            {SAMPLE_FINDINGS.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-canvas/50 px-3.5 py-2.5"
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${SEVERITY_DOT[f.severity]}`}
                />
                <span className="shrink-0 font-mono text-xs text-ink-subtle">
                  {f.id}
                </span>
                <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">
                  {f.title}
                </span>
                <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[11px] text-ink-subtle">
                  {f.fix}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
