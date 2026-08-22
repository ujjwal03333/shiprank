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
 * Theatrical stamp. Sequence:
 * hold → letter → count-up → meta → verdict → wordmark → actions.
 * Reduced motion skips to the end state.
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
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = animate && !reduced;
  const [phase, setPhase] = useState(play ? 0 : 6);
  const [shown, setShown] = useState(play ? 0 : score);

  useEffect(() => {
    if (!play) {
      setPhase(6);
      setShown(score);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase(1), 400),
      window.setTimeout(() => setPhase(2), 580),
      window.setTimeout(() => setPhase(3), 1100),
      window.setTimeout(() => setPhase(4), 1280),
      window.setTimeout(() => setPhase(5), 1680),
      window.setTimeout(() => setPhase(6), 1960),
    ];
    return () => timers.forEach(clearTimeout);
  }, [play, score]);

  useEffect(() => {
    if (phase < 2) return;
    if (!play) {
      setShown(score);
      return;
    }
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
  }, [phase, play, score]);

  const letterClass = gradeLetterClass(grade);
  const verdict = cardLine(score);
  const chip = [visiblePlatform(platform), meta].filter(Boolean).join("  ·  ");
  const show = (min: number) =>
    phase >= min ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2";

  return (
    <div className="night-court flex w-full flex-col items-center">
      <div
        className={`flex w-full flex-col items-center gap-5 rounded-[10px] border border-border px-6 py-12 text-center sm:px-10 sm:py-14 ${
          score >= 97 && phase >= 1 ? "score-perfect" : ""
        }`}
      >
        <span
          className={`font-display text-[7.5rem] font-medium leading-none tracking-[-0.04em] sm:text-[10rem] ${letterClass} ${
            phase >= 1 ? "letter-stamp" : "opacity-0"
          }`}
          style={{ fontOpticalSizing: "auto" }}
        >
          {grade}
        </span>
        <div className="flex flex-col items-center gap-1.5">
          <p
            className={`font-mono text-sm text-ink-muted transition-all duration-200 ${show(2)}`}
          >
            <span className="text-ink">{shown}</span>
            <span className="text-ink-subtle">
              {"  ·  "}
              {projectName}
            </span>
          </p>
          {chip ? (
            <p
              className={`font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle transition-all duration-200 ${show(3)}`}
            >
              {chip}
            </p>
          ) : null}
          <p
            className={`mt-2 font-display text-xl tracking-tight text-ink transition-all duration-200 sm:text-2xl ${show(4)}`}
          >
            {verdict}
          </p>
        </div>
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.32em] text-ink-muted transition-all duration-200 ${show(5)}`}
        >
          SHIPRANK
        </span>
      </div>
      <div
        className={`mt-8 w-full transition-all duration-300 ${
          phase >= 6 ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
