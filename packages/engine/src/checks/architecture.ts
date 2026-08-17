import type { CheckResult, CheckFn, FileInfo } from "./types";

const COMPONENT_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte"]);
const FIX_TIME_30_MIN = "30 min";
const FIX_TIME_1_HR = "1 hr";
const FIX_TIME_2_HRS = "2 hrs";
const FIX_TIME_4_HRS = "4 hrs";
const GOD_LINES = 500;

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
    station: "architecture" as const,
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
  return path.replace(/\\/g, "/");
}

function isTestPath(path: string, testFiles: string[]): boolean {
  return testFiles.includes(path) || path.includes("__tests__") || /\.(test|spec)\./.test(path);
}

function isClientComponent(file: FileInfo): boolean {
  const head = file.content.slice(0, 400);
  return /['"]use client['"]/.test(head);
}

const DB_IN_COMPONENT =
  /\b(createClient|createBrowserClient|createBrowserSupabaseClient|prisma)\b|from\s+['"]@supabase\/|from\s+['"]@prisma\/|\.from\s*\(\s*['"][\w]+['"]\s*\)/;

// ── ARCH-001: Business logic not in client components ────────────────────────
const checkARCH001: CheckFn = (profile) => {
  const base = {
    id: "ARCH-001",
    station: "architecture" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Business logic not in components",
    fixPrompt:
      "Keep database clients and writes out of 'use client' files. Fetch in a Server Component, Server Action, or a service module, then pass data down.",
    fixDifficulty: "architectural" as const,
    fixTime: FIX_TIME_2_HRS,
    autoFixSafety: "review" as const,
    scoreWeight: 20,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!COMPONENT_EXTS.has(file.ext) || !file.content) continue;
    if (isTestPath(file.path, profile.testFiles)) continue;
    if (!isClientComponent(file)) continue;
    if (DB_IN_COMPONENT.test(file.content)) hits.push(file.path);
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    "Database queries or API clients found directly inside client React components.",
    hits.slice(0, 4).join("; "),
  );
};

// ── ARCH-002: No god components ──────────────────────────────────────────────
const checkARCH002: CheckFn = (profile) => {
  const base = {
    id: "ARCH-002",
    station: "architecture" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "No god components (>500 lines)",
    fixPrompt:
      "Split god components into focused sub-components using the single-responsibility principle. A page that is 500+ lines is doing too many jobs.",
    fixDifficulty: "architectural" as const,
    fixTime: FIX_TIME_2_HRS,
    autoFixSafety: "review" as const,
    scoreWeight: 16,
  };

  const gods = profile.files.filter((f) => {
    if (!COMPONENT_EXTS.has(f.ext)) return false;
    if (isTestPath(f.path, profile.testFiles)) return false;
    return f.lines > GOD_LINES;
  });

  if (gods.length === 0) return pass(base);
  return fail(
    base,
    "Components over 500 lines with multiple responsibilities.",
    gods
      .slice(0, 4)
      .map((f) => `${f.path} (${f.lines} lines)`)
      .join("; "),
  );
};

// ── ARCH-004: Service layer present ──────────────────────────────────────────
const INTEGRATION_IMPORT =
  /from\s+['"](stripe|resend|@supabase\/|@prisma\/|drizzle-orm|posthog|@sentry\/)/;

const checkARCH004: CheckFn = (profile) => {
  const base = {
    id: "ARCH-004",
    station: "architecture" as const,
    severity: "warning" as const,
    confidence: 78,
    title: "Service layer present",
    fixPrompt:
      "Create a services/ directory (or lib/ modules) so each external integration — db, email, stripe — has one wrapper. Components should not import the SDK directly.",
    fixDifficulty: "architectural" as const,
    fixTime: FIX_TIME_2_HRS,
    autoFixSafety: "review" as const,
    scoreWeight: 12,
  };

  const workspaceHasDbOrPay = profile.files.some((f) => {
    if (!/(^|\/)package\.json$/.test(norm(f.path)) || !f.content) return false;
    return /@supabase\/|["']prisma["']|["']drizzle-orm["']|["']stripe["']|["']resend["']/.test(f.content);
  });
  if (!profile.hasDatabase && !profile.hasPayments && !workspaceHasDbOrPay) {
    return pass({ ...base, title: "Service layer not required (no db or payments)" });
  }

  const dedicated = profile.files.filter((f) => {
    const p = norm(f.path);
    return /(^|\/)(services|repositories|repos)\//.test(p) || /\.(service|repository)\.(ts|js)$/.test(p);
  });
  if (dedicated.length > 0) {
    return pass({ ...base, title: `Service layer present (${dedicated[0]?.path})` });
  }

  const libWrappers = profile.files.filter((f) => {
    const p = norm(f.path);
    if (!/(^|\/)lib\//.test(p)) return false;
    if (!f.content) return false;
    if (isTestPath(f.path, profile.testFiles)) return false;
    return INTEGRATION_IMPORT.test(f.content) && /export\s+/.test(f.content);
  });
  if (libWrappers.length >= 2) {
    return pass({
      ...base,
      title: `Service layer present (${libWrappers.length} lib/ integration wrappers)`,
    });
  }

  return fail(
    base,
    "No dedicated service/repository layer for external calls.",
    "No services/, repositories/, or lib/ wrappers around stripe/db/email",
  );
};

// ── ARCH-006: Environment separation ─────────────────────────────────────────
const checkARCH006: CheckFn = (profile) => {
  const base = {
    id: "ARCH-006",
    station: "architecture" as const,
    severity: "warning" as const,
    confidence: 82,
    title: "Environment separation",
    fixPrompt:
      "Keep .env.example committed with empty values, use .env.local for secrets, and never point the local app at a production database.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 10,
  };

  const names = profile.files.map((f) => norm(f.path).split("/").pop() ?? "");
  const hasExample = Boolean(profile.envExample) || names.some((n) => /^\.env\.(example|sample|template)$/.test(n));
  const hasLocal = names.some((n) => n === ".env.local" || n === ".env.development" || n === ".env.production");

  const usesEnv = profile.files.some(
    (f) => f.content && /process\.env\./.test(f.content) && !isTestPath(f.path, profile.testFiles),
  );

  if (!usesEnv) {
    return pass({ ...base, title: "Environment separation not required (no process.env usage)" });
  }

  if (hasExample || hasLocal) return pass(base);

  return fail(
    base,
    "No separation between development and production environment configs.",
    "process.env is used but there is no .env.example or .env.local / .env.development",
  );
};

// ── ARCH-008: Shared UI component library ────────────────────────────────────
const checkARCH008: CheckFn = (profile) => {
  const base = {
    id: "ARCH-008",
    station: "architecture" as const,
    severity: "info" as const,
    confidence: 85,
    title: "Shared UI component library",
    fixPrompt:
      "Move reusable components to packages/ui or a components/ui folder (shadcn-style) so pages import one design system instead of copy-pasted markup.",
    fixDifficulty: "architectural" as const,
    fixTime: FIX_TIME_4_HRS,
    autoFixSafety: "review" as const,
    scoreWeight: 5,
  };

  const uiFiles = profile.files.filter((f) => {
    const p = norm(f.path);
    return (
      /(^|\/)packages\/ui\//.test(p) ||
      /(^|\/)components\/ui\//.test(p) ||
      /(^|\/)src\/components\/ui\//.test(p)
    );
  });

  if (uiFiles.length > 0) {
    return pass({ ...base, title: `Shared UI component library (${uiFiles.length} file(s))` });
  }

  const componentCount = profile.components.length;
  if (componentCount < 5) {
    return pass({ ...base, title: "Shared UI library not required (few components)" });
  }

  return fail(
    base,
    "UI components scattered without a centralised component library.",
    `${componentCount} component files and no packages/ui or components/ui`,
  );
};

export const architectureChecks: CheckFn[] = [
  checkARCH001,
  checkARCH002,
  stub("ARCH-003", 14, "warning", "No excessive prop drilling (>3 levels)", "Props passed through more than 3 component levels.", "Use React Context, Zustand, or server-side data fetching to avoid prop drilling.", "architectural", FIX_TIME_2_HRS, "review"),
  checkARCH004,
  stub("ARCH-005", 11, "warning", "No circular dependencies", "Circular import chains detected.", "Resolve circular deps by extracting shared types to a separate module.", "architectural", FIX_TIME_2_HRS, "review"),
  checkARCH006,
  stub("ARCH-007", 9, "info", "Feature-based folder structure", "Files organised by type rather than by feature.", "Reorganise to feature folders: features/auth/, features/billing/, features/dashboard/.", "architectural", FIX_TIME_4_HRS, "review"),
  checkARCH008,
  stub("ARCH-009", 3, "info", "API client abstraction", "Direct fetch() calls scattered across components.", "Create a single API client module (lib/api.ts) that all components use.", "moderate", FIX_TIME_1_HR, "review"),
];
