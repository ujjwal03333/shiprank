import { readFile, readdir } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import type { ProjectContext } from "../profiler/types";
import type { CheckResult, StationResult } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".nuxt", ".svelte-kit",
  "dist", "build", ".git", ".turbo", "coverage", ".vercel",
]);

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

async function walkFiles(dir: string, maxDepth = 5, depth = 0): Promise<string[]> {
  if (depth > maxDepth) return [];
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...(await walkFiles(full, maxDepth, depth + 1)));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

// ── SEC-001: Exposed secrets in source ───────────────────────────────────────
// Keys that should NEVER appear in committed source code.
// SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are intentionally
// excluded — they are public by design and must not be flagged.
const CRITICAL_SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ[A-Za-z0-9_-]{10,}/,
    label: "SUPABASE_SERVICE_ROLE_KEY (service role — full DB access)",
  },
  {
    pattern: /sk-[A-Za-z0-9]{32,}/,
    label: "OpenAI secret key (sk-...)",
  },
  {
    pattern: /STRIPE_SECRET_KEY\s*=\s*['"]?sk_(live|test)_[A-Za-z0-9]{24,}/,
    label: "Stripe secret key",
  },
  {
    pattern: /AWS_SECRET_ACCESS_KEY\s*=\s*['"]?[A-Za-z0-9/+=]{40}/,
    label: "AWS secret access key",
  },
  {
    pattern: /GITHUB_TOKEN\s*=\s*['"]?gh[pousr]_[A-Za-z0-9]{36,}/,
    label: "GitHub personal access token",
  },
  {
    pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
    label: "Private key in source",
  },
];

async function checkSEC001(root: string): Promise<CheckResult> {
  const allFiles = await walkFiles(root);
  // Check source files AND any .env* files that are NOT .env.example / .env.sample
  const filesToScan = allFiles.filter((f) => {
    const name = basename(f);
    const ext = extname(f);
    if (SOURCE_EXTS.has(ext)) return true;
    if (/^\.env/.test(name) && !/\.(example|sample|template)$/.test(name)) return true;
    return false;
  });

  const hits: string[] = [];
  for (const file of filesToScan) {
    const text = await readText(file);
    for (const { pattern, label } of CRITICAL_SECRET_PATTERNS) {
      if (pattern.test(text)) {
        const rel = file.replace(root + "/", "");
        hits.push(`${label} in ${rel}`);
      }
    }
  }

  if (hits.length === 0) {
    return {
      id: "SEC-001",
      title: "No hardcoded secrets in source",
      severity: "critical",
      passed: true,
      detail: "No critical secret patterns found in committed source files.",
      remediation: "",
    };
  }

  return {
    id: "SEC-001",
    title: "Hardcoded secrets in source",
    severity: "critical",
    passed: false,
    detail: `Found ${hits.length} secret(s): ${hits.slice(0, 3).join("; ")}`,
    remediation:
      "Move secrets to environment variables, rotate any exposed keys immediately, add .env to .gitignore.",
  };
}

// ── SEC-002: .env committed to git ───────────────────────────────────────────
async function checkSEC002(root: string): Promise<CheckResult> {
  const gitignorePath = join(root, ".gitignore");
  const text = await readText(gitignorePath);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  // Accepts: `.env`, `.env*`, `.env.local`, `*.env`, `.env.*`
  const coversEnv = lines.some((l) =>
    /^\.env(\*|\.\*|\.local|\.development|\.production)?$/.test(l) ||
    l === "*.env",
  );

  if (coversEnv) {
    return {
      id: "SEC-002",
      title: ".env protected by .gitignore",
      severity: "high",
      passed: true,
      detail: ".gitignore contains a rule that covers .env files.",
      remediation: "",
    };
  }

  if (!text) {
    return {
      id: "SEC-002",
      title: ".gitignore missing",
      severity: "high",
      passed: false,
      detail: "No .gitignore found at project root.",
      remediation: "Create a .gitignore and add .env, .env.local, .env.*.local",
    };
  }

  return {
    id: "SEC-002",
    title: ".env not protected by .gitignore",
    severity: "high",
    passed: false,
    detail: ".gitignore exists but does not cover .env files.",
    remediation: 'Add ".env*" or ".env.local" entries to .gitignore.',
  };
}

// ── SEC-003: NEXT_PUBLIC_ leaking secrets ────────────────────────────────────
// Flags env vars prefixed NEXT_PUBLIC_ (exposed to the browser) whose names
// suggest they are secrets. Explicitly EXCLUDES NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY which are public by design.
const SAFE_NEXT_PUBLIC = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "NEXT_PUBLIC_SITE_URL",
]);

const SECRET_KEYWORDS = ["secret", "private", "service_role", "api_key", "token", "password"];

async function checkSEC003(root: string): Promise<CheckResult> {
  const allFiles = await walkFiles(root);
  const envFiles = allFiles.filter((f) => {
    const name = basename(f);
    return /^\.env/.test(name);
  });

  const hits: string[] = [];
  for (const file of envFiles) {
    const text = await readText(file);
    for (const line of text.split("\n")) {
      const key = line.split("=")[0]?.trim();
      if (!key || !key.startsWith("NEXT_PUBLIC_")) continue;
      if (SAFE_NEXT_PUBLIC.has(key)) continue;
      const lower = key.toLowerCase();
      if (SECRET_KEYWORDS.some((kw) => lower.includes(kw))) {
        hits.push(key);
      }
    }
  }

  if (hits.length === 0) {
    return {
      id: "SEC-003",
      title: "No secrets exposed via NEXT_PUBLIC_",
      severity: "high",
      passed: true,
      detail: "No suspicious NEXT_PUBLIC_ variables found in env files.",
      remediation: "",
    };
  }

  return {
    id: "SEC-003",
    title: "Secret keys exposed via NEXT_PUBLIC_",
    severity: "high",
    passed: false,
    detail: `NEXT_PUBLIC_ variables with secret-sounding names: ${hits.join(", ")}`,
    remediation:
      "Server-side secrets must never use the NEXT_PUBLIC_ prefix. Move them to server-only env vars.",
  };
}

// ── SEC-004: Dependency vulnerability proxy ───────────────────────────────────
// We can't run npm audit here, so we check for known high-risk outdated ranges.
const KNOWN_VULN_RANGES: Array<{ pkg: string; badRange: RegExp; reason: string }> = [
  { pkg: "next", badRange: /^(9\.|10\.|11\.|12\.|13\.0\.)/, reason: "Next.js <13.1 has multiple CVEs" },
  { pkg: "lodash", badRange: /^[34]\./, reason: "lodash <4.17.21 prototype pollution (CVE-2020-8203)" },
  { pkg: "axios", badRange: /^0\.(1[0-8]|[0-9])\./, reason: "axios <0.21.2 SSRF (CVE-2020-28168)" },
  { pkg: "jsonwebtoken", badRange: /^([0-7]\.|8\.[0-4]\.)/, reason: "jsonwebtoken <8.5.1 signature bypass" },
  { pkg: "express", badRange: /^[1-3]\./, reason: "express 1-3 EOL, multiple known CVEs" },
];

async function checkSEC004(root: string): Promise<CheckResult> {
  let pkg: Record<string, unknown>;
  try {
    const text = await readText(join(root, "package.json"));
    pkg = JSON.parse(text);
  } catch {
    return {
      id: "SEC-004",
      title: "Dependency audit skipped (no package.json)",
      severity: "medium",
      passed: true,
      detail: "No package.json found to audit.",
      remediation: "",
    };
  }

  const allDeps: Record<string, string> = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  const hits: string[] = [];
  for (const { pkg: name, badRange, reason } of KNOWN_VULN_RANGES) {
    const version = allDeps[name];
    if (version && badRange.test(version.replace(/^[\^~>=<]/, ""))) {
      hits.push(`${name}@${version}: ${reason}`);
    }
  }

  if (hits.length === 0) {
    return {
      id: "SEC-004",
      title: "No known vulnerable dependency ranges",
      severity: "medium",
      passed: true,
      detail: "No packages matched known vulnerable version ranges. Run `npm audit` for a full scan.",
      remediation: "",
    };
  }

  return {
    id: "SEC-004",
    title: "Potentially vulnerable dependencies",
    severity: "medium",
    passed: false,
    detail: hits.join("; "),
    remediation: "Upgrade flagged packages. Run `npm audit fix` for a comprehensive check.",
  };
}

// ── SEC-005: CSP / security headers ──────────────────────────────────────────
const CSP_PATTERNS = [
  /Content-Security-Policy/i,
  /contentSecurityPolicy/,
  /X-Content-Type-Options/i,
  /X-Frame-Options/i,
  /headers\s*\(\s*\)/,          // next.config headers()
  /securityHeaders/i,
];

async function checkSEC005(root: string): Promise<CheckResult> {
  const candidates = [
    join(root, "next.config.ts"),
    join(root, "next.config.js"),
    join(root, "next.config.mjs"),
    join(root, "vercel.json"),
    join(root, "netlify.toml"),
    join(root, "public", "_headers"),
    join(root, "middleware.ts"),
    join(root, "middleware.js"),
  ];

  for (const file of candidates) {
    const text = await readText(file);
    if (text && CSP_PATTERNS.some((p) => p.test(text))) {
      return {
        id: "SEC-005",
        title: "Security headers configured",
        severity: "medium",
        passed: true,
        detail: `Security header configuration found in ${basename(file)}.`,
        remediation: "",
      };
    }
  }

  return {
    id: "SEC-005",
    title: "No security headers found",
    severity: "medium",
    passed: false,
    detail: "No Content-Security-Policy or security headers detected in next.config, vercel.json, or middleware.",
    remediation:
      "Add a headers() function to next.config.ts with CSP, X-Content-Type-Options, and X-Frame-Options.",
  };
}

// ── SEC-006: dangerouslySetInnerHTML / eval() in source ───────────────────────
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/, label: "dangerouslySetInnerHTML" },
  { pattern: /\beval\s*\(/, label: "eval()" },
  { pattern: /new\s+Function\s*\(/, label: "new Function()" },
  { pattern: /document\.write\s*\(/, label: "document.write()" },
  { pattern: /innerHTML\s*=\s*[^=]/, label: "innerHTML assignment" },
];

async function checkSEC006(root: string): Promise<CheckResult> {
  const allFiles = await walkFiles(root);
  const sourceFiles = allFiles.filter((f) => SOURCE_EXTS.has(extname(f)));

  const hits: string[] = [];
  for (const file of sourceFiles) {
    const text = await readText(file);
    for (const { pattern, label } of DANGEROUS_PATTERNS) {
      if (pattern.test(text)) {
        const rel = file.replace(root + "/", "");
        hits.push(`${label} in ${rel}`);
      }
    }
  }

  if (hits.length === 0) {
    return {
      id: "SEC-006",
      title: "No dangerous DOM injection patterns",
      severity: "high",
      passed: true,
      detail: "No dangerouslySetInnerHTML, eval(), or innerHTML assignments found.",
      remediation: "",
    };
  }

  return {
    id: "SEC-006",
    title: "Dangerous DOM injection patterns found",
    severity: "high",
    passed: false,
    detail: `${hits.length} instance(s): ${hits.slice(0, 3).join("; ")}`,
    remediation:
      "Replace dangerouslySetInnerHTML with DOMPurify sanitization. Avoid eval() and new Function().",
  };
}

// ── SEC-007: RLS enabled on Supabase tables ───────────────────────────────────
const RLS_DISABLE_PATTERN = /alter\s+table\s+\S+\s+disable\s+row\s+level\s+security/i;
const RLS_ENABLE_PATTERN = /alter\s+table\s+\S+\s+enable\s+row\s+level\s+security/i;
const POLICY_PATTERN = /create\s+policy/i;

async function checkSEC007(root: string, ctx: ProjectContext): Promise<CheckResult> {
  if (!ctx.hasDatabase) {
    return {
      id: "SEC-007",
      title: "RLS check skipped (no database detected)",
      severity: "info",
      passed: true,
      detail: "Project does not appear to use a database.",
      remediation: "",
    };
  }

  const allFiles = await walkFiles(root);
  const sqlFiles = allFiles.filter((f) => f.endsWith(".sql"));

  if (sqlFiles.length === 0) {
    return {
      id: "SEC-007",
      title: "No SQL migration files found",
      severity: "medium",
      passed: false,
      detail: "Database detected but no SQL migration files found to verify RLS.",
      remediation: "Add SQL migrations and enable RLS on all user-data tables with appropriate policies.",
    };
  }

  let hasDisable = false;
  let hasEnable = false;
  let hasPolicies = false;

  for (const file of sqlFiles) {
    const text = await readText(file);
    if (RLS_DISABLE_PATTERN.test(text)) hasDisable = true;
    if (RLS_ENABLE_PATTERN.test(text)) hasEnable = true;
    if (POLICY_PATTERN.test(text)) hasPolicies = true;
  }

  if (hasDisable) {
    return {
      id: "SEC-007",
      title: "RLS explicitly disabled on a table",
      severity: "critical",
      passed: false,
      detail: "Found DISABLE ROW LEVEL SECURITY in migration files.",
      remediation: "Remove DISABLE ROW LEVEL SECURITY. Every user-data table must have RLS enabled with policies.",
    };
  }

  if (hasEnable && hasPolicies) {
    return {
      id: "SEC-007",
      title: "RLS enabled with policies",
      severity: "critical",
      passed: true,
      detail: "Migrations enable RLS and define policies.",
      remediation: "",
    };
  }

  if (hasEnable && !hasPolicies) {
    return {
      id: "SEC-007",
      title: "RLS enabled but no policies found",
      severity: "critical",
      passed: false,
      detail: "Tables have RLS enabled but no CREATE POLICY statements found — all rows will be inaccessible.",
      remediation: "Add SELECT, INSERT, UPDATE, DELETE policies for authenticated users.",
    };
  }

  return {
    id: "SEC-007",
    title: "RLS not explicitly enabled in migrations",
    severity: "high",
    passed: false,
    detail: "No ENABLE ROW LEVEL SECURITY statements found in SQL files.",
    remediation: "Add ENABLE ROW LEVEL SECURITY to every user-data table and define appropriate policies.",
  };
}

// ── SEC-008: Auth middleware protecting private routes ────────────────────────
const MIDDLEWARE_AUTH_PATTERNS = [
  /createMiddlewareClient|createServerClient|getSession|auth\(\)/,
  /clerkMiddleware|authMiddleware|withClerkMiddleware/,
  /NextResponse\.redirect.*login/i,
  /matcher.*\[/,
];

async function checkSEC008(root: string, ctx: ProjectContext): Promise<CheckResult> {
  if (!ctx.hasAuth) {
    return {
      id: "SEC-008",
      title: "Auth middleware check skipped (no auth detected)",
      severity: "info",
      passed: true,
      detail: "Project does not appear to use authentication.",
      remediation: "",
    };
  }

  const middlewareFiles = [
    join(root, "middleware.ts"),
    join(root, "middleware.js"),
    join(root, "src", "middleware.ts"),
    join(root, "src", "middleware.js"),
  ];

  for (const file of middlewareFiles) {
    const text = await readText(file);
    if (text && MIDDLEWARE_AUTH_PATTERNS.some((p) => p.test(text))) {
      return {
        id: "SEC-008",
        title: "Auth middleware protecting routes",
        severity: "high",
        passed: true,
        detail: `Auth middleware found at ${basename(file)} with route protection.`,
        remediation: "",
      };
    }
    if (text) {
      return {
        id: "SEC-008",
        title: "Middleware exists but no auth protection detected",
        severity: "high",
        passed: false,
        detail: `middleware.ts found but no auth check patterns detected.`,
        remediation: "Add session/auth checks in middleware.ts with a matcher for protected routes.",
      };
    }
  }

  return {
    id: "SEC-008",
    title: "No auth middleware found",
    severity: "high",
    passed: false,
    detail: "Auth is used but no middleware.ts was found to protect routes.",
    remediation: "Create middleware.ts with session validation and redirect unauthenticated users to /login.",
  };
}

// ── SEC-009: CORS wildcard in API routes ──────────────────────────────────────
const CORS_WILDCARD = /Access-Control-Allow-Origin['":\s]+\*/;
const CORS_CONFIGURED = /Access-Control-Allow-Origin/;

async function checkSEC009(root: string): Promise<CheckResult> {
  const allFiles = await walkFiles(root);
  const apiFiles = allFiles.filter((f) => {
    const rel = f.replace(root + "/", "");
    return (
      SOURCE_EXTS.has(extname(f)) &&
      (rel.includes("/api/") || rel.includes("/routes/") || rel.match(/route\.(ts|js)$/))
    );
  });

  const wildcardHits: string[] = [];
  for (const file of apiFiles) {
    const text = await readText(file);
    if (CORS_WILDCARD.test(text)) {
      wildcardHits.push(file.replace(root + "/", ""));
    }
  }

  if (wildcardHits.length > 0) {
    return {
      id: "SEC-009",
      title: "CORS wildcard (*) in API routes",
      severity: "medium",
      passed: false,
      detail: `Wildcard CORS found in: ${wildcardHits.slice(0, 3).join(", ")}`,
      remediation:
        "Replace Access-Control-Allow-Origin: * with an explicit allow-list of trusted origins.",
    };
  }

  return {
    id: "SEC-009",
    title: "No CORS wildcard in API routes",
    severity: "medium",
    passed: true,
    detail: "No wildcard CORS headers found in API routes.",
    remediation: "",
  };
}

// ── SEC-010: Rate limiting on API routes ─────────────────────────────────────
const RATE_LIMIT_PATTERNS = [
  /upstash\/ratelimit/,
  /rate.?limit/i,
  /ratelimit/i,
  /@upstash\/redis/,
  /limiter/i,
  /throttle/i,
];

async function checkSEC010(root: string, ctx: ProjectContext): Promise<CheckResult> {
  if (!ctx.hasAPI) {
    return {
      id: "SEC-010",
      title: "Rate limiting check skipped (no API routes)",
      severity: "info",
      passed: true,
      detail: "No API routes detected.",
      remediation: "",
    };
  }

  let pkg: Record<string, unknown> = {};
  try {
    pkg = JSON.parse(await readText(join(root, "package.json")));
  } catch {
    // ignore
  }

  const allDeps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  const hasDep = Object.keys(allDeps).some((d) =>
    RATE_LIMIT_PATTERNS.some((p) => p.test(d)),
  );

  if (hasDep) {
    return {
      id: "SEC-010",
      title: "Rate limiting dependency found",
      severity: "medium",
      passed: true,
      detail: `Rate limiting package detected in dependencies.`,
      remediation: "",
    };
  }

  const allFiles = await walkFiles(root);
  const apiFiles = allFiles.filter((f) => {
    const rel = f.replace(root + "/", "");
    return SOURCE_EXTS.has(extname(f)) && (rel.includes("/api/") || rel.match(/route\.(ts|js)$/));
  });

  for (const file of apiFiles) {
    const text = await readText(file);
    if (RATE_LIMIT_PATTERNS.some((p) => p.test(text))) {
      return {
        id: "SEC-010",
        title: "Rate limiting implemented in API routes",
        severity: "medium",
        passed: true,
        detail: `Rate limiting logic found in ${basename(file)}.`,
        remediation: "",
      };
    }
  }

  return {
    id: "SEC-010",
    title: "No rate limiting on API routes",
    severity: "medium",
    passed: false,
    detail: "API routes found but no rate limiting package or logic detected.",
    remediation:
      "Add rate limiting with @upstash/ratelimit or similar. Public API routes are vulnerable to abuse without it.",
  };
}

// ── SEC-011: Input validation library ────────────────────────────────────────
const VALIDATION_DEPS = ["zod", "yup", "joi", "valibot", "arktype", "superstruct", "class-validator"];

async function checkSEC011(root: string): Promise<CheckResult> {
  let pkg: Record<string, unknown> = {};
  try {
    pkg = JSON.parse(await readText(join(root, "package.json")));
  } catch {
    return {
      id: "SEC-011",
      title: "Input validation check skipped",
      severity: "medium",
      passed: true,
      detail: "No package.json found.",
      remediation: "",
    };
  }

  const allDeps = {
    ...((pkg.dependencies as Record<string, string>) ?? {}),
    ...((pkg.devDependencies as Record<string, string>) ?? {}),
  };

  const found = VALIDATION_DEPS.find((d) => d in allDeps);
  if (found) {
    return {
      id: "SEC-011",
      title: "Input validation library present",
      severity: "medium",
      passed: true,
      detail: `${found} found in dependencies.`,
      remediation: "",
    };
  }

  return {
    id: "SEC-011",
    title: "No input validation library",
    severity: "medium",
    passed: false,
    detail: "No validation library (zod, yup, joi, valibot, etc.) found.",
    remediation:
      "Add zod (or similar) and validate all external input — API request bodies, query params, form data.",
  };
}

// ── SEC-012: TypeScript strict mode ──────────────────────────────────────────
async function checkSEC012(root: string, ctx: ProjectContext): Promise<CheckResult> {
  if (!ctx.hasTypeScript) {
    return {
      id: "SEC-012",
      title: "TypeScript not used",
      severity: "low",
      passed: false,
      detail: "Project does not use TypeScript. Type safety is a security property.",
      remediation: "Migrate to TypeScript with strict mode to catch type-related bugs at compile time.",
    };
  }

  const tsconfigPaths = [
    join(root, "tsconfig.json"),
    join(root, "tsconfig.base.json"),
  ];

  for (const path of tsconfigPaths) {
    const text = await readText(path);
    if (!text) continue;
    try {
      // Strip comments before parsing
      const stripped = text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const tsconfig = JSON.parse(stripped) as Record<string, unknown>;
      const co = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>;
      if (co.strict === true) {
        return {
          id: "SEC-012",
          title: "TypeScript strict mode enabled",
          severity: "low",
          passed: true,
          detail: `strict: true in ${basename(path)}.`,
          remediation: "",
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  return {
    id: "SEC-012",
    title: "TypeScript strict mode not enabled",
    severity: "low",
    passed: false,
    detail: 'TypeScript found but "strict": true not set in tsconfig.json.',
    remediation: 'Set "strict": true in compilerOptions to enable all strictness checks.',
  };
}

// ── Severity weights ──────────────────────────────────────────────────────────
// info checks don't affect score; they're always treated as passed.
const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
  info: 0,
};

// ── Main entry point ──────────────────────────────────────────────────────────
export async function runSecurityStation(
  root: string,
  ctx: ProjectContext,
): Promise<StationResult> {
  const checks = await Promise.all([
    checkSEC001(root),
    checkSEC002(root),
    checkSEC003(root),
    checkSEC004(root),
    checkSEC005(root),
    checkSEC006(root),
    checkSEC007(root, ctx),
    checkSEC008(root, ctx),
    checkSEC009(root),
    checkSEC010(root, ctx),
    checkSEC011(root),
    checkSEC012(root, ctx),
  ]);

  // Severity multipliers based on context
  const criticalMultiplier =
    ctx.hasDatabase || ctx.hasAuth ? 1.5 : 1.0;

  let earned = 0;
  let max = 0;

  for (const check of checks) {
    const base = SEVERITY_WEIGHT[check.severity] ?? 0;
    if (base === 0) continue; // info — skip scoring

    const weight =
      check.severity === "critical"
        ? base * criticalMultiplier
        : base;

    max += weight;
    if (check.passed) earned += weight;
  }

  const score = max > 0 ? Math.round((earned / max) * 100) : 100;

  return {
    stationId: "security",
    stationName: "Security",
    score,
    maxScore: 100,
    checks,
  };
}
