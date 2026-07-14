import { STATIONS } from "@shiprank/ui";

const SURFACE_SWATCHES = [
  { name: "canvas", className: "bg-canvas" },
  { name: "surface", className: "bg-surface" },
  { name: "surface-raised", className: "bg-surface-raised" },
  { name: "surface-sunken", className: "bg-surface-sunken" },
] as const;

const INK_SWATCHES = [
  { name: "ink", className: "bg-ink" },
  { name: "ink-muted", className: "bg-ink-muted" },
  { name: "ink-subtle", className: "bg-ink-subtle" },
] as const;

const BRAND_SWATCHES = [
  { name: "brand", className: "bg-brand" },
  { name: "brand-hover", className: "bg-brand-hover" },
  { name: "brand-soft", className: "bg-brand-soft" },
] as const;

const SEMANTIC_SWATCHES = [
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "danger", className: "bg-danger" },
  { name: "info", className: "bg-info" },
] as const;

const STATION_LABELS: Record<(typeof STATIONS)[number], string> = {
  security: "Security",
  accessibility: "Accessibility",
  performance: "Performance",
  growth: "Growth",
  codeQuality: "Code Quality",
  architecture: "Architecture",
  data: "Data",
  compliance: "Compliance",
  infra: "Infra",
};

// Tailwind scans for literal class names — a template-built class like
// `bg-station-${x}` is invisible to it, so every station needs an entry here.
const STATION_BG_CLASS: Record<(typeof STATIONS)[number], string> = {
  security: "bg-station-security",
  accessibility: "bg-station-accessibility",
  performance: "bg-station-performance",
  growth: "bg-station-growth",
  codeQuality: "bg-station-code-quality",
  architecture: "bg-station-architecture",
  data: "bg-station-data",
  compliance: "bg-station-compliance",
  infra: "bg-station-infra",
};

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`h-16 w-full rounded-md border border-border shadow-sm ${className}`}
      />
      <span className="font-mono text-xs text-ink-subtle">{name}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-8 py-16">
      <header className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-brand">
          Design Tokens
        </span>
        <h1 className="font-display text-4xl text-ink">ShipRank</h1>
        <p className="max-w-xl font-body text-base text-ink-muted">
          Give me what your AI built. I&apos;ll give it back finished. This
          page renders the warm-light token set from{" "}
          <code className="rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono text-sm">
            @shiprank/ui
          </code>{" "}
          — nothing below is a hardcoded color.
        </p>
      </header>

      <Section title="Surfaces">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SURFACE_SWATCHES.map((s) => (
            <Swatch key={s.name} {...s} />
          ))}
        </div>
      </Section>

      <Section title="Ink">
        <div className="grid grid-cols-3 gap-4">
          {INK_SWATCHES.map((s) => (
            <Swatch key={s.name} {...s} />
          ))}
        </div>
      </Section>

      <Section title="Brand">
        <div className="grid grid-cols-3 gap-4">
          {BRAND_SWATCHES.map((s) => (
            <Swatch key={s.name} {...s} />
          ))}
        </div>
      </Section>

      <Section title="Semantic">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SEMANTIC_SWATCHES.map((s) => (
            <Swatch key={s.name} {...s} />
          ))}
        </div>
      </Section>

      <Section title="Stations (9)">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {STATIONS.map((station) => (
            <Swatch
              key={station}
              name={STATION_LABELS[station]}
              className={STATION_BG_CLASS[station]}
            />
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="font-display text-3xl text-ink">
            Fraunces — display / headings
          </p>
          <p className="font-body text-base text-ink">
            Inter — body copy. The quick brown fox jumps over the lazy dog.
          </p>
          <p className="font-mono text-sm text-ink-muted">
            IBM Plex Mono — code, scores, station labels
          </p>
        </div>
      </Section>

      <Section title="Radius & Shadow">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex h-20 items-center justify-center rounded-sm border border-border bg-surface font-mono text-xs text-ink-muted shadow-md">
            rounded-sm
          </div>
          <div className="flex h-20 items-center justify-center rounded-md border border-border bg-surface font-mono text-xs text-ink-muted shadow-md">
            rounded-md
          </div>
          <div className="flex h-20 items-center justify-center rounded-lg border border-border bg-surface font-mono text-xs text-ink-muted shadow-md">
            rounded-lg
          </div>
          <div className="flex h-20 items-center justify-center rounded-xl border border-border bg-surface font-mono text-xs text-ink-muted shadow-md">
            rounded-xl
          </div>
        </div>
      </Section>
    </main>
  );
}
