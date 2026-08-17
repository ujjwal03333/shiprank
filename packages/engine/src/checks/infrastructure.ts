import type { CheckFn } from "./types";

const FIX_TIME_5_MIN = "5 min";
const FIX_TIME_30_MIN = "30 min";
const FIX_TIME_1_HR = "1 hr";

function stub(id: string, weight: number, sev: "critical" | "warning" | "info", title: string, failMessage: string, fixPrompt: string, diff: "copy-paste" | "moderate" | "architectural", time: string, safety: "safe" | "review" | "human-only"): CheckFn {
  return () => ({ id, station: "infrastructure" as const, passed: true, severity: sev, confidence: 0, title, failMessage, evidence: "", fixPrompt, fixDifficulty: diff, fixTime: time, autoFixSafety: safety, scoreWeight: weight });
}

export const infrastructureChecks: CheckFn[] = [
  stub("INFRA-001", 20, "warning", "CI pipeline configured",              "No CI/CD configuration found.",                                       "Add .github/workflows/ci.yml: checkout → install → typecheck → test → build.",                              "copy-paste",    FIX_TIME_30_MIN, "safe"),
  stub("INFRA-002", 18, "warning", "Error tracking configured",           "No error monitoring service detected (Sentry, Highlight, etc.).",     "Add Sentry: pnpm add @sentry/nextjs && npx @sentry/wizard@latest -i nextjs",                                 "copy-paste",    FIX_TIME_30_MIN, "safe"),
  stub("INFRA-003", 14, "warning", "Analytics configured",                "No analytics (PostHog, Mixpanel, Plausible, etc.) detected.",         "Add PostHog: pnpm add posthog-js and wrap your app with <PostHogProvider>.",                                 "copy-paste",    FIX_TIME_30_MIN, "safe"),
  stub("INFRA-004", 12, "warning", "Health check endpoint present",       "No /api/health or /api/ping route found.",                            "Add app/api/health/route.ts returning { status: 'ok', timestamp: Date.now() }.",                             "copy-paste",    FIX_TIME_5_MIN,  "safe"),
  stub("INFRA-005", 11, "warning", "No hardcoded localhost URLs",         "localhost or 127.0.0.1 found in non-test source files.",              "Replace localhost URLs with environment variables: process.env.NEXT_PUBLIC_APP_URL",                          "copy-paste",    FIX_TIME_5_MIN,  "safe"),
  stub("INFRA-006", 10, "warning", "Environment separation",              "No separation between development and production configurations.",     "Use .env.local for dev overrides. Never point your dev app at a production database.",                        "moderate",      FIX_TIME_30_MIN, "review"),
  stub("INFRA-007",  9, "info",    "Deployment preview configured",       "No preview deployment configured for pull requests.",                  "Enable Vercel preview deployments or GitHub Actions PR previews for faster review cycles.",                   "moderate",      FIX_TIME_1_HR,   "review"),
  stub("INFRA-008",  6, "info",    "Dependency updates automated",        "No Dependabot or Renovate config found.",                             "Add .github/dependabot.yml with package-ecosystem: npm, schedule: weekly.",                                  "copy-paste",    FIX_TIME_5_MIN,  "safe"),
];
