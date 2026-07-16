import type { CheckFn } from "./types";

function stub(id: string, weight: number, sev: "critical" | "warning" | "info", title: string, failMessage: string, fixPrompt: string, diff: "copy-paste" | "moderate" | "architectural", time: string, safety: "safe" | "review" | "human-only"): CheckFn {
  return () => ({ id, station: "quality" as const, passed: true, severity: sev, confidence: 0, title, failMessage, evidence: "", fixPrompt, fixDifficulty: diff, fixTime: time, autoFixSafety: safety, scoreWeight: weight });
}

export const qualityChecks: CheckFn[] = [
  stub("QUAL-001", 14, "warning", "Test coverage present",                   "No test files found.",                                             "Add Vitest or Jest tests. Start with the most critical business logic paths.",               "moderate",      "2 hrs",  "review"),
  stub("QUAL-002", 12, "warning", "TypeScript strict mode enabled",           "tsconfig.json does not have strict: true.",                         'Add "strict": true to compilerOptions in tsconfig.json.',                                     "copy-paste",    "5 min",  "safe"),
  stub("QUAL-003", 12, "warning", "No 'any' type usage",                      "'any' type found in TypeScript source.",                            "Replace 'any' with specific types or 'unknown'. Use type assertions only at system boundaries.", "moderate",    "1 hr",   "review"),
  stub("QUAL-004", 11, "warning", "No dead exports",                          "Exported symbols that are never imported within the project.",       "Remove unused exports. Use eslint-plugin-unused-imports or ts-prune.",                        "moderate",      "30 min", "review"),
  stub("QUAL-005", 10, "warning", "No console.log in production code",        "console.log found in non-test source files.",                       "Replace console.log with a structured logger (pino, winston) or remove debug logs.",          "copy-paste",    "15 min", "safe"),
  stub("QUAL-006",  9, "warning", "Error boundaries present",                 "No React Error Boundary found.",                                    "Add an <ErrorBoundary> around each major section. Use react-error-boundary package.",          "copy-paste",    "15 min", "safe"),
  stub("QUAL-007",  8, "warning", "Loading states for async operations",      "Data-fetching components have no loading state.",                   "Add a loading skeleton or spinner while data loads. Use React Suspense boundaries.",          "moderate",      "30 min", "review"),
  stub("QUAL-008",  8, "warning", "Error handling for async operations",      "API calls without .catch() or try/catch.",                          "Wrap all fetch/async calls in try/catch. Show user-friendly error messages.",                 "moderate",      "30 min", "review"),
  stub("QUAL-009",  7, "info",    "No TODO/FIXME comments",                   "Unresolved TODO or FIXME comments in source.",                      "Resolve or convert TODOs to GitHub issues. Ship without known technical debt.",              "copy-paste",    "15 min", "safe"),
  stub("QUAL-010",  6, "info",    "Consistent code formatting",               "No Prettier or Biome formatter configured.",                        "Add Biome: pnpm add -D @biomejs/biome && pnpm biome init",                                   "copy-paste",    "5 min",  "safe"),
  stub("QUAL-011",  5, "info",    "Linting configured",                       "No ESLint or Biome lint config found.",                             "Add eslint-config-next or Biome for automated code quality checks.",                         "copy-paste",    "5 min",  "safe"),
  stub("QUAL-012",  5, "info",    "No large components (>300 lines)",         "Components over 300 lines found.",                                  "Break large components into smaller sub-components focused on a single concern.",            "moderate",      "1 hr",   "review"),
  stub("QUAL-013",  3, "info",    "Consistent import order",                  "Import statements are not consistently ordered.",                   "Use eslint-plugin-import or Biome's organizeImports to enforce consistent import order.",    "copy-paste",    "5 min",  "safe"),
];
