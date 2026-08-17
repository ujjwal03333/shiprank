import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Who builds ShipRank, and why.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col gap-8">
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">About</span>
        <h1 className="font-display text-3xl text-ink mt-2">
          Making AI-generated code safe for production
        </h1>
      </div>

      <div className="flex flex-col gap-4 font-body text-base leading-relaxed text-ink-muted">
        <p>
          AI coding tools are extraordinary at getting a project to
          &ldquo;it runs.&rdquo; They are much less consistent at getting it to
          &ldquo;it ships&rdquo; — the security hardening, accessibility work, and
          growth plumbing that separates a demo from a product a stranger can
          trust.
        </p>
        <p>
          ShipRank is a single, deterministic check suite that catches that
          gap. Same code, same check version, same score — always. No LLM
          judgment call in the scoring path, so a result you get today will
          still be true tomorrow.
        </p>
        <p>
          Built by{" "}
          <a
            href="https://github.com/ujjwal03333"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-ink transition-colors hover:text-brand"
          >
            Ujjwal
          </a>
          . The CLI runs locally, the free tier has no expiry, and the{" "}
          <Link href="/methodology" className="text-brand-ink transition-colors hover:text-brand">
            scoring methodology
          </Link>{" "}
          is public.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="font-body text-sm text-ink-muted leading-relaxed">
          Questions, bug reports, data-deletion requests, or partnerships:{" "}
          <a
            href="mailto:hello@shiprank.dev"
            className="text-brand-ink transition-colors hover:text-brand"
          >
            hello@shiprank.dev
          </a>
        </p>
      </div>
    </div>
  );
}
