import type { Metadata } from "next";
import { CommandCard } from "./components/command-card";
import { LeaderboardPreview } from "./components/leaderboard-preview";
import { SampleReport } from "./components/sample-report";
import { HeroCommand } from "./components/hero-command";
import { HeroProof } from "./components/hero-proof";
import { getHeroStats } from "@/lib/hero-proof";

export const metadata: Metadata = {
  title: "ShipRank — The finishing service for AI-built software",
  description:
    "Compile loose prompts into ship-ready specs, scan your AI-generated code across 9 stations, and see exactly where you rank. Security, performance, accessibility, and more.",
  alternates: { canonical: "/" },
};

// Without this, the hero's scan-count and proof-scan data (real DB reads)
// would be baked in at build time and never update — the "real, not a
// mock" framing would quietly go stale the moment traffic starts flowing.
export const revalidate = 60;

const STATIONS = [
  {
    key: "security",
    label: "Security",
    blurb: "Leaked keys, open RLS, exposed routes",
  },
  {
    key: "code-quality",
    label: "Code Quality",
    blurb: "Dead code, any-types, silent catches",
  },
  {
    key: "performance",
    label: "Performance",
    blurb: "Bundle weight, image bloat, N+1 fetches",
  },
  {
    key: "accessibility",
    label: "Accessibility",
    blurb: "Contrast, labels, keyboard traps",
  },
  {
    key: "growth",
    label: "Growth",
    blurb: "SEO, Open Graph, empty share cards",
  },
  {
    key: "architecture",
    label: "Architecture",
    blurb: "Tangled modules, god files",
  },
  { key: "data", label: "Data", blurb: "Schema drift, unvalidated inputs" },
  {
    key: "compliance",
    label: "Compliance",
    blurb: "Privacy pages, cookie handling",
  },
  { key: "infra", label: "Infra", blurb: "Env hygiene, build health, CI" },
] as const;

const STEPS = [
  {
    step: "01",
    title: "Compile",
    body: "Paste a vibe-coded prompt. Get back a structured spec — stack, build plan, security constraints, and expected output — ready for any AI coding tool.",
  },
  {
    step: "02",
    title: "Scan",
    body: "One command profiles your project across 9 stations — security, quality, performance, growth — and scores every check with evidence.",
  },
  {
    step: "03",
    title: "Rank",
    body: "Your ShipScore joins the leaderboard, ranked by AI platform and framework. Every scan sharpens the baseline for everyone.",
  },
] as const;

function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-widest text-brand">
        {kicker}
      </span>
      <h2 className="font-display text-2xl text-ink sm:text-3xl">{title}</h2>
      {sub && (
        <p className="font-body text-sm leading-relaxed text-ink-muted sm:text-base">
          {sub}
        </p>
      )}
    </div>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ShipRank",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description:
    "The finishing service for AI-built software. Compile, scan, and rank AI-generated projects across 9 quality stations.",
  url: "https://shiprank.dev",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "Scan any project, see what's wrong.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "19",
      priceCurrency: "USD",
      description: "See exactly how to fix it.",
    },
    {
      "@type": "Offer",
      name: "Monitor",
      price: "39",
      priceCurrency: "USD",
      description: "Keep it from regressing.",
    },
  ],
};

export default async function HomePage() {
  const { scanCount, proof } = await getHeroStats();

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 px-6 pt-20 pb-14 text-center sm:pt-28">
        {scanCount >= 20 ? (
          <span className="reveal flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 font-mono text-xs text-ink-muted shadow-sm">
            <span className="pulse-dot size-1.5 rounded-full bg-success" />
            {scanCount.toLocaleString()} projects scanned
          </span>
        ) : (
          <span className="reveal flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3.5 py-1.5 font-mono text-xs text-ink-muted shadow-sm">
            <span className="pulse-dot size-1.5 rounded-full bg-success" />
            Every scan raises the bar
          </span>
        )}

        <h1 className="reveal reveal-1 font-display text-4xl leading-[1.08] text-ink sm:text-5xl">
          Your AI-built app has security holes.
          <br />
          <span className="bg-linear-to-r from-brand to-brand-ink bg-clip-text text-transparent">
            Find them in 20 seconds. Free.
          </span>
        </h1>

        <p className="reveal reveal-2 max-w-xl font-body text-base leading-relaxed text-ink-muted sm:text-lg">
          One command scans your code across 9 stations — security,
          accessibility, performance, and more — and shows exactly where you
          rank. No signup required.
        </p>

        <div className="reveal reveal-3">
          <HeroCommand />
        </div>

        {proof && (
          <div className="reveal reveal-3">
            <HeroProof proof={proof} />
          </div>
        )}

        <div className="reveal reveal-4 w-full">
          <CommandCard />
        </div>

        <div className="reveal reveal-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-xs text-ink-subtle">
          <span>
            <span className="text-ink">9</span> scan stations
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span>
            <span className="text-ink">0→100</span> ShipScore
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span>
            <span className="text-ink">1</span> command:{" "}
            <span className="text-brand-ink">npx shiprank</span>
          </span>
        </div>
      </section>

      {/* ── Sample report ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-brand">
            The report
          </span>
          <h2 className="font-display text-2xl text-ink sm:text-3xl">
            Not a lint log. A verdict.
          </h2>
          <p className="mx-auto max-w-xl font-body text-sm leading-relaxed text-ink-muted sm:text-base">
            Every scan produces a graded report with evidence-backed findings,
            ranked by fix ROI — what to fix first, how long it takes, and what
            it&apos;s worth.
          </p>
        </div>
        <SampleReport />
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <SectionHeading
          kicker="How it works"
          title="Three moves from vibe to shipped"
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map(({ step, title, body }, i) => (
            <div
              key={step}
              className="card-hover relative flex flex-col gap-3 rounded-xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-brand-soft font-mono text-xs text-brand-ink">
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="absolute top-10 -right-2.5 hidden text-ink-subtle sm:block">
                    →
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg text-ink">{title}</h3>
              <p className="font-body text-sm leading-relaxed text-ink-muted">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stations ─────────────────────────────────────────────────── */}
      <section className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <SectionHeading
            kicker="9 stations"
            title="Everything AI forgets, checked"
            sub="AI coding tools optimize for 'it runs.' ShipRank checks for 'it ships' — the security, polish, and growth work that separates demos from products."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STATIONS.map((s) => (
              <div
                key={s.key}
                className="card-hover flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ background: `var(--color-station-${s.key})` }}
                />
                <div className="min-w-0">
                  <h3 className="font-display text-sm text-ink">{s.label}</h3>
                  <p className="mt-0.5 font-body text-xs leading-relaxed text-ink-subtle">
                    {s.blurb}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Leaderboard preview ──────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <SectionHeading
          kicker="The leaderboard"
          title="Which AI stack actually ships?"
          sub="Live rankings from real scans — averaged by platform and framework, updated with every upload."
        />
        <div className="mt-10">
          <LeaderboardPreview />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-linear-to-br from-brand-soft via-surface to-surface p-10 text-center shadow-lg sm:p-14">
          <h2 className="font-display text-3xl text-ink sm:text-4xl">
            Finish what your AI started
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-sm leading-relaxed text-ink-muted sm:text-base">
            One command. Nine stations. A score you can put on the board.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <code className="rounded-lg border border-border bg-surface px-5 py-3 font-mono text-sm text-ink shadow-sm">
              npx shiprank ./your-project --upload
            </code>
            <a
              href="/leaderboard"
              className="press rounded-lg bg-linear-to-br from-brand to-brand-hover px-6 py-3 font-body text-sm text-ink-onbrand shadow-brand transition-all hover:brightness-110"
            >
              See the rankings →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
