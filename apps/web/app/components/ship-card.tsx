import Link from "next/link";
import { cardLine, gradeLetterClass } from "@/lib/grade";
import { cardPath } from "@/lib/public-url";
import { visiblePlatform } from "@/lib/format-names";

export interface ShipCardProps {
  score: number;
  grade: string;
  projectName: string;
  line?: string | undefined;
  meta?: string | undefined;
  platform?: string | null | undefined;
  href?: string;
  /** hero = Dare reveal / /s. board = home + wall. */
  size?: "hero" | "board";
  /** When true, skip entrance animation (static /s, board, OG-matching). */
  staticStamp?: boolean;
}

/**
 * The Card. Zero buttons on the face. Night Court only.
 * Screenshot this object — do not screenshot the page around it.
 */
export function ShipCard({
  score,
  grade,
  projectName,
  line,
  meta,
  platform,
  href,
  size = "board",
  staticStamp = false,
}: ShipCardProps) {
  const letterClass = gradeLetterClass(grade);
  const verdict = line ?? cardLine(score);
  const letterSize =
    size === "hero"
      ? "text-[7.5rem] leading-none sm:text-[10rem]"
      : "text-6xl leading-none sm:text-7xl";
  const chip = [visiblePlatform(platform), meta].filter(Boolean).join("  ·  ");

  const inner = (
    <div
      className={`night-court flex w-full flex-col items-center gap-5 rounded-[10px] border border-border px-6 py-12 text-center sm:px-10 sm:py-14 ${
        score >= 97 ? "score-perfect" : ""
      }`}
    >
      <span
        className={`${staticStamp ? "" : "letter-stamp"} font-display font-medium tracking-[-0.04em] ${letterSize} ${letterClass}`}
        style={{ fontOpticalSizing: "auto" }}
      >
        {grade}
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-mono text-sm text-ink-muted">
          <span className="text-ink">{score}</span>
          <span className="text-ink-subtle">
            {"  ·  "}
            {projectName}
          </span>
        </p>
        {chip ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
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
  );

  if (href) {
    return (
      <Link href={href} className="block w-full transition-opacity hover:opacity-95">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function cardHref(scanId: string): string {
  return cardPath(scanId);
}
