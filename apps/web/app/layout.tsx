import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SiteNav } from "./components/site-nav";

const fontDisplay = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const fontBody = Inter({
  variable: "--font-body-family",
  subsets: ["latin"],
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "ShipRank", template: "%s · ShipRank" },
  description:
    "The finishing service for AI-built software. Compile, scan, and rank AI-generated projects.",
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] ?? "https://shiprank.dev",
  ),
  openGraph: {
    siteName: "ShipRank",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-8 flex items-center justify-between">
            <span className="font-mono text-xs text-ink-subtle">
              ShipRank — finish what your AI built
            </span>
            <nav className="flex gap-6">
              <a
                href="/methodology"
                className="font-mono text-xs text-ink-subtle hover:text-ink transition-colors"
              >
                Methodology
              </a>
              <a
                href="/leaderboard"
                className="font-mono text-xs text-ink-subtle hover:text-ink transition-colors"
              >
                Leaderboard
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
