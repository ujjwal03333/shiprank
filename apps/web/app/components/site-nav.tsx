import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const MENU_ICON_SIZE = 18;

function LogoMark() {
  return (
    <span
      aria-hidden
      className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-brand to-brand-hover shadow-brand"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2.5 13 8h-3v5.5H6V8H3L8 2.5Z"
          fill="var(--color-ink-onbrand)"
        />
      </svg>
    </span>
  );
}

function MobileMenuButton() {
  return (
    <>
      <input type="checkbox" id="mobile-menu-toggle" className="peer sr-only" />
      <label
        htmlFor="mobile-menu-toggle"
        className="flex size-11 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-raised sm:hidden"
      >
        <span className="sr-only">Toggle navigation menu</span>
        <svg
          width={MENU_ICON_SIZE}
          height={MENU_ICON_SIZE}
          viewBox={`0 0 ${MENU_ICON_SIZE} ${MENU_ICON_SIZE}`}
          fill="none"
          className="peer-checked:hidden"
          aria-hidden
        >
          <path
            d="M2 4.5h14M2 9h14M2 13.5h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </label>
      <nav className="fixed inset-x-0 top-[3.75rem] z-50 hidden border-b border-border bg-canvas/95 backdrop-blur-md peer-checked:block sm:hidden">
        <div className="flex flex-col px-6 py-4 gap-1">
          <Link
            href="/dare"
            className="flex items-center rounded-md px-3 py-3.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Dare
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center rounded-md px-3 py-3.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Leaderboard
          </Link>
          <Link
            href="/models"
            className="flex items-center rounded-md px-3 py-3.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Models
          </Link>
          <Link
            href="/methodology"
            className="flex items-center rounded-md px-3 py-3.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Methodology
          </Link>
          <Link
            href="/pricing"
            className="flex items-center rounded-md px-3 py-3.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Pricing
          </Link>
          <a
            href="https://www.npmjs.com/package/shiprank"
            target="_blank"
            rel="noopener noreferrer"
            className="press mt-2 flex items-center justify-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-4 py-3.5 font-mono text-xs text-brand-ink transition-all hover:border-brand hover:bg-brand hover:text-ink-onbrand hover:shadow-brand"
          >
            <span className="text-brand">❯</span>
            npx shiprank
          </a>
        </div>
      </nav>
    </>
  );
}

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-lg text-ink transition-colors group-hover:text-brand-ink">
            ShipRank
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="hidden items-center gap-1 sm:flex sm:gap-2">
            <Link
              href="/dare"
              className="rounded-md px-3 py-1.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Dare
            </Link>
            <Link
              href="/leaderboard"
              className="rounded-md px-3 py-1.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Leaderboard
            </Link>
            <Link
              href="/models"
              className="rounded-md px-3 py-1.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Models
            </Link>
            <Link
              href="/methodology"
              className="rounded-md px-3 py-1.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Methodology
            </Link>
            <Link
              href="/pricing"
              className="rounded-md px-3 py-1.5 font-body text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Pricing
            </Link>
            <a
              href="https://www.npmjs.com/package/shiprank"
              target="_blank"
              rel="noopener noreferrer"
              className="press ml-2 flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-4 py-1.5 font-mono text-xs text-brand-ink transition-all hover:border-brand hover:bg-brand hover:text-ink-onbrand hover:shadow-brand"
            >
              <span className="text-brand transition-colors group-hover:text-ink-onbrand">
                ❯
              </span>
              npx shiprank
            </a>
          </nav>
          <ThemeToggle />
          <MobileMenuButton />
        </div>
      </div>
    </header>
  );
}
