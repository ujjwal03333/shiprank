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
