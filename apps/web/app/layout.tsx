import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SiteNav } from "./components/site-nav";
import { PageLoadingBar } from "./components/page-loading-bar";

const fontDisplay = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const fontBody = Inter({
  variable: "--font-body-family",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ShipRank", template: "%s · ShipRank" },
  description:
    "The finishing service for AI-built software. Compile, scan, and rank AI-generated projects.",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://shiprank.dev",
  ),
  keywords: [
    "AI code quality",
    "code scanning",
    "AI-built software",
    "code grading",
    "software quality",
    "ShipRank",
    "compile",
    "accessibility",
    "security",
    "performance",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "ShipRank",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("shiprank-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}else if(matchMedia("(prefers-color-scheme:dark)").matches){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-ink-onbrand focus:shadow-lg"
        >
          Skip to content
        </a>
        <PageLoadingBar />
        <SiteNav />
        <main id="main-content" className="flex-1">{children}</main>
        <footer className="border-t border-border bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="flex flex-col gap-3">
              <span className="font-display text-lg text-ink">ShipRank</span>
              <p className="max-w-xs font-body text-sm leading-relaxed text-ink-muted">
                The finishing service for AI-built software. Compile, scan,
                rank — ship something you&apos;re proud of.
              </p>
            </div>
            <nav aria-label="Product" className="flex flex-col gap-2.5">
              <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                Product
              </span>
              <a href="/leaderboard" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
                Leaderboard
              </a>
              <a href="/methodology" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
                Methodology
              </a>
              <a href="/pricing" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
                Pricing
              </a>
            </nav>
            <nav aria-label="Tools" className="flex flex-col gap-2.5">
              <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                Tools
              </span>
              <a href="https://www.npmjs.com/package/shiprank" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
                CLI on npm
              </a>
              <a href="/dashboard" className="font-body text-sm text-ink-muted transition-colors hover:text-ink">
                Dashboard
              </a>
              <code className="font-mono text-xs text-ink-subtle">
                npx shiprank ./your-project
              </code>
            </nav>
            <nav aria-label="API" className="flex flex-col gap-2.5">
              <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                API
              </span>
              <span className="font-mono text-xs text-ink-subtle">/api/scan/[id]</span>
              <span className="font-mono text-xs text-ink-subtle">/api/verify/[id]</span>
              <span className="font-mono text-xs text-ink-subtle">/api/leaderboard</span>
            </nav>
          </div>
          <div className="border-t border-border/60">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-xs text-ink-subtle">
                © {new Date().getFullYear()} ShipRank
              </span>
              <nav aria-label="Legal" className="flex items-center gap-4">
                <a href="/about" className="font-mono text-xs text-ink-subtle transition-colors hover:text-ink">
                  About
                </a>
                <a href="/privacy" className="font-mono text-xs text-ink-subtle transition-colors hover:text-ink">
                  Privacy
                </a>
                <a href="/terms" className="font-mono text-xs text-ink-subtle transition-colors hover:text-ink">
                  Terms
                </a>
              </nav>
              <span className="font-mono text-xs text-ink-subtle">
                Built with Claude · Finished by ShipRank
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
