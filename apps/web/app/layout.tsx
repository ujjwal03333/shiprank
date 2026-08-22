import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "./components/site-chrome";
import { publicAppUrl } from "@/lib/public-url";

const fontDisplay = Fraunces({
  variable: "--font-display-family",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const fontBody = IBM_Plex_Sans({
  variable: "--font-body-family",
  subsets: ["latin"],
  weight: ["400", "500"],
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
  description: "Don't ship AI-built software without a ShipRank. The license to ship.",
  metadataBase: new URL(publicAppUrl()),
  keywords: [
    "Ship License",
    "AI-built software",
    "ShipRank",
    "Dare",
    "code grade",
    "vibe coding",
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
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("shiprank-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light")}else{document.documentElement.setAttribute("data-theme","dark")}}catch(e){document.documentElement.setAttribute("data-theme","dark")}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:fixed focus:w-auto focus:h-auto focus:overflow-visible focus:[clip-path:none] focus:whitespace-normal focus:m-0 focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-ink-onbrand focus:shadow-lg"
        >
          Skip to content
        </a>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
