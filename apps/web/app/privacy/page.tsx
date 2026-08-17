import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What ShipRank does and doesn't do with your code and data.",
  alternates: { canonical: "/privacy" },
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

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col gap-10">
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">Privacy</span>
        <h1 className="font-display text-3xl text-ink mt-2">Privacy Policy</h1>
        <p className="mt-3 font-mono text-xs text-ink-subtle">Last updated: August 2026</p>
      </div>

      <Section title="CLI scans stay on your machine">
        <p>
          The ShipRank CLI (<code className="font-mono text-xs bg-surface-sunken px-1 rounded">npx shiprank</code>)
          runs the entire scan locally. Your source code never leaves your
          machine. Without the{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code> flag,
          nothing about your project is sent anywhere — the scan runs, prints
          a report to your terminal, and that&apos;s the end of it.
        </p>
      </Section>

      <Section title="What --upload actually sends">
        <p>
          When you run with{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">--upload</code>, we
          store scan <em>metadata</em>, not your source: your project name, a
          content hash (a fingerprint, not the code itself), your ShipScore
          and per-station scores, each check&apos;s ID/title/severity/pass-fail
          state, file/line/dependency counts, detected framework, and
          platform/model fingerprint signals.
        </p>
        <p>
          We do not upload file contents, file paths, line numbers, or code
          snippets — the upload payload has no field for them, and the
          server rejects any request that tries to add one.
        </p>
      </Section>

      <Section title="Account and billing data">
        <p>
          If you subscribe to Pro or Monitor, we (via Stripe) store your
          email and subscription status to gate access to paid features. We
          don&apos;t store payment card details — Stripe handles that
          directly and we never see full card numbers.
        </p>
      </Section>

      <Section title="What we do not collect">
        <p>
          We do not collect personal data unless you take an explicit action
          — submitting an email for checkout, or requesting deletion. There
          is no advertising, no third-party tracking, and no analytics
          pixels on this site.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Only essential cookies: a theme preference (light/dark) stored in{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1 rounded">localStorage</code>
          , and a session cookie if you sign in after checkout. No tracking
          cookies.
        </p>
      </Section>

      <Section title="Deletion">
        <p>
          Email{" "}
          <a href="mailto:hello@shiprank.dev" className="text-brand-ink transition-colors hover:text-brand">
            hello@shiprank.dev
          </a>{" "}
          with your project name or scan ID and we&apos;ll delete the
          associated scan records. Subscription/billing records are retained
          as required for tax and accounting purposes.
        </p>
      </Section>

      <Section title="Third parties">
        <p>
          We use Supabase (database hosting), Upstash (rate-limiting cache),
          Stripe (payments), Resend (regression alert emails, Monitor tier
          only), and Anthropic&apos;s API (to power the Compile feature — your
          prompt text is sent to Anthropic to generate a structured spec,
          and is not stored by us beyond the request).
        </p>
      </Section>

      <Section title="Public leaderboard data">
        <p>
          Scores you upload appear on the public leaderboard by default,
          identified by project name and platform — not by your identity.
          Detailed finding evidence (file:line, fix prompts) is never public
          regardless of plan; it&apos;s gated behind your own account.
        </p>
      </Section>
    </div>
  );
}
