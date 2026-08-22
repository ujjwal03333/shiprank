import type { Metadata } from "next";
import Link from "next/link";

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
          ShipRank is a Ship License for AI-built software: a CLI you run
          locally, and a hosted service (Dare, Cards, Board, Compile, scan
          reports). This site is not shiprank.dev, which is a different
          product. By running the CLI with{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code>{" "}
          or using the website, you agree to these terms.
        </p>
      </Section>

      <Section title="Static analysis only">
        <p>
          ShipRank performs static analysis only. It reads source files,
          configs, and git metadata. It never executes your application code,
          never installs your dependencies to run them, and never starts your
          servers. Dare Board clones are treated the same way: read, score,
          delete.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          Scan results are provided &ldquo;as is.&rdquo; A passing score is not a
          guarantee of security, performance, accessibility, or fitness for
          any purpose — it is a snapshot against a fixed set of automated
          checks. Automated checks miss things. Use your own judgment before
          shipping.
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
          <li>
            Scan or upload a repository you do not own or have permission to
            analyze. Public GitHub repos submitted via Dare Board are fair
            game — that is the point of a public dare.
          </li>
          <li>Attempt to circumvent rate limits, plan gating, or authentication.</li>
          <li>Upload fabricated scan results or otherwise attempt to manipulate the public leaderboard.</li>
          <li>Use the service to build a competing product by scraping or reverse-engineering the scoring methodology at scale.</li>
        </ul>
      </Section>

      <Section title="Uploaded scan data">
        <p>
          When you use{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code>{" "}
          or Dare Board, we store scan metadata on Supabase (project name,
          scores, check pass/fail, fingerprints). Retention is indefinite
          unless you request deletion. We do not store your source code.
          See the{" "}
          <Link href="/privacy" className="text-brand-ink transition-colors hover:text-brand">
            Privacy Policy
          </Link>
          .
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
          <a
            href="https://github.com/ujjwal03333/shiprank/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-ink transition-colors hover:text-brand"
          >
            github.com/ujjwal03333/shiprank/issues
          </a>
        </p>
      </Section>
    </div>
  );
}
