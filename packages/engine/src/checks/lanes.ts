import type { CheckFn, CheckResult, CodeProfile, FileInfo, StationScore } from "./types";

/**
 * The grade is three lanes. Anything we cannot see is confidence 0 and
 * excluded. A pass is a real negative, never a stub.
 *
 * security → station security (weight 45)
 * healthy  → station quality  (weight 30)
 * human    → station accessibility (weight 25)
 */

export const LANE_WEIGHTS = {
  security: 45,
  quality: 30,
  accessibility: 25,
} as const;

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte", ".html"]);
const UI_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte", ".html"]);

const SECURITY_P0 = new Set([
  "SEC-001",
  "SEC-031",
  "SEC-003",
  "SEC-032",
  "SEC-004",
  "SEC-012",
  "SEC-019",
  "SEC-034",
]);

type Base = Omit<CheckResult, "passed" | "failMessage" | "evidence">;

function base(partial: Base): Base {
  return partial;
}

function ok(b: Base, evidence = ""): CheckResult {
  return { ...b, passed: true, failMessage: "", evidence };
}

/** Looked, could not decide. Not a pass. */
function unseen(b: Base): CheckResult {
  return {
    ...b,
    passed: false,
    confidence: 0,
    applicable: false,
    failMessage: "",
    evidence: "",
  };
}

function bad(b: Base, failMessage: string, evidence: string, file?: FileInfo, index?: number): CheckResult {
  const lineNumber = file && index != null ? file.content.slice(0, index).split("\n").length : null;
  return {
    ...b,
    passed: false,
    failMessage,
    evidence,
    ...(file ? { filePath: file.path } : {}),
    ...(lineNumber != null ? { lineNumber } : {}),
  };
}

function isTestPath(path: string): boolean {
  return path.includes("__tests__") || path.includes(".test.") || path.includes(".spec.");
}

function sourceFiles(profile: CodeProfile): FileInfo[] {
  return profile.files.filter(
    (f) => SOURCE_EXTS.has(f.ext) && f.content && !isTestPath(f.path),
  );
}

function uiFiles(profile: CodeProfile): FileInfo[] {
  return profile.files.filter(
    (f) => UI_EXTS.has(f.ext) && f.content && !isTestPath(f.path),
  );
}

function isWeb(profile: CodeProfile): boolean {
  return profile.framework !== "unknown" || uiFiles(profile).length > 0;
}

export function hasProductSurface(profile: CodeProfile): boolean {
  if (profile.hasAuth || profile.hasUserData || profile.hasPayments || profile.hasDatabase) {
    return true;
  }
  if (profile.apiRoutes.length > 0) return true;
  const pages = profile.files.filter((f) =>
    /(^|\/)(page|route)\.(tsx|ts|jsx|js)$/.test(f.path) ||
    /(^|\/)pages\/.+\.(tsx|ts|jsx|js)$/.test(f.path),
  );
  if (pages.length >= 2) return true;
  if (pages.length === 1) {
    const text = pages[0]!.content.toLowerCase();
    if (text.length > 800 && !/\bhello\b/.test(text)) return true;
  }
  return false;
}

function findIn(files: FileInfo[], re: RegExp): { file: FileInfo; index: number; text: string } | null {
  for (const file of files) {
    const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
    const r = new RegExp(re.source, flags);
    const m = r.exec(file.content);
    if (m && m.index != null) return { file, index: m.index, text: m[0] };
  }
  return null;
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

const KNOWN_SECRETS: Array<{ re: RegExp; label: string }> = [
  { re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?eyJ[A-Za-z0-9_.-]{20,}/, label: "service role key" },
  { re: /sk-[A-Za-z0-9]{32,}/, label: "OpenAI secret key" },
  { re: /sk_live_[A-Za-z0-9]{16,}/, label: "Stripe live secret" },
  { re: /sk_test_[A-Za-z0-9]{16,}/, label: "Stripe test secret" },
  { re: /gh[pousr]_[A-Za-z0-9]{20,}/, label: "GitHub token" },
  { re: /-----BEGIN\s+(RSA\s+|EC\s+)?PRIVATE KEY-----/, label: "private key" },
];

const checkSEC001: CheckFn = (profile) => {
  const b = base({
    id: "SEC-001",
    station: "security",
    severity: "critical",
    confidence: 90,
    title: "No secrets in source",
    fixPrompt: "Move the secret to an env var that is not committed. Rotate the leaked key. Do not commit the new value.",
    fixDifficulty: "copy-paste",
    fixTime: "30 min",
    autoFixSafety: "review",
    scoreWeight: 16,
  });
  const files = sourceFiles(profile);
  if (files.length === 0) return unseen(b);
  for (const file of files) {
    for (const { re, label } of KNOWN_SECRETS) {
      const m = new RegExp(re.source, re.flags).exec(file.content);
      if (m && m.index != null) {
        return bad(b, `Hardcoded ${label}.`, `${file.path}: ${label}`, file, m.index);
      }
    }
    const quoted = file.content.matchAll(/['"`]([A-Za-z0-9+/=_.-]{40,})['"`]/g);
    for (const m of quoted) {
      const s = m[1]!;
      if (shannonEntropy(s) <= 4.5) continue;
      if (decodeJwtRole(s) === "anon") continue;
      if (/^[0-9a-f-]{36}$/i.test(s)) continue;
      return bad(b, "High-entropy secret in source.", `${file.path}`, file, m.index);
    }
  }
  return ok(b);
};

const checkSEC031: CheckFn = (profile) => {
  const b = base({
    id: "SEC-031",
    station: "security",
    severity: "critical",
    confidence: 85,
    title: "No privileged key in NEXT_PUBLIC or VITE",
    fixPrompt: "Remove the privileged key from any NEXT_PUBLIC_ or VITE_ variable. Those ship to the browser.",
    fixDifficulty: "copy-paste",
    fixTime: "20 min",
    autoFixSafety: "review",
    scoreWeight: 14,
  });
  const files = sourceFiles(profile);
  if (files.length === 0 && !profile.envExample) return unseen(b);
  const re = /(NEXT_PUBLIC_|VITE_)[A-Z0-9_]*(SERVICE_ROLE|SECRET_KEY|PRIVATE_KEY|STRIPE_SECRET|SUPABASE_SERVICE)/;
  const hit = findIn(files, re);
  if (hit) return bad(b, "Privileged key is exposed to the client bundle.", hit.text, hit.file, hit.index);
  for (const file of files) {
    if (!/NEXT_PUBLIC_|VITE_/.test(file.content)) continue;
    const m = /['"`](eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)['"`]/.exec(file.content);
    if (m?.[1] && decodeJwtRole(m[1]) === "service_role") {
      return bad(b, "Service-role JWT is in a public env.", file.path, file, m.index);
    }
  }
  return ok(b);
};

const checkSEC003: CheckFn = (profile) => {
  const b = base({
    id: "SEC-003",
    station: "security",
    severity: "critical",
    confidence: 80,
    title: "RLS enabled on database tables",
    fixPrompt: [
      "Propose this SQL. Do not run it automatically.",
      "ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;",
      "CREATE POLICY \"own rows\" ON public.<table> FOR ALL USING (auth.uid() = user_id);",
    ].join("\n"),
    fixDifficulty: "moderate",
    fixTime: "30 min",
    autoFixSafety: "human-only",
    scoreWeight: 14,
  });
  const sql = profile.supabaseMigrations.join("\n");
  const schema = profile.files
    .filter((f) => /schema\.(sql|prisma)$/.test(f.path) || f.path.includes("prisma/schema"))
    .map((f) => f.content)
    .join("\n");
  const body = `${sql}\n${schema}`;
  if (!/CREATE\s+TABLE/i.test(body)) return unseen(b);
  if (!/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(body)) {
    return bad(b, "Tables are created without RLS.", "CREATE TABLE without ENABLE ROW LEVEL SECURITY");
  }
  return ok(b);
};

const checkSEC032: CheckFn = (profile) => {
  const b = base({
    id: "SEC-032",
    station: "security",
    severity: "critical",
    confidence: 85,
    title: "RLS policies are not USING (true)",
    fixPrompt: "Replace USING (true) with a predicate on auth.uid(). Propose the SQL. Do not apply it automatically.",
    fixDifficulty: "moderate",
    fixTime: "20 min",
    autoFixSafety: "human-only",
    scoreWeight: 14,
  });
  const sqlFiles = profile.files.filter((f) => f.ext === ".sql" && f.content);
  const sql = [...profile.supabaseMigrations, ...sqlFiles.map((f) => f.content)].join("\n");
  if (!/CREATE\s+POLICY/i.test(sql)) return unseen(b);
  const m = /USING\s*\(\s*true\s*\)/i.exec(sql);
  if (m && m.index != null) {
    return bad(b, "A policy uses USING (true), so the table is open.", m[0]);
  }
  return ok(b);
};

const checkSEC004: CheckFn = (profile) => {
  const b = base({
    id: "SEC-004",
    station: "security",
    severity: "critical",
    confidence: 75,
    title: "Auth is enforced on the server",
    fixPrompt: "Check the session in middleware or the route handler. A client redirect is not auth.",
    fixDifficulty: "moderate",
    fixTime: "30 min",
    autoFixSafety: "review",
    scoreWeight: 12,
  });
  if (!profile.hasAuth) return unseen(b);
  const files = sourceFiles(profile);
  const serverGate = files.some((f) =>
    /middleware\.(ts|js)/.test(f.path) ||
    /getServerSession|auth\(\)|requireUser|requireAuth|supabase\.auth\.getUser|getUser\(/.test(f.content),
  );
  const clientOnly = files.some((f) =>
    /useSession|supabase\.auth\.getSession|if\s*\(\s*!user\s*\)/.test(f.content) &&
    (f.content.includes("use client") || f.ext === ".tsx"),
  );
  if (serverGate) return ok(b);
  if (clientOnly || profile.apiRoutes.length > 0) {
    const file = files.find((f) => /useSession|getSession|if\s*\(\s*!user\s*\)/.test(f.content));
    return bad(b, "Auth is only enforced in the UI.", file?.path ?? "no server session check", file);
  }
  return unseen(b);
};

const checkSEC012: CheckFn = (profile) => {
  const b = base({
    id: "SEC-012",
    station: "security",
    severity: "critical",
    confidence: 80,
    title: "Webhooks verify signatures",
    fixPrompt: "Verify the provider signature before trusting the body. Stripe: constructEvent. Do not parse the payload first.",
    fixDifficulty: "moderate",
    fixTime: "20 min",
    autoFixSafety: "review",
    scoreWeight: 12,
  });
  const routes = sourceFiles(profile).filter((f) => /webhook/i.test(f.path));
  if (!profile.hasPayments && routes.length === 0) return unseen(b);
  if (routes.length === 0) {
    return {
      ...ok(b),
      title: "No webhook routes found to verify",
    };
  }
  const unsigned = routes.find((f) => !/constructEvent|stripe-signature|webhookSecret|verifySignature|x-hub-signature/i.test(f.content));
  if (unsigned) return bad(b, "Webhook handler does not check a signature.", unsigned.path, unsigned);
  return ok(b);
};

const HEADER_SNIPPET = [
  "Add these headers. Safe to paste into next.config.",
  "Content-Security-Policy: default-src 'self'",
  "Strict-Transport-Security: max-age=63072000; includeSubDomains",
  "X-Frame-Options: DENY",
  "X-Content-Type-Options: nosniff",
].join("\n");

const checkSEC033: CheckFn = (profile) => {
  const severe = profile.hasAuth || profile.hasUserData;
  const b = base({
    id: "SEC-033",
    station: "security",
    severity: severe ? "critical" : "warning",
    confidence: 70,
    title: "CSP, HSTS, X-Frame-Options DENY, nosniff",
    fixPrompt: HEADER_SNIPPET,
    fixDifficulty: "copy-paste",
    fixTime: "10 min",
    autoFixSafety: "safe",
    scoreWeight: severe ? 10 : 6,
  });
  if (!isWeb(profile)) return unseen(b);
  const blob = [
    ...Object.values(profile.configFiles),
    ...sourceFiles(profile).map((f) => f.content),
  ].join("\n");
  const missing: string[] = [];
  if (!/Content-Security-Policy|contentSecurityPolicy/i.test(blob)) missing.push("CSP");
  if (!/Strict-Transport-Security|includeSubDomains/i.test(blob)) missing.push("HSTS");
  if (!/X-Frame-Options['"\s:]*DENY|frame-ancestors\s+'none'/i.test(blob)) missing.push("X-Frame-Options DENY");
  if (!/X-Content-Type-Options|nosniff/i.test(blob)) missing.push("nosniff");
  if (missing.length === 0) return ok(b);
  return bad(b, `Missing ${missing.join(", ")}.`, missing.join(", "));
};

const checkSEC019: CheckFn = (profile) => {
  const b = base({
    id: "SEC-019",
    station: "security",
    severity: "critical",
    confidence: 80,
    title: "dangerouslySetInnerHTML is not user content",
    fixPrompt: "Do not pass user HTML into dangerouslySetInnerHTML. Sanitize with a real library or render text.",
    fixDifficulty: "moderate",
    fixTime: "20 min",
    autoFixSafety: "review",
    scoreWeight: 12,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  for (const file of files) {
    const re = /dangerouslySetInnerHTML\s*=\s*\{\s*\{[\s\S]{0,180}?\}\s*\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.content))) {
      const expr = m[0];
      const literal = /__html\s*:\s*['"`]/.test(expr);
      const sanitized = /DOMPurify|sanitize\(/.test(expr);
      const user = /props\.|user|children|searchParams|params\.|dangerously|html\b|content\b/.test(expr);
      if (!literal && !sanitized && user) {
        return bad(b, "dangerouslySetInnerHTML receives user content.", file.path, file, m.index);
      }
      if (!literal && !sanitized && !/__html\s*:\s*['"`]/.test(expr)) {
        return bad(b, "dangerouslySetInnerHTML receives a value that is not a constant.", file.path, file, m.index);
      }
    }
  }
  return ok(b);
};

const checkSEC034: CheckFn = (profile) => {
  const b = base({
    id: "SEC-034",
    station: "security",
    severity: "critical",
    confidence: 75,
    title: "Authed routes do not allow open CORS",
    fixPrompt: "Set Access-Control-Allow-Origin to a specific origin on any route that checks a session.",
    fixDifficulty: "moderate",
    fixTime: "15 min",
    autoFixSafety: "review",
    scoreWeight: 10,
  });
  if (!profile.hasAuth) return unseen(b);
  const files = sourceFiles(profile);
  const open = findIn(files, /Access-Control-Allow-Origin['"\s:=]+['"]?\*|origin\s*:\s*['"]\*['"]|origin\s*:\s*true/);
  if (!open) return unseen(b);
  const authed = /getUser|requireAuth|getServerSession|auth\(\)|session/.test(open.file.content) || /middleware/.test(open.file.path);
  if (!authed && !profile.hasAuth) return unseen(b);
  if (profile.hasAuth) return bad(b, "Open CORS on a tree that has auth.", open.text, open.file, open.index);
  return ok(b);
};

const checkHEAL001: CheckFn = (profile) => {
  const b = base({
    id: "COMP-004",
    station: "quality",
    severity: "warning",
    confidence: 70,
    title: "Users can delete their data",
    fixPrompt: "Add a server handler that deletes the signed-in user's rows. Do not invent the business rules beyond that delete.",
    fixDifficulty: "moderate",
    fixTime: "30 min",
    autoFixSafety: "review",
    scoreWeight: 8,
  });
  if (!profile.hasAuth && !profile.hasUserData) return unseen(b);
  const files = sourceFiles(profile);
  if (findIn(files, /delete(My)?Data|deleteAccount|deleteUser|account\/delete|users\.delete/i)) return ok(b);
  return bad(b, "People exist and there is no delete-my-data path.", "no delete handler");
};

const checkHEAL002: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-002",
    station: "quality",
    severity: "warning",
    confidence: 85,
    title: "No empty catch",
    fixPrompt: "Log or return the error. An empty catch hides the failure.",
    fixDifficulty: "copy-paste",
    fixTime: "10 min",
    autoFixSafety: "review",
    scoreWeight: 6,
  });
  const files = sourceFiles(profile);
  if (files.length === 0) return unseen(b);
  const hit = findIn(files, /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\s*)?\}/);
  if (hit) return bad(b, "Empty catch swallows the error.", hit.file.path, hit.file, hit.index);
  return ok(b);
};

const checkHEAL003: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-003",
    station: "quality",
    severity: "warning",
    confidence: 65,
    title: "Loading, empty, and error UI",
    fixPrompt: "Add a loading state, an empty state, and an error state that says what failed.",
    fixDifficulty: "moderate",
    fixTime: "30 min",
    autoFixSafety: "review",
    scoreWeight: 8,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const blob = files.map((f) => `${f.path}\n${f.content}`).join("\n");
  const missing: string[] = [];
  if (!/loading\.tsx|isLoading|Suspense|\bloading\b/i.test(blob)) missing.push("loading");
  if (!/empty|no results|nothing here|length\s*===\s*0/i.test(blob)) missing.push("empty");
  if (!/error\.tsx|error boundary|couldn't|could not|failed to|setError/i.test(blob)) missing.push("error");
  if (missing.length === 0) return ok(b);
  return bad(b, `Missing ${missing.join(", ")} UI.`, missing.join(", "));
};

const checkHEAL004: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-004",
    station: "quality",
    severity: "critical",
    confidence: 90,
    title: "No live payment keys in source",
    fixPrompt: "Remove sk_live_ and pk_live_ from the repo. Use a test key locally and a secret in the host.",
    fixDifficulty: "copy-paste",
    fixTime: "15 min",
    autoFixSafety: "review",
    scoreWeight: 12,
  });
  const files = sourceFiles(profile);
  const hit = findIn(files, /[sp]k_live_[A-Za-z0-9]{8,}/);
  if (hit) return bad(b, "Live payment key is in source.", hit.text.slice(0, 12), hit.file, hit.index);
  if (!profile.hasPayments) return unseen(b);
  return ok(b);
};

const checkHEAL005: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-005",
    station: "quality",
    severity: "warning",
    confidence: 75,
    title: "Logs do not contain emails, tokens, or user objects",
    fixPrompt: "Log an id, not the email, token, or the whole user.",
    fixDifficulty: "copy-paste",
    fixTime: "15 min",
    autoFixSafety: "review",
    scoreWeight: 6,
  });
  const files = sourceFiles(profile);
  if (files.length === 0) return unseen(b);
  const hit = findIn(files, /console\.(log|info|debug|warn|error)\([^)\n]{0,200}(email|token|password|\buser\b)/i);
  if (hit) return bad(b, "A log line includes a user, email, or token.", hit.file.path, hit.file, hit.index);
  return ok(b);
};

const checkHEAL006: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-006",
    station: "quality",
    severity: "warning",
    confidence: 80,
    title: "A 404 page exists",
    fixPrompt: [
      "Add app/not-found.tsx:",
      "export default function NotFound() { return <h1>Not found</h1>; }",
    ].join("\n"),
    fixDifficulty: "copy-paste",
    fixTime: "5 min",
    autoFixSafety: "safe",
    scoreWeight: 4,
  });
  if (!isWeb(profile)) return unseen(b);
  const found = profile.files.some((f) =>
    /(^|\/)(not-found|404)\.(tsx|jsx|ts|js|html)$/.test(f.path),
  );
  if (found) return ok(b);
  return bad(b, "No 404 page.", "missing not-found");
};

const checkHEAL007: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-007",
    station: "quality",
    severity: "info",
    confidence: 80,
    title: "robots.txt exists",
    fixPrompt: "Add public/robots.txt:\nUser-agent: *\nAllow: /\n",
    fixDifficulty: "copy-paste",
    fixTime: "5 min",
    autoFixSafety: "safe",
    scoreWeight: 3,
  });
  if (!isWeb(profile)) return unseen(b);
  const found = profile.files.some((f) =>
    /(^|\/)robots\.(txt|ts|js)$/.test(f.path),
  );
  if (found) return ok(b);
  return bad(b, "No robots.txt.", "missing robots");
};

const checkHEAL008: CheckFn = (profile) => {
  const b = base({
    id: "HEAL-008",
    station: "quality",
    severity: "warning",
    confidence: 70,
    title: "Login and signup are rate limited",
    fixPrompt: "Rate-limit the login and signup handlers. Do not invent a new auth system.",
    fixDifficulty: "moderate",
    fixTime: "20 min",
    autoFixSafety: "review",
    scoreWeight: 6,
  });
  if (!profile.hasAuth) return unseen(b);
  const files = sourceFiles(profile).filter((f) => /login|signup|sign-up|register/i.test(f.path));
  if (files.length === 0) return bad(b, "Auth exists and login/signup has no rate limit.", "no login route");
  const limited = files.some((f) => /rateLimit|ratelimit|upstash|too many/i.test(f.content));
  if (limited) return ok(b);
  return bad(b, "Login or signup has no rate limit.", files[0]!.path, files[0]);
};

const checkHUM001: CheckFn = (profile) => {
  const b = base({
    id: "HUM-001",
    station: "accessibility",
    severity: "warning",
    confidence: 85,
    title: "div with onClick is a button",
    fixPrompt: "Change the div to <button type=\"button\"> and keep the existing handler. Do not invent a new action.",
    fixDifficulty: "copy-paste",
    fixTime: "5 min",
    autoFixSafety: "safe",
    scoreWeight: 6,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const hit = findIn(files, /<div\b[^>]*\bonClick\b/);
  if (hit) return bad(b, "A div has onClick. It looks clickable and is not a button.", hit.file.path, hit.file, hit.index);
  return ok(b);
};

const checkHUM002: CheckFn = (profile) => {
  const b = base({
    id: "HUM-002",
    station: "accessibility",
    severity: "warning",
    confidence: 85,
    title: "No href=\"#\"",
    fixPrompt: "Point the link at a real URL or replace it with a button that does the action.",
    fixDifficulty: "copy-paste",
    fixTime: "5 min",
    autoFixSafety: "review",
    scoreWeight: 5,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const hit = findIn(files, /href\s*=\s*\{?["']#["']\}?/);
  if (hit) return bad(b, "A link goes nowhere.", hit.file.path, hit.file, hit.index);
  return ok(b);
};

const checkHUM003: CheckFn = (profile) => {
  const b = base({
    id: "HUM-003",
    station: "accessibility",
    severity: "warning",
    confidence: 80,
    title: "No TODO or empty handlers",
    fixPrompt: "Wire the handler to the real action or remove the control. Do not leave TODO.",
    fixDifficulty: "moderate",
    fixTime: "15 min",
    autoFixSafety: "human-only",
    scoreWeight: 6,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const hit = findIn(
    files,
    /onClick=\{\s*(?:\(\)\s*=>\s*)?\{\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\s*)?\}\s*\}|onClick=\{\s*\(\)\s*=>\s*\{\s*\/\*\s*TODO|TODO:\s*(implement|wire|handle)/i,
  );
  if (hit) return bad(b, "A handler is empty or still TODO.", hit.file.path, hit.file, hit.index);
  return ok(b);
};

const checkHUM004: CheckFn = (profile) => {
  const b = base({
    id: "HUM-004",
    station: "accessibility",
    severity: "critical",
    confidence: 70,
    title: "Primary CTA does something",
    fixPrompt: "Make the primary control navigate or submit. Do not invent a new business flow.",
    fixDifficulty: "moderate",
    fixTime: "15 min",
    autoFixSafety: "human-only",
    scoreWeight: 10,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const re = /<(button|a)\b[^>]*(?:bg-brand|btn-primary|button-primary|\bcta\b)[^>]*>/gi;
  for (const file of files) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(file.content))) {
      const tag = m[0];
      const dead =
        /href\s*=\s*\{?["']#["']\}?/.test(tag) ||
        /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/.test(tag) ||
        /TODO/.test(tag) ||
        (tag.startsWith("<a") && !/href\s*=/.test(tag)) ||
        (tag.startsWith("<button") && !/onClick\s*=/.test(tag) && !/type\s*=\s*["']submit["']/.test(tag));
      if (dead) return bad(b, "The primary CTA does nothing.", tag.slice(0, 80), file, m.index);
    }
  }
  const anyPrimary = files.some((f) => /bg-brand|btn-primary|button-primary|\bcta\b/.test(f.content));
  if (!anyPrimary) return unseen(b);
  return ok(b);
};

const checkHUM005: CheckFn = (profile) => {
  const b = base({
    id: "HUM-005",
    station: "accessibility",
    severity: "warning",
    confidence: 75,
    title: "Heading order is sane",
    fixPrompt: "One h1. Do not skip from h1 to h3.",
    fixDifficulty: "copy-paste",
    fixTime: "10 min",
    autoFixSafety: "review",
    scoreWeight: 4,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  for (const file of files) {
    const heads = [...file.content.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
    if (heads.length === 0) continue;
    const h1s = heads.filter((n) => n === 1).length;
    if (h1s > 1) return bad(b, "More than one h1.", file.path, file);
    let prev = 0;
    for (const n of heads) {
      if (prev > 0 && n > prev + 1) return bad(b, "Heading level skips.", file.path, file);
      prev = n;
    }
  }
  return ok(b);
};

const checkHUM006: CheckFn = (profile) => {
  const b = base({
    id: "HUM-006",
    station: "accessibility",
    severity: "warning",
    confidence: 80,
    title: "No lorem, TODO, or John Doe in the UI",
    fixPrompt: "Replace placeholder copy with the real label. Do not ship lorem or John Doe.",
    fixDifficulty: "copy-paste",
    fixTime: "10 min",
    autoFixSafety: "review",
    scoreWeight: 4,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const hit = findIn(files, />([^<]{0,80}(?:lorem ipsum|john doe|jane doe)[^<]{0,80})</i);
  if (hit) return bad(b, "Placeholder copy is in the UI.", hit.text.slice(0, 60), hit.file, hit.index);
  const todo = findIn(files, />([^<]{0,40}\bTODO\b[^<]{0,40})</);
  if (todo) return bad(b, "TODO is visible in the UI.", todo.text.slice(0, 40), todo.file, todo.index);
  return ok(b);
};

const checkHUM007: CheckFn = (profile) => {
  const b = base({
    id: "HUM-007",
    station: "accessibility",
    severity: "info",
    confidence: 70,
    title: "Errors say what failed",
    fixPrompt: "Replace a lone \"Something went wrong\" with the specific failure.",
    fixDifficulty: "copy-paste",
    fixTime: "10 min",
    autoFixSafety: "review",
    scoreWeight: 3,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const generic = files.filter((f) => /Something went wrong/i.test(f.content));
  if (generic.length === 0) return ok(b);
  const onlyGeneric = generic.every((f) => !/couldn't|could not|failed to|try again|not found/i.test(f.content));
  if (onlyGeneric) return bad(b, "The only error copy is \"Something went wrong\".", generic[0]!.path, generic[0]);
  return ok(b);
};

const checkHUM008: CheckFn = (profile) => {
  const b = base({
    id: "HUM-008",
    station: "accessibility",
    severity: "warning",
    confidence: 80,
    title: "outline-none does not hide focus",
    fixPrompt: "Keep a focus-visible ring when you remove the outline.",
    fixDifficulty: "copy-paste",
    fixTime: "5 min",
    autoFixSafety: "review",
    scoreWeight: 4,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  for (const file of files) {
    const re = /className=(?:\{`[^`]*`\}|"[^"]*"|'[^']*'|\{"[^"]*"\})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.content))) {
      const cls = m[0];
      if (!/outline-none|outline-0/.test(cls)) continue;
      if (/focus-visible:|focus:ring|focus:outline/.test(cls)) continue;
      return bad(b, "outline-none removes focus with nothing in its place.", file.path, file, m.index);
    }
  }
  return ok(b);
};

const checkHUM009: CheckFn = (profile) => {
  const b = base({
    id: "HUM-009",
    station: "accessibility",
    severity: "warning",
    confidence: 70,
    title: "Clickable controls do something",
    fixPrompt: "Give the control an onClick, a real href, or type=\"submit\". If it does nothing, remove it.",
    fixDifficulty: "moderate",
    fixTime: "10 min",
    autoFixSafety: "human-only",
    scoreWeight: 5,
  });
  const files = uiFiles(profile);
  if (files.length === 0) return unseen(b);
  const button = findIn(files, /<button\b(?![^>]*\bonClick\b)(?![^>]*type=["']submit["'])[^>]*>/);
  if (button) return bad(b, "A button has no handler.", button.file.path, button.file, button.index);
  const anchor = findIn(files, /<a\b(?![^>]*\bhref=)[^>]*>/);
  if (anchor) return bad(b, "A link has no href.", anchor.file.path, anchor.file, anchor.index);
  return ok(b);
};

export const laneChecks: CheckFn[] = [
  checkSEC001,
  checkSEC031,
  checkSEC003,
  checkSEC032,
  checkSEC004,
  checkSEC012,
  checkSEC033,
  checkSEC019,
  checkSEC034,
  checkHEAL001,
  checkHEAL002,
  checkHEAL003,
  checkHEAL004,
  checkHEAL005,
  checkHEAL006,
  checkHEAL007,
  checkHEAL008,
  checkHUM001,
  checkHUM002,
  checkHUM003,
  checkHUM004,
  checkHUM005,
  checkHUM006,
  checkHUM007,
  checkHUM008,
  checkHUM009,
];

export function isSecurityP0(check: CheckResult): boolean {
  if (check.id === "SEC-033") return check.severity === "critical";
  return SECURITY_P0.has(check.id);
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };

export function docketOf(stations: StationScore[], limit = 7): CheckResult[] {
  const order: Array<StationScore["station"]> = ["security", "quality", "accessibility"];
  const worst: CheckResult[] = [];
  const rest: CheckResult[] = [];
  for (const id of order) {
    const station = stations.find((s) => s.station === id);
    if (!station) continue;
    const failing = station.checks
      .filter((c) => c.confidence > 0 && c.applicable !== false && !c.passed)
      .sort((a, b) => {
        const d = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
        if (d !== 0) return d;
        return b.scoreWeight - a.scoreWeight;
      });
    if (failing[0]) worst.push(failing[0]);
    rest.push(...failing.slice(1));
  }
  rest.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));
  return [...worst, ...rest].slice(0, limit);
}

export function annotateLaneCaps(profile: CodeProfile, stations: StationScore[]): StationScore[] {
  return stations.map((s) => {
    if (s.station === "security") {
      const p0 = s.checks.some((c) => c.confidence > 0 && c.applicable !== false && !c.passed && isSecurityP0(c));
      if (p0) return { ...s, capGrade: "D" as const, capReason: "Security P0." };
    }
    if (s.station === "accessibility") {
      const dead = s.checks.some((c) => c.id === "HUM-004" && c.confidence > 0 && !c.passed);
      if (dead) return { ...s, capGrade: "D" as const, capReason: "Dead primary CTA." };
    }
    if (s.station === "quality" && !hasProductSurface(profile)) {
      return { ...s, capGrade: "C" as const, capReason: "not a product yet." };
    }
    return s;
  });
}

export function capReasonOf(stations: StationScore[]): string | null {
  const d = stations.find((s) => s.capGrade === "D" && s.capReason);
  if (d?.capReason) return d.capReason;
  const c = stations.find((s) => s.capGrade === "C" && s.capReason);
  return c?.capReason ?? null;
}

export interface LaneNumbers {
  security: number;
  healthy: number;
  human: number;
}

export function laneNumbers(stations: StationScore[]): LaneNumbers {
  const score = (station: StationScore["station"]) =>
    stations.find((s) => s.station === station)?.score ?? 0;
  return {
    security: score("security"),
    healthy: score("quality"),
    human: score("accessibility"),
  };
}
