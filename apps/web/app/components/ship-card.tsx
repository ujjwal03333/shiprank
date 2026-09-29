import Link from "next/link";
import { cardLine, gradeLetterClass } from "@/lib/grade";
import { cardPath } from "@/lib/public-url";
import { visiblePlatform } from "@/lib/format-names";
import { AskedChips, type AskedChip } from "./asked-chips";

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
  previousScore?: number | null;
  /** Asked vs shipped. Information only — never buttons. */
  chips?: readonly AskedChip[];
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
  previousScore = null,
  chips = [],
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
      className={`night-court flex w-full min-w-0 flex-col items-center gap-5 rounded-[10px] border border-border px-6 py-12 text-center sm:px-10 sm:py-14 ${
        score >= 97 ? "score-perfect" : ""
      }`}
    >
      <span
        className={`${staticStamp ? "" : "letter-stamp"} font-display font-medium tracking-[-0.04em] ${letterSize} ${letterClass}`}
        style={{ fontOpticalSizing: "auto" }}
      >
        {grade}
      </span>
      {chips.length > 0 ? <AskedChips chips={chips} /> : null}
      <div className="flex min-w-0 max-w-full flex-col items-center gap-1.5">
        <p className="max-w-full break-words font-mono text-sm text-ink-muted">
          <span className="text-ink">{score}</span>
          {typeof previousScore === "number" && previousScore !== score ? (
            <span className="text-ink-subtle">{`  ←  ${previousScore}`}</span>
          ) : null}
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
  );

  if (href) {
    return (
      <Link href={href} className="block w-full min-w-0 transition-opacity hover:opacity-95">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function cardHref(scanId: string): string {
  return cardPath(scanId);
}
