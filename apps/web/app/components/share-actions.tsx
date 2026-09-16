"use client";

import { useState } from "react";
import Link from "next/link";
import { lockedTweet, tweetIntentUrl } from "@/lib/tweet";
import { cardUrl, publicAppUrl, safePublicOrigin } from "@/lib/public-url";

const PRIMARY =
  "press flex-1 rounded-[10px] bg-ink px-4 py-3 text-center font-body text-sm text-canvas hover:opacity-90";
const SECONDARY =
  "press flex-1 rounded-[10px] border border-border px-4 py-3 text-center font-body text-sm text-ink hover:bg-surface-raised";
const TERTIARY =
  "press flex-1 rounded-[10px] border border-border px-4 py-3 text-center font-mono text-xs text-ink-muted hover:text-ink";

function shareIsPrimary(grade: string): boolean {
  const g = grade.trim().toUpperCase();
  return g === "A+" || g === "A";
}

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
  const [copyError, setCopyError] = useState<string | null>(null);
  const pride = shareIsPrimary(grade);

  async function copy(kind: "link" | "image", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setCopyError(null);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
      setCopyError("Couldn’t copy. Select the link and copy it yourself.");
    }
  }

  const share = (
    <a
      href={tweetIntentUrl(tweet)}
      target="_blank"
      rel="noopener noreferrer"
      className={pride || !closeHref ? PRIMARY : SECONDARY}
    >
      Share on X
    </a>
  );

  const close = closeHref ? (
    <Link href={closeHref} className={pride ? SECONDARY : PRIMARY}>
      Close this
    </Link>
  ) : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {pride || !close ? (
          <>
            {share}
            {close}
          </>
        ) : (
          <>
            {close}
            {share}
          </>
        )}
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => copy("link", shareUrl)}
          className={TERTIARY}
        >
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
        <a
          href={`/api/card/${scanId}?size=og`}
          download={`${projectName}-shiprank.png`}
          className={TERTIARY}
        >
          Save image
        </a>
      </div>
      {copyError ? (
        <p role="alert" className="text-center font-body text-sm text-danger-ink">
          {copyError}
        </p>
      ) : null}
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
