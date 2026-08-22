"use client";

import { useState } from "react";

const CLI = "npx shiprank ./your-project";
const RULES = "npx shiprank --rules";

type Tab = "scan" | "agent";

export function McpInstall() {
  const [tab, setTab] = useState<Tab>("agent");
  const [copied, setCopied] = useState(false);
  const command = tab === "agent" ? RULES : CLI;

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 text-left">
      <div className="flex gap-1 rounded-lg border border-border bg-surface-sunken p-1">
        {(
          [
            ["agent", "Next instruction"],
            ["scan", "Scan"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setCopied(false);
            }}
            className={`press flex-1 rounded-md px-3 py-1.5 font-mono text-xs ${
              tab === id
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={copy}
        className="press group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left font-mono text-sm text-ink shadow-sm hover:border-brand/40"
      >
        <span className="text-ink-subtle" aria-hidden>
          ❯
        </span>
        <span className="min-w-0 flex-1 break-all">{command}</span>
        <span className="shrink-0 font-mono text-[11px] text-ink-subtle group-hover:text-brand-ink">
          {copied ? <span className="text-success-ink">Copied!</span> : "Copy"}
        </span>
      </button>
      <p className="font-body text-xs leading-relaxed text-ink-subtle">
        {tab === "agent"
          ? "Writes AGENTS.md from the real findings — the next prompt for Cursor or Claude Code. Same engine as the scan."
          : "Runs locally. Source never leaves the machine unless you pass --upload."}
      </p>
    </div>
  );
}
