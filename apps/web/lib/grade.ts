import { gradeHex } from "./night-court";

export function gradeStroke(grade: string): string {
  return gradeHex(grade);
}

export function gradeBadgeClass(grade: string): string {
  if (grade === "A+" || grade === "A") return "bg-success-soft text-success-ink";
  if (grade === "B") return "bg-info-soft text-info-ink";
  if (grade === "C") return "bg-warning-soft text-warning-ink";
  return "bg-danger-soft text-danger-ink";
}

/** Display-letter color on the Night Court Card. Grade IS the color. */
export function gradeLetterClass(grade: string): string {
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A") return "text-grade-a";
  if (g === "B") return "text-grade-b";
  if (g === "C") return "text-grade-c";
  if (g === "D") return "text-grade-d";
  return "text-grade-f";
}

/** One line under the letter. Short enough to screenshot. Locked voice. */
export function cardLine(score: number): string {
  if (score >= 97) return "Exceptional.";
  if (score >= 85) return "Ready to ship.";
  if (score >= 70) return "Almost.";
  if (score >= 55) return "Not shippable yet.";
  return "Do not ship.";
}

export interface Verdict {
  headline: string;
  detail: string;
}

/**
 * A one-line plain-language read on a scan, derived from the real score and
 * failing-finding counts — never a canned string independent of the data.
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

export const STATION_LABEL: Record<string, string> = {
  security: "Security",
  accessibility: "Accessibility",
  performance: "Performance",
  growth: "Growth",
  code_quality: "Code Quality",
  architecture: "Architecture",
  data: "Data",
  compliance: "Compliance",
  infra: "Infra",
};

export const STATION_DESCRIPTION: Record<string, string> = {
  security: "Secrets, RLS, auth patterns, input validation",
  accessibility: "ARIA, contrast, keyboard, heading hierarchy",
  performance: "Bundle size, images, caching, Core Web Vitals",
  growth: "SEO, Open Graph, analytics, social sharing",
  code_quality: "TypeScript, tests, linting, dead code",
  architecture: "Module coupling, file complexity, god files",
  data: "Schema validation, input sanitization",
  compliance: "Privacy pages, cookie handling, GDPR signals",
  infra: "Deployment config, env hygiene, CI/CD, monitoring",
};

export const STATION_COLOR: Record<string, string> = {
  security: "#b23b3b",
  accessibility: "#6a4c93",
  performance: "#c08a1e",
  growth: "#3f7d52",
  code_quality: "#3d6e8c",
  architecture: "#8b5e34",
  data: "#4c7a8c",
  compliance: "#7a4c6a",
  infra: "#5c6b73",
};
