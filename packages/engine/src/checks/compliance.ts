import type { CheckResult, CheckFn, CodeProfile, FileInfo } from "./types";

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const FIX_TIME_5_MIN = "5 min";
const FIX_TIME_30_MIN = "30 min";
const FIX_TIME_1_HR = "1 hr";
const FIX_TIME_2_HRS = "2 hrs";

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
    station: "compliance" as const,
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

function findLegalPage(files: FileInfo[], kind: "privacy" | "terms"): FileInfo | undefined {
  const privacy = [
    /(^|\/)privacy(\/(page|index|route)\.|[-_]policy|\.(tsx|ts|jsx|js|md|mdx|html)$)/,
    /(^|\/)privacy-policy(\/|\.)/,
    /(^|\/)legal\/privacy(\/|\.)/,
  ];
  const terms = [
    /(^|\/)terms(\/(page|index|route)\.|[-_]of[-_]service|\.(tsx|ts|jsx|js|md|mdx|html)$)/,
    /(^|\/)terms-of-service(\/|\.)/,
    /(^|\/)tos(\/(page|index)\.|\.(tsx|ts|jsx|js|md|html)$)/,
    /(^|\/)legal\/terms(\/|\.)/,
  ];
  const patterns = kind === "privacy" ? privacy : terms;
  return files.find((f) => {
    const p = norm(f.path);
    if (p.includes("node_modules")) return false;
    return patterns.some((re) => re.test(p));
  });
}

const TRACKING_DEPS = [
  "posthog-js",
  "posthog-node",
  "mixpanel",
  "mixpanel-browser",
  "@amplitude/analytics-browser",
  "react-ga",
  "react-ga4",
  "plausible-tracker",
  "@vercel/analytics",
  "fathom-client",
  "@next/third-parties",
];

const CONSENT_DEPS = [
  "react-cookie-consent",
  "vanilla-cookieconsent",
  "@bannersnack/cookie-consent",
];

const CONSENT_RE =
  /cookie[-_]?consent|CookieConsent|cookiebot|onetrust|CookieBanner|consent[-_]?banner|gdpr[-_]?consent/i;

const TRACKING_RE =
  /posthog\.init|mixpanel\.init|gtag\s*\(|plausible\s*\(|fbq\s*\(|analytics\.page/i;

function workspaceDependencies(profile: CodeProfile): Record<string, string> {
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
      /* ignore malformed package.json */
    }
  }
  return deps;
}

function prodFiles(profile: CodeProfile): FileInfo[] {
  return profile.files.filter((f) => f.content && !isTestPath(f.path, profile.testFiles));
}

// ── COMP-001: Privacy policy present ─────────────────────────────────────────
const checkCOMP001: CheckFn = (profile) => {
  const needsIt = profile.hasUserData || profile.hasPayments || profile.hasAuth;
  const base = {
    id: "COMP-001",
    station: "compliance" as const,
    severity: (needsIt ? "critical" : "warning") as CheckResult["severity"],
    confidence: 90,
    title: "Privacy policy present",
    fixPrompt:
      "Add a /privacy route that describes what you actually collect, who you share it with, and how to contact you. If you collect any user data, a privacy policy is legally required in most jurisdictions.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_1_HR,
    autoFixSafety: "review" as const,
    scoreWeight: 22,
  };

  const hit = findLegalPage(profile.files, "privacy");
  if (hit) {
    return pass({ ...base, title: `Privacy policy present (${hit.path})` });
  }

  return fail(
    base,
    needsIt
      ? "No privacy policy page found — required for apps with auth, payments, or user data."
      : "No privacy policy page found.",
    "No app/privacy, pages/privacy, or privacy-policy file",
  );
};

// ── COMP-002: Terms of service present ───────────────────────────────────────
const checkCOMP002: CheckFn = (profile) => {
  const needsIt = profile.hasPayments;
  const base = {
    id: "COMP-002",
    station: "compliance" as const,
    severity: (needsIt ? "critical" : "warning") as CheckResult["severity"],
    confidence: 88,
    title: "Terms of service present",
    fixPrompt:
      "Add a /terms route. Required before accepting payment or hosting user-generated content. Describe acceptable use, liability, and how the service can change.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_1_HR,
    autoFixSafety: "review" as const,
    scoreWeight: 18,
  };

  const hit = findLegalPage(profile.files, "terms");
  if (hit) {
    return pass({ ...base, title: `Terms of service present (${hit.path})` });
  }

  return fail(
    base,
    needsIt
      ? "No terms of service page found — required before accepting payment."
      : "No terms of service page found.",
    "No app/terms, pages/terms, or terms-of-service file",
  );
};

// ── COMP-003: Cookie consent when non-essential tracking exists ──────────────
const checkCOMP003: CheckFn = (profile) => {
  const base = {
    id: "COMP-003",
    station: "compliance" as const,
    severity: "warning" as const,
    confidence: 82,
    title: "Cookie consent banner",
    fixPrompt:
      "Add a consent banner before loading non-essential cookies. Use a library like react-cookie-consent, or gate PostHog/GA behind an explicit opt-in.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_1_HR,
    autoFixSafety: "review" as const,
    scoreWeight: 16,
  };

  const depNames = Object.keys(workspaceDependencies(profile));
  const sources = prodFiles(profile);
  const hasTrackingDep = depNames.some((d) => TRACKING_DEPS.includes(d));
  const hasTrackingCall = sources.some((f) => TRACKING_RE.test(f.content));
  const hasTracking = hasTrackingDep || hasTrackingCall;

  if (!hasTracking) {
    return pass({ ...base, title: "Cookie consent not required (no tracking detected)" });
  }

  const hasConsentDep = depNames.some((d) => CONSENT_DEPS.includes(d));
  const hasConsentCode = sources.some((f) => CONSENT_RE.test(f.content));
  if (hasConsentDep || hasConsentCode) return pass(base);

  const evidence = hasTrackingDep
    ? `Tracking dependency: ${depNames.filter((d) => TRACKING_DEPS.includes(d)).join(", ")}`
    : "Tracking snippet found in source (gtag / posthog / mixpanel / plausible)";
  return fail(base, "Non-essential tracking is present without a cookie consent mechanism.", evidence);
};

// ── COMP-004: Account deletion endpoint ──────────────────────────────────────
const checkCOMP004: CheckFn = (profile) => {
  const base = {
    id: "COMP-004",
    station: "compliance" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Account deletion endpoint",
    fixPrompt:
      "Add DELETE /api/account (or equivalent) that removes the authenticated user's row and related data. GDPR/CCPA require a way for a person to erase their account.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_2_HRS,
    autoFixSafety: "review" as const,
    scoreWeight: 14,
  };

  const deps = workspaceDependencies(profile);
  const workspaceHasAccounts = Object.keys(deps).some((d) =>
    [
      "@supabase/supabase-js",
      "@supabase/ssr",
      "next-auth",
      "@auth/core",
      "@clerk/nextjs",
      "better-auth",
      "stripe",
    ].includes(d),
  );
  if (!profile.hasAuth && !profile.hasUserData && !workspaceHasAccounts) {
    return pass({ ...base, title: "Account deletion not required (no auth or user tables)" });
  }

  const DELETE_EXPORT = /export\s+(async\s+)?function\s+DELETE\b/;
  const DELETE_NAME = /delete(User|Account|Profile)|removeAccount|eraseUser/i;

  const hit = profile.files.find((f) => {
    const p = norm(f.path);
    if (!f.content) return false;
    if (isTestPath(f.path, profile.testFiles)) return false;
    const looksLikeAccountRoute =
      /\/(account|user|me|profile)\//.test(p) ||
      /(delete[-_]?account|account[-_]?delete)/.test(p);
    if (looksLikeAccountRoute && DELETE_EXPORT.test(f.content)) return true;
    if (DELETE_NAME.test(f.content) && (p.includes("/api/") || p.includes("action"))) return true;
    return false;
  });

  if (hit) {
    return pass({ ...base, title: `Account deletion endpoint present (${hit.path})` });
  }

  return fail(
    base,
    "No account deletion route found — required by GDPR/CCPA when you store user accounts.",
    "No DELETE handler on an /account, /user, or delete-account route",
  );
};

// ── COMP-005: No PII in logs ─────────────────────────────────────────────────
const LOG_CALL = /^\s*(?:console|logger)\.(?:log|info|debug|warn|error)\s*\(([^)]{0,240})\)/gm;

const checkCOMP005: CheckFn = (profile) => {
  const base = {
    id: "COMP-005",
    station: "compliance" as const,
    severity: "warning" as const,
    confidence: 78,
    title: "No PII logged",
    fixPrompt:
      "Redact PII from log statements. Log user IDs only, never email, name, or phone. If you need a debug breadcrumb, hash the value.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_1_HR,
    autoFixSafety: "review" as const,
    scoreWeight: 12,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    if (isTestPath(file.path, profile.testFiles)) continue;
    for (const match of file.content.matchAll(LOG_CALL)) {
      const args = match[1] ?? "";
      const stripped = args.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
      if (
        /\.email\b|\.phone\b|\bemail\b|\bphone\b|\bfullName\b|\bfull_name\b|\bfirstName\b|\blastName\b|\bssn\b|\bcreditCard\b/.test(
          stripped,
        )
      ) {
        hits.push(file.path);
        break;
      }
    }
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    `Emails, names, or other PII appear in console/logger output in ${hits.length} file(s).`,
    hits.slice(0, 4).join("; "),
  );
};

export const complianceChecks: CheckFn[] = [
  checkCOMP001,
  checkCOMP002,
  checkCOMP003,
  checkCOMP004,
  checkCOMP005,
  stub("COMP-006", 8, "warning", "Data retention policy", "No data retention or cleanup jobs found.", "Define and implement a data retention policy. Auto-delete inactive data after N days.", "architectural", FIX_TIME_2_HRS, "review"),
  stub("COMP-007", 6, "info", "Cookie HttpOnly + Secure flags", "Auth cookies missing security flags.", "Set auth cookies with HttpOnly; Secure; SameSite=Strict to prevent XSS access.", "copy-paste", FIX_TIME_5_MIN, "safe"),
  stub("COMP-008", 4, "info", "Third-party data sharing disclosure", "Privacy policy doesn't mention third-party services.", "List all third-party services that receive user data (analytics, support, payments) in your privacy policy.", "copy-paste", FIX_TIME_30_MIN, "review"),
];
