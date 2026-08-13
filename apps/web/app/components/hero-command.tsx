"use client";

import { useState } from "react";

const COMMAND = "npx shiprank ./your-project";

export function HeroCommand() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      className="press group flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-3 font-mono text-sm text-ink shadow-sm transition-colors hover:border-brand/40"
    >
      <span className="text-ink-subtle" aria-hidden>❯</span>
      {COMMAND}
      <span className="ml-1 flex items-center gap-1 text-xs text-ink-subtle transition-colors group-hover:text-brand-ink">
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="m3 8.5 3.5 3.5L13 5"
                stroke="var(--color-success)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-success-ink">Copied!</span>
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M10.5 3.5v-1a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            Copy
          </>
        )}
      </span>
    </button>
  );
}
