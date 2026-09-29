import type { Metadata } from "next";
import { CompileForm } from "./compile-form";

export const metadata: Metadata = {
  title: "Compile",
  description: "Harden the prompt before the agent writes code.",
  alternates: { canonical: "/compile" },
};

export default function CompilePage() {
  return (
    <div className="night-court flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex w-full max-w-lg flex-col items-center gap-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          COMPILE
        </span>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
          Harden the prompt before the agent writes code.
        </h1>
        <p className="font-body text-sm text-ink-muted">
          Local brief. Paste it into Cursor, Claude Code, Lovable, or Bolt.
        </p>
        <CompileForm />
      </div>
    </div>
  );
}
