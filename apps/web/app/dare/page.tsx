import type { Metadata } from "next";
import { DareForm } from "./dare-form";

export const metadata: Metadata = {
  title: "Dare",
  description: "Paste a public GitHub URL. The grade goes on the board.",
  alternates: { canonical: "/dare" },
};

export default async function DarePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; parent?: string }>;
}) {
  const q = await searchParams;
  return (
    <div className="night-court flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex w-full max-w-lg flex-col items-center gap-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          DARE
        </span>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          Paste a public GitHub URL.
        </h1>
        <DareForm initialRepo={q.repo ?? ""} parentScanId={q.parent ?? null} />
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-subtle">
          Public · read-only · on the board
        </p>
      </div>
    </div>
  );
}
