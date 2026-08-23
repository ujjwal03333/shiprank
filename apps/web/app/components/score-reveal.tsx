"use client";

import { useEffect, useState } from "react";
import { cardLine, gradeLetterClass } from "@/lib/grade";
import { visiblePlatform } from "@/lib/format-names";

export interface ScoreRevealProps {
  score: number;
  grade: string;
  projectName: string;
  platform?: string | null | undefined;
  meta?: string | undefined;
  animate?: boolean;
  children?: React.ReactNode;
}

/**
 * Stamp: letter is always in layout. Motion users get a CSS stamp + count-up.
 * Reduced motion skips to the end state with no hide/show jump.
 */
export function ScoreReveal({
  score,
  grade,
  projectName,
  platform,
  meta,
  animate = true,
  children,
}: ScoreRevealProps) {
  const [shown, setShown] = useState(score);
  const [stamp, setStamp] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!animate || reduced) {
      setShown(score);
      setStamp(false);
      return;
    }

    setStamp(true);
    setShown(0);
    const start = performance.now();
    const ms = 500;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(score * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, score]);

  const letterClass = gradeLetterClass(grade);
  const verdict = cardLine(score);
  const chip = [visiblePlatform(platform), meta].filter(Boolean).join("  ·  ");

  return (
    <div className="night-court flex w-full min-w-0 flex-col items-center">
      <div
        className={`flex w-full min-w-0 flex-col items-center gap-5 rounded-[10px] border border-border px-6 py-12 text-center sm:px-10 sm:py-14 ${
          score >= 97 ? "score-perfect" : ""
        }`}
      >
        <span
          className={`font-display text-[7.5rem] font-medium leading-none tracking-[-0.04em] sm:text-[10rem] ${letterClass} ${
            stamp ? "letter-stamp" : ""
          }`}
          style={{ fontOpticalSizing: "auto" }}
        >
          {grade}
        </span>
        <div className="flex min-w-0 max-w-full flex-col items-center gap-1.5">
          <p className="max-w-full break-words font-mono text-sm text-ink-muted">
            <span className="text-ink">{shown}</span>
            <span className="text-ink-subtle">
              {"  ·  "}
              {projectName}
            </span>
          </p>
          {chip ? (
            <p className="max-w-full break-words font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
              {chip}
            </p>
          ) : null}
          <p className="mt-2 font-display text-xl tracking-tight text-ink sm:text-2xl">
            {verdict}
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ink-muted">
          SHIPRANK
        </span>
      </div>
      {children ? <div className="mt-8 w-full min-w-0">{children}</div> : null}
    </div>
  );
}
