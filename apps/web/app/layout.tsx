import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

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
  title: "ShipRank — finish what your AI built",
  description:
    "Give me what your AI built. I'll give it back finished. Compile, scan, finish, and rank AI-generated software across the full lifecycle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
