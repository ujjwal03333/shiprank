const linkClass =
  "font-mono text-xs text-ink-subtle transition-colors hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="min-w-0 break-words font-body text-sm text-ink-muted">
          Don&apos;t ship AI-built software without a ShipRank.
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <a href="/dare" className={linkClass}>
            Dare
          </a>
          <a href="/leaderboard" className={linkClass}>
            Board
          </a>
          <a href="/about" className={linkClass}>
            About
          </a>
          <a href="/privacy" className={linkClass}>
            Privacy
          </a>
          <a href="/terms" className={linkClass}>
            Terms
          </a>
          <code className="font-mono text-xs text-ink-subtle">npx shiprank</code>
        </nav>
      </div>
    </footer>
  );
}
