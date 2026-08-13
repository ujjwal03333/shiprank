"use client";

import { useState } from "react";

export function BadgeSnippet({
  scanId,
  appUrl,
}: {
  scanId: string;
  appUrl: string;
}) {
  const badgeUrl = `${appUrl}/api/badge/${scanId}.svg`;
  const verifyUrl = `${appUrl}/verify/${scanId}`;
  const markdown = `[![ShipRank](${badgeUrl})](${verifyUrl})`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">Add the badge to your README</h2>
          <p className="mt-1 font-body text-sm text-ink-muted">
            The badge links to a verifiable attestation — it&apos;s the trust anchor.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeUrl} alt="ShipRank badge preview" height={20} />
      </div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-surface-sunken px-3 py-2.5 font-mono text-xs text-ink whitespace-nowrap">
          {markdown}
        </code>
        <button
          onClick={copy}
          className="press shrink-0 rounded-lg bg-ink px-4 py-2.5 font-body text-sm text-canvas transition-colors hover:bg-brand-hover"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
