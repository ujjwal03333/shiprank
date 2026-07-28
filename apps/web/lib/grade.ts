export function gradeStroke(grade: string): string {
  if (grade === "A+" || grade === "A") return "#3f7d52";
  if (grade === "B") return "#3d6e8c";
  if (grade === "C") return "#c08a1e";
  return "#b23b3b";
}

export function gradeBadgeClass(grade: string): string {
  if (grade === "A+" || grade === "A") return "bg-success-soft text-success-ink";
  if (grade === "B") return "bg-info-soft text-info-ink";
  if (grade === "C") return "bg-warning-soft text-warning-ink";
  return "bg-danger-soft text-danger-ink";
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
