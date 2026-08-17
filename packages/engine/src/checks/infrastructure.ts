import type { CheckResult, CheckFn, FileInfo } from "./types";

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const FIX_TIME_5_MIN = "5 min";
const FIX_TIME_30_MIN = "30 min";
const FIX_TIME_1_HR = "1 hr";

function stub(
  id: string,
  weight: number,
  sev: "critical" | "warning" | "info",
  title: string,
  failMessage: string,
  fixPrompt: string,
  diff: "copy-paste" | "moderate" | "architectural",
  time: string,
  safety: "safe" | "review" | "human-only",
): CheckFn {
  return () => ({
    id,
    station: "infrastructure" as const,
    passed: true,
    severity: sev,
    confidence: 0,
    title,
    failMessage,
    evidence: "",
    fixPrompt,
    fixDifficulty: diff,
    fixTime: time,
    autoFixSafety: safety,
    scoreWeight: weight,
  });
}

function pass(base: Omit<CheckResult, "passed" | "failMessage" | "evidence">): CheckResult {
  return { ...base, passed: true, failMessage: "", evidence: "" };
}

function fail(
  base: Omit<CheckResult, "passed" | "failMessage" | "evidence">,
  failMessage: string,
  evidence: string,
): CheckResult {
  return { ...base, passed: false, failMessage, evidence };
}

function norm(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

function isTestPath(path: string, testFiles: string[]): boolean {
  return testFiles.includes(path) || path.includes("__tests__") || /\.(test|spec)\./.test(path);
}

function workspaceDependencies(profile: { files: FileInfo[]; dependencies: Record<string, string> }): Record<string, string> {
  const deps: Record<string, string> = { ...profile.dependencies };
  for (const f of profile.files) {
    if (!/(^|\/)package\.json$/.test(norm(f.path)) || !f.content) continue;
    try {
      const json = JSON.parse(f.content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      Object.assign(deps, json.dependencies ?? {}, json.devDependencies ?? {});
    } catch {
      /* ignore */
    }
  }
  return deps;
}

const CI_PATHS = [
  /^\.github\/workflows\/.+\.ya?ml$/,
  /^\.gitlab-ci\.ya?ml$/,
  /^\.circleci\/config\.ya?ml$/,
  /^azure-pipelines\.ya?ml$/,
  /^bitbucket-pipelines\.ya?ml$/,
  /^\.buildkite\/.+/,
];

const ERROR_TRACKER_DEPS = [
  "@sentry/nextjs",
  "@sentry/node",
  "@sentry/react",
  "@sentry/browser",
  "@sentry/vercel-edge",
  "highlight.run",
  "@highlight-run/next",
  "@bugsnag/js",
  "bugsnag",
  "rollbar",
  "@rollbar/react",
];

const ANALYTICS_DEPS = [
  "posthog-js",
  "posthog-node",
  "mixpanel",
  "mixpanel-browser",
  "plausible-tracker",
  "@vercel/analytics",
  "@amplitude/analytics-browser",
  "fathom-client",
  "react-ga4",
];

const LOCALHOST_URL = /['"`]https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^'"`]*)?['"`]/;

// ── INFRA-001: CI pipeline ───────────────────────────────────────────────────
const checkINFRA001: CheckFn = (profile) => {
  const base = {
    id: "INFRA-001",
    station: "infrastructure" as const,
    severity: "warning" as const,
    confidence: 92,
    title: "CI pipeline configured",
    fixPrompt:
      "Add .github/workflows/ci.yml: checkout → install → typecheck → test → build. Run it on pull_request and push to main.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 20,
  };

  const hit = profile.files.find((f) => CI_PATHS.some((re) => re.test(norm(f.path))));
  if (hit) return pass({ ...base, title: `CI pipeline configured (${hit.path})` });

  return fail(base, "No CI/CD configuration found.", "No .github/workflows, .gitlab-ci.yml, or CircleCI config");
};

// ── INFRA-002: Error tracking ────────────────────────────────────────────────
const checkINFRA002: CheckFn = (profile) => {
  const base = {
    id: "INFRA-002",
    station: "infrastructure" as const,
    severity: "warning" as const,
    confidence: 88,
    title: "Error tracking configured",
    fixPrompt:
      "Add Sentry: pnpm add @sentry/nextjs && npx @sentry/wizard@latest -i nextjs. Capture unhandled errors on the server and the client.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 18,
  };

  const deps = Object.keys(workspaceDependencies(profile));
  const depHit = deps.find((d) => ERROR_TRACKER_DEPS.includes(d));
  if (depHit) return pass({ ...base, title: `Error tracking configured (${depHit})` });

  const codeHit = profile.files.find(
    (f) =>
      f.content &&
      !isTestPath(f.path, profile.testFiles) &&
      /Sentry\.init|highlight\.run\(|Bugsnag\.start|new\s+Rollbar\b/.test(f.content),
  );
  if (codeHit) return pass({ ...base, title: `Error tracking configured (${codeHit.path})` });

  return fail(
    base,
    "No error monitoring service detected (Sentry, Highlight, etc.).",
    "No @sentry/*, highlight.run, Bugsnag, or Rollbar",
  );
};

// ── INFRA-003: Analytics ─────────────────────────────────────────────────────
const checkINFRA003: CheckFn = (profile) => {
  const base = {
    id: "INFRA-003",
    station: "infrastructure" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Analytics configured",
    fixPrompt:
      "Add PostHog, Plausible, or Vercel Analytics so you can see whether anyone uses the thing you shipped. Gate it behind consent if you use cookies (see COMP-003).",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 14,
  };

  const deps = Object.keys(workspaceDependencies(profile));
  const depHit = deps.find((d) => ANALYTICS_DEPS.includes(d));
  if (depHit) return pass({ ...base, title: `Analytics configured (${depHit})` });

  const codeHit = profile.files.find(
    (f) =>
      f.content &&
      !isTestPath(f.path, profile.testFiles) &&
      /from\s+['"]@vercel\/analytics['"]|posthog\.init|mixpanel\.init|gtag\s*\(|plausible\s*\(/.test(f.content),
  );
  if (codeHit) return pass({ ...base, title: `Analytics configured (${codeHit.path})` });

  return fail(
    base,
    "No analytics (PostHog, Mixpanel, Plausible, etc.) detected.",
    "No analytics dependency or init call",
  );
};

// ── INFRA-004: Health check endpoint ─────────────────────────────────────────
function isHealthPath(f: FileInfo): boolean {
  const p = norm(f.path);
  return (
    /\/api\/(health|ping|readyz|livez)(\/|$)/.test(p) ||
    /(^|\/)(health|healthz|readyz|livez)\/route\.(ts|js|tsx)$/.test(p) ||
    /(^|\/)pages\/api\/(health|ping)\.(ts|js)$/.test(p)
  );
}

const checkINFRA004: CheckFn = (profile) => {
  const base = {
    id: "INFRA-004",
    station: "infrastructure" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "Health check endpoint present",
    fixPrompt:
      "Add app/api/health/route.ts returning { status: 'ok', timestamp: Date.now() }. Point your uptime monitor at it.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_5_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 12,
  };

  const hasServer =
    profile.framework === "nextjs" ||
    profile.apiRoutes.length > 0 ||
    profile.files.some((f) => /\/api\//.test(norm(f.path)));

  if (!hasServer) {
    return pass({ ...base, title: "Health check not required (no server routes)" });
  }

  const hit =
    profile.files.find(isHealthPath) ??
    profile.apiRoutes.find((p) => /health|ping|readyz|livez/.test(norm(p)));

  if (hit) {
    const path = typeof hit === "string" ? hit : hit.path;
    return pass({ ...base, title: `Health check endpoint present (${path})` });
  }

  return fail(base, "No /api/health or /api/ping route found.", "No health/ping/readyz route");
};

// ── INFRA-005: No hardcoded localhost URLs ───────────────────────────────────
const checkINFRA005: CheckFn = (profile) => {
  const base = {
    id: "INFRA-005",
    station: "infrastructure" as const,
    severity: "warning" as const,
    confidence: 84,
    title: "No hardcoded localhost URLs",
    fixPrompt:
      "Replace localhost URLs with environment variables: process.env.NEXT_PUBLIC_APP_URL. A process.env.X ?? 'http://localhost:3000' fallback is fine.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_5_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 11,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    if (isTestPath(file.path, profile.testFiles)) continue;
    if (/\.env/.test(file.path) || file.path.endsWith(".md")) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const assigned =
        /^\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*/.test(line) && LOCALHOST_URL.test(line);
      const fetched = /(?:fetch|axios|got)\s*\(\s*/.test(line) && LOCALHOST_URL.test(line);
      if (!assigned && !fetched) continue;
      // Default fallback next to process.env is the accepted local-dev pattern.
      if (/process\.env/.test(line) || /\?\?/.test(line)) continue;
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;
      hits.push(`${file.path}:${i + 1}`);
      break;
    }
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    "localhost or 127.0.0.1 found in non-test source files.",
    hits.slice(0, 4).join("; "),
  );
};

// ── INFRA-008: Dependabot / Renovate ─────────────────────────────────────────
const checkINFRA008: CheckFn = (profile) => {
  const base = {
    id: "INFRA-008",
    station: "infrastructure" as const,
    severity: "info" as const,
    confidence: 90,
    title: "Dependency updates automated",
    fixPrompt:
      "Add .github/dependabot.yml with package-ecosystem: npm, schedule: weekly. Or add renovate.json.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_5_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 6,
  };

  const hit = profile.files.find((f) => {
    const p = norm(f.path);
    return (
      p === ".github/dependabot.yml" ||
      p === ".github/dependabot.yaml" ||
      p === "renovate.json" ||
      p === "renovate.json5" ||
      p === ".renovaterc" ||
      p === ".renovaterc.json"
    );
  });
  if (hit) return pass({ ...base, title: `Dependency updates automated (${hit.path})` });

  return fail(base, "No Dependabot or Renovate config found.", "No .github/dependabot.yml or renovate.json");
};

export const infrastructureChecks: CheckFn[] = [
  checkINFRA001,
  checkINFRA002,
  checkINFRA003,
  checkINFRA004,
  checkINFRA005,
  stub("INFRA-006", 10, "warning", "Environment separation", "No separation between development and production configurations.", "Use .env.local for dev overrides. Never point your dev app at a production database.", "moderate", FIX_TIME_30_MIN, "review"),
  stub("INFRA-007", 9, "info", "Deployment preview configured", "No preview deployment configured for pull requests.", "Enable Vercel preview deployments or GitHub Actions PR previews for faster review cycles.", "moderate", FIX_TIME_1_HR, "review"),
  checkINFRA008,
];
