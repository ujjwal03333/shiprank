import type { Metadata } from "next";
import { DareForm } from "./dare/dare-form";
import { ShipCard } from "./components/ship-card";
import { getLiveCards } from "@/lib/live-cards";
import { formatPlatformName } from "@/lib/format-names";
import { cardPath } from "@/lib/public-url";

export const metadata: Metadata = {
  title: "ShipRank — Don't ship AI-built software without a ShipRank",
  description:
    "The Ship License for AI-built software. Dare a public repo. Stamp the grade. Close the contract.",
  alternates: { canonical: "/" },
};

export const revalidate = 60;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ShipRank",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description: "Don't ship AI-built software without a ShipRank. The license to ship.",
  offers: [
    { "@type": "Offer", name: "Dare", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Close", price: "29", priceCurrency: "USD" },
    { "@type": "Offer", name: "License", price: "99", priceCurrency: "USD" },
  ],
};

export default async function HomePage() {
  const cards = await getLiveCards(3);

  return (
    <div className="night-court flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="mx-auto flex min-h-[calc(100dvh-12rem)] w-full max-w-lg flex-col items-center justify-center gap-10 px-6 py-20 text-center">
        <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Don&apos;t ship AI-built software without a ShipRank.
        </h1>
        <div className="w-full">
          <DareForm />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-subtle">
          Public · read-only · on the board
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 pb-20">
        {cards.length === 0 ? (
          <p className="text-center font-mono text-xs text-ink-subtle">
            The board is empty. Be the first dare.
          </p>
        ) : (
          <div className="flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {cards.map((card) => (
              <div key={card.scanId} className="min-w-[260px] flex-1 snap-start">
                <ShipCard
                  score={card.score}
                  grade={card.grade}
                  projectName={card.projectName}
                  platform={
                    card.platform ? formatPlatformName(card.platform) : null
                  }
                  href={cardPath(card.scanId)}
                  size="board"
                  staticStamp
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-12 flex flex-col items-center gap-3 font-mono text-xs text-ink-subtle">
          <code>npx shiprank</code>
          <code>npx @shiprank/mcp</code>
        </div>
      </section>
    </div>
  );
}
