import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const linkClass =
  "inline-flex min-h-11 shrink-0 items-center px-2.5 font-body text-sm text-ink-muted transition-colors hover:text-ink sm:px-3";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="min-w-0 truncate font-display text-lg text-ink transition-colors hover:text-brand-ink"
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
