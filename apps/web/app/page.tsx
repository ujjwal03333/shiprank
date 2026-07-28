import { HomeTabs } from "./components/home-tabs";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16 flex flex-col gap-16">
      {/* Hero */}
      <section className="flex flex-col gap-5 max-w-2xl">
        <span className="font-mono text-xs uppercase tracking-widest text-brand">
          AI software finishing service
        </span>
        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight">
          The finishing service for AI-built software
        </h1>
        <p className="font-body text-base text-ink-muted leading-relaxed max-w-xl">
          Compile vibe-coded prompts into structured, ship-ready specs. Scan
          your project for quality, security, and growth gaps. See how your
          project ranks against every other AI-built product.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="font-mono text-sm bg-surface-sunken border border-border px-3 py-2 rounded-md text-ink">
            npx shiprank ./your-project
          </code>
          <span className="font-body text-xs text-ink-subtle">
            or use the tools below
          </span>
        </div>
      </section>

      {/* Tabs */}
      <section>
        <HomeTabs />
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-6">
        <h2 className="font-display text-xl text-ink">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Compile",
              body: "Paste a vibe-coded prompt. Get back a structured spec — stack, build plan, security constraints, and expected output — ready for any AI coding tool.",
            },
            {
              step: "02",
              title: "Scan",
              body: "Run the CLI against any project. It profiles your code across 9 stations: security, accessibility, performance, growth, and more.",
            },
            {
              step: "03",
              title: "Rank",
              body: "Your ShipScore goes on the leaderboard — ranked by AI platform, framework, and model. Every scan improves the collective baseline.",
            },
          ].map(({ step, title, body }) => (
            <div
              key={step}
              className="rounded-lg border border-border bg-surface p-5 flex flex-col gap-3 shadow-sm"
            >
              <span className="font-mono text-xs text-brand">{step}</span>
              <h3 className="font-display text-base text-ink">{title}</h3>
              <p className="font-body text-sm text-ink-muted leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
