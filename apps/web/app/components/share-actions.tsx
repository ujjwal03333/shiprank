"use client";

import { useState } from "react";
import Link from "next/link";
import { lockedTweet, tweetIntentUrl } from "@/lib/tweet";
import { cardUrl, publicAppUrl, safePublicOrigin } from "@/lib/public-url";

export function ShareActions({
  scanId,
  projectName,
  score,
  grade,
  closeHref,
  dareBack = true,
  origin,
}: {
  scanId: string;
  projectName: string;
  score: number;
  grade: string;
  closeHref?: string;
  dareBack?: boolean;
  origin?: string;
}) {
  const host = safePublicOrigin(
    origin ?? (typeof window !== "undefined" ? window.location.origin : publicAppUrl()),
  );
  const shareUrl = cardUrl(scanId, host);
  const tweet = lockedTweet({ name: projectName, score, grade, origin: host });
  const [copied, setCopied] = useState<"link" | "image" | null>(null);

  async function copy(kind: "link" | "image", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <a
          href={tweetIntentUrl(tweet)}
          target="_blank"
          rel="noopener noreferrer"
          className="press flex-1 rounded-[10px] bg-ink px-4 py-3 text-center font-body text-sm text-canvas hover:opacity-90"
        >
          Share on X
        </a>
        {closeHref ? (
          <Link
            href={closeHref}
            className="press flex-1 rounded-[10px] border border-border px-4 py-3 text-center font-body text-sm text-ink hover:bg-surface-raised"
          >
            Close this
          </Link>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => copy("link", shareUrl)}
          className="press flex-1 rounded-[10px] border border-border px-4 py-3 font-mono text-xs text-ink-muted hover:text-ink"
        >
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
        <a
          href={`/api/card/${scanId}?size=og`}
          download={`${projectName}-shiprank.png`}
          className="press flex-1 rounded-[10px] border border-border px-4 py-3 text-center font-mono text-xs text-ink-muted hover:text-ink"
        >
          Save image
        </a>
      </div>
      {dareBack ? (
        <Link
          href="/dare"
          className="pt-1 text-center font-mono text-xs text-ink-subtle hover:text-ink"
        >
          Dare someone back →
        </Link>
      ) : null}
    </div>
  );
}
