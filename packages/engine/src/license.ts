import type { CheckResult, StationScore } from "./checks/types";
import { isActiveCheck } from "./checks/engine";

export type License = "Hold" | "Licensed";

export interface Verdict {
  headline: string;
  detail: string;
}

/**
 * Ship License. Hold if any scored critical failed.
 * Stubs (confidence 0) and N/A (applicable === false) do not count.
 */
export function licenseFor(criticalCount: number): License {
  return criticalCount > 0 ? "Hold" : "Licensed";
}

export function criticalCountOf(stations: StationScore[]): number {
  return countFindings(stations, (c) => !c.passed && c.severity === "critical");
}

export function failingCountOf(stations: StationScore[]): number {
  return countFindings(stations, (c) => !c.passed);
}

function countFindings(
  stations: StationScore[],
  pred: (c: CheckResult) => boolean,
): number {
  let n = 0;
  for (const s of stations) {
    for (const c of s.checks) {
      if (!isActiveCheck(c)) continue;
      if (pred(c)) n++;
    }
  }
  return n;
}

/**
 * A one-line plain-language read on a scan, derived from the real score and
 * failing-finding counts — never a canned string independent of the data.
 * Hold if criticalCount > 0.
 */
export function verdictFor(
  score: number,
  criticalCount: number,
  failingCount: number,
): Verdict {
  if (criticalCount > 0) {
    return {
      headline: "Hold before shipping.",
      detail: `${criticalCount} critical ${criticalCount === 1 ? "issue" : "issues"} to fix first.`,
    };
  }
  if (score >= 90) {
    return {
      headline: "Ready to ship.",
      detail:
        failingCount > 0
          ? `${failingCount} minor ${failingCount === 1 ? "polish item" : "polish items"} left, nothing blocking.`
          : "Every check passed.",
    };
  }
  if (score >= 75) {
    return {
      headline: "Ship it — almost.",
      detail:
        failingCount > 0
          ? `${failingCount} ${failingCount === 1 ? "fix stands" : "fixes stand"} between this project and the top decile.`
          : "No open findings — the gap to 90+ is in partial-credit checks, not fixes.",
    };
  }
  if (score >= 50) {
    return {
      headline: "Functional, not finished.",
      detail:
        failingCount > 0
          ? `${failingCount} findings to work through before this is production-ready.`
          : "No open findings, but station scoring reflects gaps beyond pass/fail checks.",
    };
  }
  return {
    headline: "Needs work before shipping.",
    detail:
      failingCount > 0
        ? `${failingCount} findings, several likely to surface as real bugs or vulnerabilities.`
        : "No open findings, but the score reflects significant gaps across stations.",
  };
}
