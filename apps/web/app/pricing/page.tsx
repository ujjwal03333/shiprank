import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Dare, the Card, the Board, and the grade are free forever.",
  alternates: { canonical: "/pricing" },
};

const TIERS = [
  {
    name: "Dare",
    price: "$0",
    note: "Card, Board, and grade. Forever.",
  },
  {
    name: "Close",
    price: "$29",
    note: "One contract. The prompt to fix it.",
  },
  {
    name: "License",
    price: "$99",
    note: "The right to ship with the grade attached.",
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-12 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          SHIP LICENSE
        </span>
        <h1 className="font-display text-3xl text-ink">Pricing</h1>
        <p className="font-body text-sm leading-relaxed text-ink-muted">
          Dare, the Card, the Board, and the grade are free forever.
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {TIERS.map((tier) => (
          <li
            key={tier.name}
            className="flex items-baseline justify-between gap-4 py-5"
          >
            <div className="flex flex-col gap-1">
              <span className="font-display text-xl text-ink">{tier.name}</span>
              <span className="font-body text-sm text-ink-muted">{tier.note}</span>
            </div>
            <span className="shrink-0 font-mono text-sm text-ink">{tier.price}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/dare"
        className="press rounded-[10px] bg-ink px-5 py-3.5 text-center font-body text-sm text-canvas hover:opacity-90"
      >
        Dare a public repo
      </Link>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
          Questions
        </h2>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          <details className="group py-4">
            <summary className="cursor-pointer font-body text-sm text-ink">
              Is the grade free?
            </summary>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
              Yes. Dare, the Card, the Board, and the grade are free forever. We
              never paywall those.
            </p>
          </details>
          <details className="group py-4">
            <summary className="cursor-pointer font-body text-sm text-ink">
              What is Close and License?
            </summary>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
              Close is one contract — the highest-leverage fix, with a prompt
              you send to an agent. License is the right to ship with the grade
              attached. Checkout is not live on this host yet.
            </p>
          </details>
          <details className="group py-4">
            <summary className="cursor-pointer font-body text-sm text-ink">
              Do you store my source code?
            </summary>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
              No. Scans run against your code in memory. We store results —
              scores, finding metadata, file:line references — not the tree.
              See Privacy.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
