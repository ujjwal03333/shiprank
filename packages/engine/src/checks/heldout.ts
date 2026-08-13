import type { CheckResult, CheckFn, CodeProfile } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// HELD-OUT CHECKS
//
// These run on every scan and their results are stored, but they are excluded
// from scoring and from the public /methodology page. They exist so we can
// measure divergence between the public score and the (unpublished) held-out
// score per platform/model — a signal that would be worthless if AI tools could
// see and train against it. DO NOT document these patterns on the methodology
// page or anywhere user-facing.
//
// HELD-001 is a secret-detection variant. Its patterns are deliberately chosen
// to NOT overlap with SEC-001's public list (which covers OpenAI sk-, Stripe
// sk_live/sk_test, GitHub gh*_, AWS secret keys, Supabase service-role JWTs, and
// Bearer tokens). These are different providers entirely, so a project that
// scrubbed exactly the SEC-001 patterns still trips here.
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".env"]);

// Providers intentionally absent from SEC-001's public pattern list.
const HELDOUT_SECRET_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /xox[baprs]-[0-9A-Za-z]{10,}/, label: "Slack token (xox*-)" },
  { re: /AIza[0-9A-Za-z_-]{35}/, label: "Google API key (AIza...)" },
  { re: /SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/, label: "SendGrid API key (SG.)" },
  { re: /npm_[A-Za-z0-9]{36}/, label: "npm access token (npm_...)" },
  { re: /dop_v1_[a-f0-9]{64}/, label: "DigitalOcean PAT (dop_v1_)" },
  { re: /glpat-[0-9A-Za-z_-]{20}/, label: "GitLab PAT (glpat-)" },
];

function heldoutBase(): Omit<CheckResult, "passed" | "failMessage" | "evidence"> {
  return {
    id: "HELD-001",
    station: "security",
    severity: "critical",
    confidence: 80,
    title: "Held-out secret scan",
    fixPrompt:
      "Remove the hardcoded credential and load it from an environment variable instead.",
    fixDifficulty: "copy-paste",
    fixTime: "10 min",
    autoFixSafety: "review",
    scoreWeight: 0,
    visibility: "heldout",
  };
}

const checkHELD001: CheckFn = (profile: CodeProfile): CheckResult => {
  const base = heldoutBase();
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext)) continue;
    for (const { re, label } of HELDOUT_SECRET_PATTERNS) {
      const m = re.exec(file.content);
      if (m) {
        return {
          ...base,
          passed: false,
          failMessage: `Possible ${label} committed in ${file.path}`,
          evidence: `${file.path}: ${m[0].slice(0, 12)}…`,
        };
      }
    }
  }
  return { ...base, passed: true, failMessage: "", evidence: "" };
};

export const heldoutChecks: CheckFn[] = [checkHELD001];
