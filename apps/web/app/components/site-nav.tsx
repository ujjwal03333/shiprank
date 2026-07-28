export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-baseline gap-2">
          <span className="font-display text-lg text-ink">ShipRank</span>
          <span className="font-mono text-xs text-ink-subtle hidden sm:inline">
            v1.0
          </span>
        </a>
        <nav className="flex items-center gap-6">
          <a
            href="/leaderboard"
            className="font-body text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Leaderboard
          </a>
          <a
            href="/methodology"
            className="font-body text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Methodology
          </a>
          <a
            href="https://www.npmjs.com/package/shiprank"
            className="font-mono text-xs px-3 py-1.5 rounded-md bg-brand-soft text-brand-ink hover:bg-brand hover:text-ink-onbrand transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            npx shiprank
          </a>
        </nav>
      </div>
    </header>
  );
}
