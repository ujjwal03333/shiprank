import type { CheckFn } from "./types";

function stub(id: string, weight: number, sev: "critical" | "warning" | "info", title: string, failMessage: string, fixPrompt: string, diff: "copy-paste" | "moderate" | "architectural", time: string, safety: "safe" | "review" | "human-only"): CheckFn {
  return () => ({ id, station: "architecture" as const, passed: true, severity: sev, confidence: 0, title, failMessage, evidence: "", fixPrompt, fixDifficulty: diff, fixTime: time, autoFixSafety: safety, scoreWeight: weight });
}

export const architectureChecks: CheckFn[] = [
  stub("ARCH-001", 20, "warning", "Business logic not in components",        "Database queries or API calls found directly inside React components.", "Extract data-fetching into Server Actions, hooks, or a service layer.",                       "architectural", "2 hrs",  "review"),
  stub("ARCH-002", 16, "warning", "No god components (>500 lines)",          "Components over 500 lines with multiple responsibilities.",             "Split god components into focused sub-components using the single-responsibility principle.", "architectural", "2 hrs",  "review"),
  stub("ARCH-003", 14, "warning", "No excessive prop drilling (>3 levels)",  "Props passed through more than 3 component levels.",                   "Use React Context, Zustand, or server-side data fetching to avoid prop drilling.",           "architectural", "2 hrs",  "review"),
  stub("ARCH-004", 12, "warning", "Service layer present",                   "No dedicated service/repository layer for external calls.",             "Create a services/ directory. Each file wraps one external integration (db, email, stripe).", "architectural", "2 hrs",  "review"),
  stub("ARCH-005", 11, "warning", "No circular dependencies",                "Circular import chains detected.",                                     "Resolve circular deps by extracting shared types to a separate module.",                     "architectural", "2 hrs",  "review"),
  stub("ARCH-006", 10, "warning", "Environment separation",                  "No separation between dev and production environment configs.",         "Use separate .env.development and .env.production files. Never reuse dev DB in production.", "moderate",      "30 min", "review"),
  stub("ARCH-007",  9, "info",    "Feature-based folder structure",           "Files organised by type rather than by feature.",                      "Reorganise to feature folders: features/auth/, features/billing/, features/dashboard/.",     "architectural", "4 hrs",  "review"),
  stub("ARCH-008",  5, "info",    "Shared UI component library",              "UI components scattered without a centralised component library.",      "Move reusable components to a packages/ui workspace package.",                              "architectural", "4 hrs",  "review"),
  stub("ARCH-009",  3, "info",    "API client abstraction",                   "Direct fetch() calls scattered across components.",                    "Create a single API client module (lib/api.ts) that all components use.",                   "moderate",      "1 hr",   "review"),
];
