import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const linkClass =
  "inline-flex min-h-11 items-center px-3 font-body text-sm text-ink-muted transition-colors hover:text-ink";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-6">
        <Link
          href="/"
          className="font-display text-lg text-ink transition-colors hover:text-brand-ink"
        >
          ShipRank
        </Link>

        <div className="flex items-center">
          <nav aria-label="Primary" className="flex items-center">
            <Link href="/dare" className={linkClass}>
              Dare
            </Link>
            <Link href="/leaderboard" className={linkClass}>
              Board
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
