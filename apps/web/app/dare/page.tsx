import type { Metadata } from "next";
import { DareForm } from "./dare-form";

export const metadata: Metadata = {
  title: "Dare",
  description: "Paste a public GitHub URL. The grade goes on the board.",
  alternates: { canonical: "/dare" },
};

export default function DarePage() {
  return (
    <div className="night-court flex min-h-[calc(100dvh-12rem)] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex w-full max-w-lg flex-col items-center gap-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          DARE
        </span>
        <DareForm />
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-subtle">
          Public · read-only · on the board
        </p>
      </div>
    </div>
  );
}
