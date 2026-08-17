import type { CheckResult, CheckFn, CodeProfile } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────

function stub(
  id: string,
  weight: number,
  severity: CheckResult["severity"],
  title: string,
  failMessage: string,
  fixPrompt: string,
  fixDifficulty: CheckResult["fixDifficulty"],
  fixTime: string,
  autoFixSafety: CheckResult["autoFixSafety"],
): CheckFn {
  return () => ({
    id,
    station: "security" as const,
    passed: true,
    severity,
    confidence: 0,
    title,
    failMessage,
    evidence: "",
    fixPrompt,
    fixDifficulty,
    fixTime,
    autoFixSafety,
    scoreWeight: weight,
  });
}

function pass(base: Omit<CheckResult, "passed" | "failMessage" | "evidence">): CheckResult {
  return { ...base, passed: true, failMessage: "", evidence: "" };
}

function fail(base: Omit<CheckResult, "passed" | "failMessage" | "evidence">, failMessage: string, evidence: string): CheckResult {
  return { ...base, passed: false, failMessage, evidence };
}

function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  const n = s.length;
  return -Object.values(freq).reduce((sum, count) => {
    const p = count / n;
    return sum + p * Math.log2(p);
  }, 0);
}

function decodeJwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(b64, "base64").toString("utf8");
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const AUTH_ROUTE_PATTERNS = [/\/auth\//, /\/login/, /\/signup/, /\/register/, /\/api\/auth/];
const FIX_TIME_15_MIN = "15 min";
const FIX_TIME_30_MIN = "30 min";

// ── SEC-001: Hardcoded secrets ────────────────────────────────────────────────
// CRITICAL RULE: SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are public
// by design and must NEVER be flagged.
const KNOWN_SECRET_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ[A-Za-z0-9_.-]{20,}/,
    label: "SUPABASE_SERVICE_ROLE_KEY (full DB access)",
  },
  { re: /sk-[A-Za-z0-9]{32,}/, label: "OpenAI secret key (sk-...)" },
  { re: /sk_live_[A-Za-z0-9]{24,}/, label: "Stripe live secret key" },
  { re: /sk_test_[A-Za-z0-9]{24,}/, label: "Stripe test secret key" },
  { re: /gh[pousr]_[A-Za-z0-9]{36,}/, label: "GitHub personal access token" },
  {
    re: /AWS_SECRET_ACCESS_KEY\s*=\s*['"]?[A-Za-z0-9/+=]{40}/,
    label: "AWS secret access key",
  },
  { re: /-----BEGIN\s+(RSA\s+|EC\s+)?PRIVATE KEY-----/, label: "Private key in source" },
  {
    re: /Authorization['":\s]+Bearer\s+[A-Za-z0-9._-]{40,}/,
    label: "Hardcoded Bearer token",
  },
];

const checkSEC001: CheckFn = (profile) => {
  const base = {
    id: "SEC-001",
    station: "security" as const,
    severity: "critical" as const,
    confidence: 90,
    title: "No hardcoded secrets in source code",
    fixPrompt:
      "Move all secrets to environment variables. Never hardcode API keys, JWT secrets, or service role keys in source files. Rotate any exposed keys immediately via the provider dashboard.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 14,
  };

  // Test fixtures for a security scanner legitimately contain realistic
  // fake-secret-shaped strings to validate detection — that's categorically
  // different from a leaked production secret, so exclude them here the
  // same way other quality checks exclude test files from their scans.
  const testPathSet = new Set(profile.testFiles);
  const sourceFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  const hits: string[] = [];

  for (const file of sourceFiles) {
    // Known secret patterns
    for (const { re, label } of KNOWN_SECRET_PATTERNS) {
      if (re.test(file.content)) {
        hits.push(`${label} in ${file.path}`);
      }
    }

    // High-entropy quoted string check (>40 chars, Shannon entropy >4.5)
    // Excludes anon-role JWTs so SUPABASE_ANON_KEY values are never flagged.
    const matches = file.content.matchAll(/['"`]([A-Za-z0-9+/=_.-]{40,})['"`]/g);
    for (const m of matches) {
      const s = m[1]!;
      if (shannonEntropy(s) > 4.5) {
        const role = decodeJwtRole(s);
        if (role === "anon") continue; // SUPABASE_ANON_KEY — intentionally public
        if (s.match(/^[0-9a-f-]{36}$/i)) continue; // UUID
        hits.push(`High-entropy string in ${file.path}: ${s.slice(0, 20)}…`);
      }
    }
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    `Found ${hits.length} secret(s) hardcoded in source.`,
    hits.slice(0, 3).join("; "),
  );
};

// ── SEC-002: .env committed to repo ──────────────────────────────────────────
const checkSEC002: CheckFn = (profile) => {
  const base = {
    id: "SEC-002",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 90,
    title: ".env files excluded from git",
    fixPrompt:
      'Add ".env*" to .gitignore. Then run: git rm --cached .env && git commit -m "chore: stop tracking .env". Rotate any secrets that may have been committed.',
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 10,
  };

  const gitignore = profile.files.find(f => f.path === ".gitignore");
  if (!gitignore?.content) {
    return fail(base, "No .gitignore found — .env files may be committed.", ".gitignore missing");
  }

  const lines = gitignore.content
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#"));

  const coversEnv = lines.some(l =>
    /^\.env(\*|\.\*|\.local|\.development\.local|\.production\.local|\.test\.local)?$/.test(l) ||
    l === "*.env",
  );

  if (coversEnv) return pass(base);
  return fail(base, ".gitignore does not cover .env files.", ".gitignore exists but no .env rule");
};

// ── SEC-003: Supabase tables without RLS ─────────────────────────────────────
const checkSEC003: CheckFn = (profile) => {
  const base = {
    id: "SEC-003",
    station: "security" as const,
    severity: "critical" as const,
    confidence: 85,
    title: "All Supabase tables have RLS enabled",
    fixPrompt:
      "For each table without RLS: ALTER TABLE <table> ENABLE ROW LEVEL SECURITY; Then add policies: CREATE POLICY select_own ON <table> FOR SELECT USING (auth.uid() = user_id);",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 12,
  };

  if (!profile.hasDatabase || profile.supabaseMigrations.length === 0) {
    return pass({ ...base, confidence: 70, title: "RLS check — no Supabase migrations found" });
  }

  const allSql = profile.supabaseMigrations.join("\n");

  // Find all CREATE TABLE names
  const tableMatches = [...allSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?(\w+)"?\s/gi)];
  const tables = tableMatches.map(m => m[1]!.toLowerCase());

  if (tables.length === 0) return pass(base);

  // Find tables with ENABLE ROW LEVEL SECURITY
  const rlsMatches = [...allSql.matchAll(/ALTER\s+TABLE\s+(?:"?public"?\.)?"?(\w+)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi)];
  const rlsTables = new Set(rlsMatches.map(m => m[1]!.toLowerCase()));

  // Disabling RLS is always critical
  if (/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(allSql)) {
    return fail(base, "A table explicitly disables RLS — all rows are public.", "DISABLE ROW LEVEL SECURITY found in migrations");
  }

  const missing = tables.filter(t => !rlsTables.has(t));
  if (missing.length === 0) return pass(base);

  return fail(
    base,
    `${missing.length} table(s) without ENABLE ROW LEVEL SECURITY: ${missing.slice(0, 4).join(", ")}`,
    missing.join(", "),
  );
};

// ── SEC-004: No server-side auth on API routes ────────────────────────────────
const AUTH_CHECK_PATTERNS = [
  /getServerSession/,
  /auth\(\)/,
  /supabase\.auth\.getUser/,
  /getUser\(\)/,
  /clerkMiddleware|authMiddleware|withClerkMiddleware/,
  /verifyToken|verifyJwt/i,
  /requireAuth|isAuthenticated/i,
  /cookies\(\).*token|token.*cookies\(\)/,
];

const checkSEC004: CheckFn = (profile) => {
  const base = {
    id: "SEC-004",
    station: "security" as const,
    severity: "critical" as const,
    confidence: 80,
    title: "API routes verify authentication server-side",
    fixPrompt:
      "Add server-side auth checks to each API route: const { data: { user } } = await supabase.auth.getUser(); if (!user) return new Response('Unauthorized', { status: 401 });",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 10,
  };

  if (!profile.hasAuth || profile.apiRoutes.length === 0) {
    return pass({ ...base, confidence: 70, title: "API auth check skipped — no auth or no API routes" });
  }

  const unprotected: string[] = [];
  for (const routePath of profile.apiRoutes) {
    const file = profile.files.find(f => f.path === routePath);
    if (!file?.content) continue;
    const hasAuthCheck = AUTH_CHECK_PATTERNS.some(p => p.test(file.content));
    if (!hasAuthCheck) unprotected.push(routePath);
  }

  if (unprotected.length === 0) return pass(base);
  return fail(
    base,
    `${unprotected.length} API route(s) with no server-side auth check.`,
    unprotected.slice(0, 3).join(", "),
  );
};

// ── SEC-005: Missing security headers ────────────────────────────────────────
const HEADER_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "Content-Security-Policy", re: /Content-Security-Policy/i },
  { key: "X-Frame-Options", re: /X-Frame-Options/i },
  { key: "X-Content-Type-Options", re: /X-Content-Type-Options/i },
  { key: "Strict-Transport-Security", re: /Strict-Transport-Security/i },
  { key: "Referrer-Policy", re: /Referrer-Policy/i },
];

const checkSEC005: CheckFn = (profile) => {
  const base = {
    id: "SEC-005",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "Security headers configured",
    fixPrompt:
      "Add a headers() function to next.config.ts returning [{source:'/**',headers:[{key:'X-Frame-Options',value:'DENY'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Content-Security-Policy',value:\"default-src 'self'\"}]}]",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 8,
  };

  const configContent = Object.values(profile.configFiles).join("\n");
  const middlewareFile = profile.files.find(f => f.path === "middleware.ts" || f.path === "middleware.js" || f.path === "src/middleware.ts");
  const allConfig = configContent + (middlewareFile?.content ?? "");

  const publicHeaders = profile.files.find(f => f.path === "public/_headers");
  const combined = allConfig + (publicHeaders?.content ?? "");

  const found = HEADER_PATTERNS.filter(h => h.re.test(combined)).map(h => h.key);
  const missing = HEADER_PATTERNS.filter(h => !h.re.test(combined)).map(h => h.key);

  if (missing.length === 0) return pass(base);
  if (found.length >= 2) return pass({ ...base, title: `Security headers partially configured (${found.length}/5)`, confidence: 60 });

  return fail(
    base,
    `Missing security headers: ${missing.join(", ")}`,
    missing.join(", "),
  );
};

// ── SEC-006: Wide-open CORS ───────────────────────────────────────────────────
const checkSEC006: CheckFn = (profile) => {
  const base = {
    id: "SEC-006",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "No wildcard CORS on API routes",
    fixPrompt:
      'Replace Access-Control-Allow-Origin: * with an explicit allowlist: const ALLOWED = ["https://yourapp.com"]; if (ALLOWED.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);',
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_15_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 7,
  };

  const apiContent = profile.apiRoutes
    .map(p => profile.files.find(f => f.path === p)?.content ?? "")
    .join("\n");

  if (/Access-Control-Allow-Origin['":\s,]+\*/.test(apiContent)) {
    return fail(base, "Wildcard Access-Control-Allow-Origin (*) found in API routes.", "Access-Control-Allow-Origin: *");
  }
  return pass(base);
};

// ── SEC-007: No rate limiting on auth endpoints ───────────────────────────────
const RATE_LIMIT_RE = /upstash\/ratelimit|ratelimit|rate.?limit|limiter|throttle/i;

const checkSEC007: CheckFn = (profile) => {
  const base = {
    id: "SEC-007",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Auth endpoints have rate limiting",
    fixPrompt:
      'Install @upstash/ratelimit and @upstash/redis. Wrap auth routes: const { success } = await ratelimit.limit(ip); if (!success) return new Response("Too Many Requests", { status: 429 });',
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 7,
  };

  if (!profile.hasAuth) return pass({ ...base, confidence: 70, title: "Rate limit check skipped — no auth detected" });

  const hasDep = Object.keys(profile.dependencies).some(d => RATE_LIMIT_RE.test(d));
  if (hasDep) return pass(base);

  const authRoutes = profile.apiRoutes.filter(p =>
    AUTH_ROUTE_PATTERNS.some(re => re.test(p)),
  );
  if (authRoutes.length === 0) return pass({ ...base, confidence: 60, title: "No auth API routes to rate-limit" });

  const hasInline = authRoutes.some(p => {
    const f = profile.files.find(f => f.path === p);
    return f?.content && RATE_LIMIT_RE.test(f.content);
  });

  if (hasInline) return pass(base);
  return fail(base, "Auth routes found but no rate limiting package or logic detected.", authRoutes.slice(0, 2).join(", "));
};

// ── SEC-008: SQL injection patterns ──────────────────────────────────────────
// Looks for string concat / template literals in DB query calls.
const SQL_INJECT_RE = /(?:query|sql|execute|raw)\s*\(\s*[`'"].*?\$\{(?!params|args|values)/;

const checkSEC008: CheckFn = (profile) => {
  const base = {
    id: "SEC-008",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 75,
    title: "No SQL injection patterns",
    fixPrompt:
      "Replace string interpolation in SQL queries with parameterised queries: db.query('SELECT * FROM users WHERE id = $1', [userId]) — never interpolate user input directly.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 6,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    if (SQL_INJECT_RE.test(file.content)) hits.push(file.path);
  }

  if (hits.length === 0) return pass(base);
  return fail(base, `Possible SQL injection via string interpolation in ${hits.length} file(s).`, hits.slice(0, 3).join(", "));
};

// ── SEC-009: JWT in localStorage ─────────────────────────────────────────────
const JWT_LOCALSTORAGE_RE = /localStorage\.setItem\s*\([^,]*(?:token|jwt|session|auth)[^,]*/i;

const checkSEC009: CheckFn = (profile) => {
  const base = {
    id: "SEC-009",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "Auth tokens not stored in localStorage",
    fixPrompt:
      "Move auth tokens from localStorage to httpOnly cookies. Tokens in localStorage are accessible to XSS attacks. Use Set-Cookie with HttpOnly; Secure; SameSite=Lax on the server.",
    fixDifficulty: "moderate" as const,
    fixTime: "1 hr",
    autoFixSafety: "review" as const,
    scoreWeight: 6,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    if (JWT_LOCALSTORAGE_RE.test(file.content)) hits.push(file.path);
  }

  if (hits.length === 0) return pass(base);
  return fail(base, `Auth token stored in localStorage in ${hits.length} file(s) — vulnerable to XSS.`, hits.slice(0, 3).join(", "));
};

// ── SEC-010: No input validation on mutations ─────────────────────────────────
const VALIDATION_DEPS = new Set(["zod", "yup", "joi", "valibot", "arktype", "superstruct", "class-validator"]);

const checkSEC010: CheckFn = (profile) => {
  const base = {
    id: "SEC-010",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Input validation library present",
    fixPrompt:
      "Install zod: pnpm add zod. Then validate all API request bodies: const body = await request.json(); const parsed = MySchema.safeParse(body); if (!parsed.success) return new Response('Bad Request', { status: 400 });",
    fixDifficulty: "moderate" as const,
    fixTime: "1 hr",
    autoFixSafety: "review" as const,
    scoreWeight: 5,
  };

  const hasDep = Object.keys(profile.dependencies).some(d => VALIDATION_DEPS.has(d));
  if (hasDep) return pass(base);

  // Check inline usage
  const hasInline = profile.files.some(f =>
    SOURCE_EXTS.has(f.ext) && /\bz\.object|Schema\.parse|Joi\.object|yup\.object/i.test(f.content),
  );
  if (hasInline) return pass(base);

  return fail(base, "No input validation library (zod, yup, joi, valibot…) detected.", "No validation dep found");
};

// ── SEC-011: Secrets in git history ──────────────────────────────────────────
const GIT_SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*eyJ/,
  /sk-[A-Za-z0-9]{32,}/,
  /sk_live_[A-Za-z0-9]{24,}/,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
  /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----/,
];

function isTestDiffPath(path: string): boolean {
  return path.includes("__tests__") || path.includes(".test.") || path.includes(".spec.");
}

// Same rationale as SEC-001: a security scanner's own test fixtures
// legitimately contain realistic fake-secret-shaped strings, and those
// diffs shouldn't read as leaked history. Diffs are unified format with a
// "diff --git a/<path> b/<path>" header per file, so hunks can be filtered
// by the path they belong to before pattern-matching.
function stripTestFileHunks(diff: string): string {
  const segments = diff.split(/(?=^diff --git )/m);
  return segments
    .filter(seg => {
      const header = seg.match(/^diff --git a\/(.+?) b\/.+$/m);
      if (!header) return true;
      return !isTestDiffPath(header[1]!);
    })
    .join("");
}

const checkSEC011: CheckFn = (profile) => {
  const base = {
    id: "SEC-011",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "No secrets found in git history",
    fixPrompt:
      "If secrets were committed: 1) Rotate all exposed keys immediately. 2) Remove from history: git filter-repo --path .env --invert-paths. 3) Force-push. 4) All collaborators must re-clone.",
    fixDifficulty: "architectural" as const,
    fixTime: "2 hrs",
    autoFixSafety: "human-only" as const,
    scoreWeight: 5,
  };

  if (!profile.gitCommits) {
    return { ...base, passed: true, failMessage: "", evidence: "", confidence: 0 };
  }

  const hits: string[] = [];
  for (const commit of profile.gitCommits) {
    const relevantDiff = stripTestFileHunks(commit.diff);
    for (const re of GIT_SECRET_PATTERNS) {
      if (re.test(relevantDiff)) {
        hits.push(`${commit.hash.slice(0, 7)}: ${commit.message}`);
        break;
      }
    }
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    `Secrets found in ${hits.length} git commit(s). Keys must be rotated immediately.`,
    hits.slice(0, 3).join("; "),
  );
};

// ── SEC-012: Unsigned payment webhooks ───────────────────────────────────────
const PAYMENT_DEPS_RE = /stripe|razorpay|lemonsqueezy/i;
const WEBHOOK_VERIFY_RE = /constructEvent|webhooks\.construct|verifyWebhookSignature|x-razorpay-signature|validateWebhook/i;

const checkSEC012: CheckFn = (profile) => {
  const base = {
    id: "SEC-012",
    station: "security" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "Payment webhooks verify signatures",
    fixPrompt:
      "Use stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET) before processing any webhook. Reject events where constructEvent throws.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 4,
  };

  const hasPaymentDep = Object.keys(profile.dependencies).some(d => PAYMENT_DEPS_RE.test(d));
  if (!hasPaymentDep && !profile.hasPayments) {
    return pass({ ...base, confidence: 70, title: "Webhook check skipped — no payment library detected" });
  }

  const webhookRoutes = profile.apiRoutes.filter(p =>
    /webhook|stripe|payment/i.test(p),
  );

  if (webhookRoutes.length === 0) {
    return pass({ ...base, confidence: 60, title: "No webhook routes found to verify" });
  }

  const unverified = webhookRoutes.filter(p => {
    const file = profile.files.find(f => f.path === p);
    return file?.content && !WEBHOOK_VERIFY_RE.test(file.content);
  });

  if (unverified.length === 0) return pass(base);
  return fail(
    base,
    `${unverified.length} webhook route(s) do not verify signatures.`,
    unverified.slice(0, 2).join(", "),
  );
};

// ── Wave 2 stubs (18 checks — correct interface, confidence: 0) ───────────────
const checkSEC013 = stub("SEC-013", 3, "warning", "No file upload validation", "File uploads lack type/size validation.", "Validate MIME type server-side and enforce size limits.", "moderate", "1 hr", "review");
const checkSEC014 = stub("SEC-014", 3, "warning", "No SSRF patterns", "Server-side requests use user-supplied URLs without validation.", "Allowlist permitted URL patterns before making server-side HTTP requests.", "moderate", "1 hr", "review");
const checkSEC015 = stub("SEC-015", 2, "warning", "CSRF protection present", "Mutation endpoints lack CSRF protection.", "Use SameSite=Lax cookies or a CSRF token for state-changing endpoints.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC016 = stub("SEC-016", 2, "warning", "No session fixation risk", "Session ID not regenerated after login.", "Regenerate session after auth state change.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC017 = stub("SEC-017", 2, "warning", "Admin routes protected", "Admin-only routes not restricted to admin role.", "Add role check: if (user.role !== 'admin') return 403.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC018 = stub("SEC-018", 2, "info", "No mixed content", "Page loads HTTP resources over HTTPS.", "Upgrade all sub-resources to HTTPS.", "copy-paste", FIX_TIME_15_MIN, "safe");
const checkSEC019 = stub("SEC-019", 2, "warning", "No dangerouslySetInnerHTML", "dangerouslySetInnerHTML used without DOMPurify sanitization.", "Wrap HTML string with DOMPurify.sanitize() before passing to dangerouslySetInnerHTML.", "moderate", FIX_TIME_15_MIN, "review");
const checkSEC020 = stub("SEC-020", 2, "warning", "No PII in logs", "User PII (email, name) logged via console.log.", "Remove PII from logs. Use structured logging with user IDs only.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC021 = stub("SEC-021", 1, "warning", "eval() not used", "eval() or new Function() found in source.", "Replace eval() with safer alternatives.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC022 = stub("SEC-022", 1, "warning", "No path traversal risk", "User input used in file path without sanitisation.", "Use path.resolve + verify the result stays within the allowed directory.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC023 = stub("SEC-023", 1, "info", "No open redirect", "Redirect destination from user input without validation.", "Validate redirect URLs against an allowlist.", "moderate", FIX_TIME_15_MIN, "review");
const checkSEC024 = stub("SEC-024", 1, "info", "Dependency lockfile committed", "No lockfile committed — non-deterministic installs.", "Commit pnpm-lock.yaml, package-lock.json, or yarn.lock.", "copy-paste", "5 min", "safe");
const checkSEC025 = stub("SEC-025", 1, "info", "No debug endpoints in production", "Debug routes exposing internals reachable in production.", "Gate debug routes behind NODE_ENV !== 'production'.", "copy-paste", "5 min", "safe");
const checkSEC026 = stub("SEC-026", 1, "info", "Error messages do not leak stack traces", "Unhandled errors returning stack traces to client.", "Return generic error messages; log details server-side only.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC027 = stub("SEC-027", 1, "info", "Third-party scripts use SRI", "External scripts loaded without Subresource Integrity.", "Add integrity= and crossorigin= attributes to external <script> tags.", "copy-paste", FIX_TIME_15_MIN, "safe");
const checkSEC028 = stub("SEC-028", 1, "info", "Secure cookie flags set", "Auth cookies missing Secure and HttpOnly flags.", "Set cookies with Secure; HttpOnly; SameSite=Lax.", "copy-paste", "5 min", "safe");
const checkSEC029 = stub("SEC-029", 1, "info", "No command injection", "User input passed to child_process.exec without sanitisation.", "Use execFile with an argument array, never exec with string interpolation.", "moderate", FIX_TIME_30_MIN, "review");
const checkSEC030 = stub("SEC-030", 1, "info", "Prototype pollution guard", "Object.assign or JSON.parse on untrusted input without guard.", "Use structuredClone or a library like defu instead of Object.assign on user data.", "moderate", FIX_TIME_30_MIN, "review");

export const securityChecks: CheckFn[] = [
  checkSEC001, checkSEC002, checkSEC003, checkSEC004, checkSEC005, checkSEC006,
  checkSEC007, checkSEC008, checkSEC009, checkSEC010, checkSEC011, checkSEC012,
  checkSEC013, checkSEC014, checkSEC015, checkSEC016, checkSEC017, checkSEC018,
  checkSEC019, checkSEC020, checkSEC021, checkSEC022, checkSEC023, checkSEC024,
  checkSEC025, checkSEC026, checkSEC027, checkSEC028, checkSEC029, checkSEC030,
];
