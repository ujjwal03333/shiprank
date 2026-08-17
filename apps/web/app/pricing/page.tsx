import type { Metadata } from "next";
import { CheckoutForm } from "../components/checkout-form";

export const metadata: Metadata = {
  title: "Pricing",
  description: "ShipRank plans — free scanning, Pro fixes, Monitor continuous re-scans.",
  alternates: { canonical: "/pricing" },
};

interface PlanDef {
  id: "free" | "pro" | "monitor";
  name: string;
  price: string;
  tagline: string;
  cta: string;
  highlighted?: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Scan anything, see what's wrong.",
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19/mo",
    tagline: "See exactly how to fix it.",
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    id: "monitor",
    name: "Monitor",
    price: "$39/mo",
    tagline: "Keep it from regressing.",
    cta: "Upgrade to Monitor",
  },
];

interface FeatureRow {
  label: string;
  free: string;
  pro: string;
  monitor: string;
}

const FEATURES: FeatureRow[] = [
  { label: "Scan any project", free: "✓", pro: "✓", monitor: "✓" },
  { label: "ShipScore + station breakdown", free: "✓", pro: "✓", monitor: "✓" },
  { label: "Finding titles + severity", free: "✓", pro: "✓", monitor: "✓" },
  { label: "Signed attestation + verify link", free: "✓", pro: "✓", monitor: "✓" },
  { label: "README badge", free: "✓", pro: "✓", monitor: "✓" },
  { label: "AGENTS.md rules generation", free: "✓", pro: "✓", monitor: "✓" },
  { label: "Exact fix location (file:line)", free: "—", pro: "✓", monitor: "✓" },
  { label: "Copy-paste fix prompts", free: "—", pro: "✓", monitor: "✓" },
  { label: "/api/compile", free: "5/day", pro: "Unlimited", monitor: "Unlimited" },
  { label: "Scheduled weekly re-scans", free: "—", pro: "—", monitor: "✓" },
  { label: "Regression email alerts", free: "—", pro: "—", monitor: "✓" },
  { label: "Score history + trend charts", free: "—", pro: "—", monitor: "✓" },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings and you'll keep access through the end of the billing period you already paid for. No retention flow, no phone call required.",
  },
  {
    q: "What if I just use the CLI for free?",
    a: "You can, forever. The free tier scans any project, shows your full ShipScore and station breakdown, and every finding's title and severity — no time limit, no trial that expires.",
  },
  {
    q: "What exactly does Pro unlock?",
    a: "The exact file and line for every finding, plus copy-paste-ready fix prompts. Free tells you what's wrong; Pro tells you precisely where and how to fix it.",
  },
  {
    q: "Do you store my source code?",
    a: "No. Scans run against your code in memory and only the results — scores, finding metadata, file:line references — are stored. See /privacy for the full policy.",
  },
  {
    q: "How is Monitor different from re-running the CLI myself?",
    a: "Monitor re-scans on a schedule automatically and emails you when your score regresses, so you find out from us before a user does.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-16">
      {/* Header */}
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">Pricing</span>
        <h1 className="font-display text-3xl text-ink mt-2">Simple, honest pricing</h1>
        <p className="font-body text-base text-ink-muted mt-3 max-w-2xl leading-relaxed">
          Scanning is always free — see your score, your grade, and what&apos;s
          wrong. Pro gets you exactly how to fix it. Monitor keeps it fixed.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col gap-4 rounded-xl border p-6 shadow-sm ${
              plan.highlighted
                ? "border-brand bg-brand-soft/30 shadow-brand"
                : "border-border bg-surface"
            }`}
          >
            <div>
              <h2 className="font-display text-lg text-ink">{plan.name}</h2>
              <p className="font-body text-sm text-ink-muted mt-1">{plan.tagline}</p>
            </div>
            <div className="font-display text-3xl text-ink">{plan.price}</div>
            {plan.id === "free" ? (
              <a
                href="https://www.npmjs.com/package/shiprank"
                target="_blank"
                rel="noopener noreferrer"
                className="press rounded-md bg-surface-sunken px-4 py-2.5 text-center font-body text-sm text-ink transition-colors hover:bg-surface-raised"
              >
                {plan.cta} →
              </a>
            ) : (
              <CheckoutForm plan={plan.id as "pro" | "monitor"} cta={plan.cta} highlighted={plan.highlighted} />
            )}
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Compare plans</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Feature</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Free</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Pro</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Monitor</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-body text-sm text-ink">{row.label}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">{row.free}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">{row.pro}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">{row.monitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLI note */}
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="font-body text-sm text-ink-muted leading-relaxed">
          The CLI&apos;s{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--rules</code>{" "}
          flag (AGENTS.md generation) works on every plan, free included — it&apos;s
          local, runs against your own findings, and needs no upload. Set{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">SHIPRANK_API_KEY</code>{" "}
          after upgrading to unlock full findings on <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code>.
        </p>
      </div>

      {/* FAQ */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Questions</h2>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface shadow-sm">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-body text-sm text-ink marker:content-none">
                {item.q}
                <span className="shrink-0 text-ink-subtle transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
