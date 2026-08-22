"use client";

import { useState } from "react";
import type { ShipContract } from "@/lib/contract";

export function CloseContract({ contract }: { contract: ShipContract | null }) {
  const [copied, setCopied] = useState(false);

  if (!contract) {
    return (
      <div className="flex w-full flex-col gap-3 border border-border bg-surface px-6 py-8 text-center">
        <p className="font-display text-2xl text-ink">Nothing blocking.</p>
        <p className="font-body text-sm text-ink-muted">Stamp a License.</p>
      </div>
    );
  }

  async function copyPrompt() {
    if (!contract) return;
    try {
      await navigator.clipboard.writeText(contract.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  const loc =
    contract.filePath != null
      ? `${contract.filePath}${contract.lineNumber != null ? `:${contract.lineNumber}` : ""}`
      : null;

  return (
    <div className="flex w-full flex-col gap-5 border border-border bg-surface px-5 py-6 sm:px-7 sm:py-8">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          Contract 01
        </span>
        <span className="font-mono text-[11px] text-ink-subtle">
          +{contract.estimatedDelta} est.
        </span>
      </div>
      <h2 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
        {contract.title}
      </h2>
      <p className="font-body text-sm leading-relaxed text-ink-muted">
        <span className="text-ink-subtle">Why the AI did this. </span>
        {contract.why}
      </p>
      {loc ? (
        <p className="font-mono text-xs text-ink-subtle">{loc}</p>
      ) : (
        <p className="font-mono text-xs text-ink-subtle">
          Evidence is in the tree — send the prompt to the agent.
        </p>
      )}
      {contract.snippet ? (
        <pre className="overflow-x-auto border border-border bg-canvas px-3 py-3 font-mono text-[11px] leading-relaxed text-ink-muted">
          {contract.snippet.split("\n").slice(0, 6).join("\n")}
        </pre>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-subtle">
          Agent prompt
        </span>
        <pre className="whitespace-pre-wrap border border-border bg-canvas px-3 py-3 font-mono text-xs leading-relaxed text-ink">
          {contract.prompt}
        </pre>
      </div>
      <button
        type="button"
        onClick={() => void copyPrompt()}
        className="press w-full rounded-[10px] bg-ink px-4 py-3 font-body text-sm text-canvas hover:opacity-90"
      >
        {copied ? "Copied" : "Send to agent"}
      </button>
    </div>
  );
}
