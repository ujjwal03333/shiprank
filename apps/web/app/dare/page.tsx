import type { Metadata } from "next";
import { DareForm } from "./dare-form";

export const metadata: Metadata = {
  title: "Dare",
  description: "Paste a public GitHub URL. ShipRank scans it and ranks the result.",
  alternates: { canonical: "/dare" },
};

export default function DarePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-8 px-6 py-24 text-center">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-brand">
          Dare Board
        </span>
        <h1 className="mt-3 font-display text-4xl text-ink">Dare a public repo</h1>
        <p className="mt-3 font-body text-base leading-relaxed text-ink-muted">
          Paste any public GitHub URL. We clone it, run static analysis only
          (never execute the code), and put the score on the public
          leaderboard in about a minute.
        </p>
      </div>
      <DareForm />
      <p className="font-mono text-xs text-ink-subtle">
        Results appear on the public leaderboard.
      </p>
    </div>
  );
}
