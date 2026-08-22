export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <span className="font-display text-lg text-ink">ShipRank</span>
          <p className="max-w-xs font-body text-sm leading-relaxed text-ink-muted">
            Don&apos;t ship AI-built software without a ShipRank. The license
            to ship.
          </p>
        </div>
        <nav aria-label="Product" className="flex flex-col gap-2.5">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
            Product
          </span>
          <a href="/dare" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            Dare
          </a>
          <a href="/leaderboard" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            Board
          </a>
          <a href="/pricing" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            Pricing
          </a>
        </nav>
        <nav aria-label="Tools" className="flex flex-col gap-2.5">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
            Tools
          </span>
          <a
            href="https://www.npmjs.com/package/shiprank"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm text-ink-muted transition-colors hover:text-ink"
          >
            CLI on npm
          </a>
          <a href="/dashboard" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            Dashboard
          </a>
          <code className="font-mono text-xs text-ink-subtle">npx shiprank</code>
        </nav>
        <nav aria-label="More" className="flex flex-col gap-2.5">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
            More
          </span>
          <a href="/methodology" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            Methodology
          </a>
          <a href="/models" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            Models
          </a>
          <a href="/about" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
            About
          </a>
        </nav>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-xs text-ink-subtle">
            © {new Date().getFullYear()} ShipRank
          </span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-4">
            <a href="/privacy" className="font-mono text-xs text-ink-subtle transition-colors hover:text-ink">
              Privacy
            </a>
            <a href="/terms" className="font-mono text-xs text-ink-subtle transition-colors hover:text-ink">
              Terms
            </a>
          </nav>
          <span className="font-mono text-xs text-ink-subtle">
            THE LICENSE TO SHIP
          </span>
        </div>
      </div>
    </footer>
  );
}
