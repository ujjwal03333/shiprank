import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of ShipRank's CLI and hosted service.",
  alternates: { canonical: "/terms" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <div className="flex flex-col gap-3 font-body text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col gap-10">
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">Terms</span>
        <h1 className="font-display text-3xl text-ink mt-2">Terms of Service</h1>
        <p className="mt-3 font-mono text-xs text-ink-subtle">Last updated: August 2026</p>
      </div>

      <Section title="What this is">
        <p>
          ShipRank is a code-quality scanner: a CLI you run locally, and a
          hosted service (leaderboard, scan reports, Compile) at
          shiprank.dev. By running the CLI with{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code>{" "}
          or using the website, you agree to these terms.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          ShipRank is provided &ldquo;as is,&rdquo; without warranty of any kind. A
          passing score is not a certification that your software is secure,
          performant, or fit for any particular purpose — it&apos;s a snapshot
          against a fixed set of automated checks. Automated checks miss
          things. Use your own judgment before shipping.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, ShipRank and its operators
          are not liable for any damages — direct, indirect, incidental, or
          consequential — arising from your use of the CLI, the website, or
          any decision made based on a ShipRank score or finding.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1.5">
          <li>Use the service to scan or upload code you don&apos;t have the right to analyze or share.</li>
          <li>Attempt to circumvent rate limits, plan gating, or authentication.</li>
          <li>Upload fabricated scan results or otherwise attempt to manipulate the public leaderboard.</li>
          <li>Use the service to build a competing product by scraping or reverse-engineering the scoring methodology at scale.</li>
        </ul>
      </Section>

      <Section title="Data handling">
        <p>
          See our{" "}
          <a href="/privacy" className="text-brand-ink transition-colors hover:text-brand">
            Privacy Policy
          </a>{" "}
          for what is and isn&apos;t collected. In short: the CLI scans locally,
          and only scan metadata — not source code — is uploaded when you
          use <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code>.
        </p>
      </Section>

      <Section title="Subscriptions">
        <p>
          Pro and Monitor are billed monthly via Stripe. Cancel anytime from
          your account settings; you keep access through the end of the
          period you&apos;ve already paid for. No refunds for partial periods
          except where required by law.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms as the product changes. Material changes
          will be reflected by updating the date above.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          <a href="mailto:hello@shiprank.dev" className="text-brand-ink transition-colors hover:text-brand">
            hello@shiprank.dev
          </a>
        </p>
      </Section>
    </div>
  );
}
