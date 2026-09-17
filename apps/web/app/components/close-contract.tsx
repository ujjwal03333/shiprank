"use client";

import { useState } from "react";
import type { ShipContract } from "@/lib/contract";

export function CloseContract({
  contract,
  redareHref,
}: {
  contract: ShipContract | null;
  redareHref?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!contract) {
    return (
      <div className="flex w-full flex-col gap-3 border border-border bg-surface px-6 py-8 text-center">
        <p className="font-display text-2xl text-ink">Nothing we can point at.</p>
        <p className="font-body text-sm text-ink-muted">Share the Card.</p>
      </div>
    );
  }

  async function copyPrompt() {
    if (!contract) return;
    try {
      await navigator.clipboard.writeText(contract.prompt);
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError("Couldn’t copy. Select the prompt and copy it yourself.");
    }
  }

  const loc =
    contract.filePath != null
      ? `${contract.filePath}${contract.lineNumber != null ? `:${contract.lineNumber}` : ""}`
      : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 border border-border bg-surface px-5 py-6 sm:px-7 sm:py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          Contract 01
        </span>
        {contract.remainingAfter > 0 ? (
          <span className="font-mono text-[11px] text-ink-subtle">
            {contract.remainingAfter} after this
          </span>
        ) : null}
      </div>
      <h2 className="break-words font-display text-2xl leading-tight text-ink sm:text-3xl">
        {contract.title}
      </h2>
      {contract.agentAttributed && contract.why ? (
        <p className="font-body text-sm leading-relaxed text-ink-muted">
          <span className="text-ink-subtle">Why the AI did this. </span>
          {contract.why}
        </p>
      ) : null}
      {loc ? (
        <p className="break-all font-mono text-xs text-ink-subtle">{loc}</p>
      ) : (
        <p className="font-mono text-xs text-ink-subtle">
          No file:line on this check — close it from the prompt.
        </p>
      )}
      {contract.snippet ? (
        <pre className="max-w-full overflow-x-auto border border-border bg-canvas px-3 py-3 font-mono text-[11px] leading-relaxed text-ink-muted">
          {contract.snippet.split("\n").slice(0, 6).join("\n")}
        </pre>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-subtle">
          Agent prompt
        </span>
        <pre className="max-w-full whitespace-pre-wrap break-words border border-border bg-canvas px-3 py-3 font-mono text-xs leading-relaxed text-ink">
          {contract.prompt}
        </pre>
      </div>
      <button
        type="button"
        onClick={() => void copyPrompt()}
        className="press w-full rounded-[10px] bg-ink px-4 py-3 font-body text-sm text-canvas hover:opacity-90"
      >
        {copied ? "Copied" : "Copy prompt"}
      </button>
      {redareHref ? (
        <a
          href={redareHref}
          className="press w-full rounded-[10px] border border-border px-4 py-3 text-center font-body text-sm text-ink hover:bg-surface-raised"
        >
          Re-dare after the fix
        </a>
      ) : null}
      {copyError ? (
        <p role="alert" className="text-center font-body text-sm text-danger-ink">
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
