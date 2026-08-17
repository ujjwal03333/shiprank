/**
 * Local, zero-API-cost prompt quality scoring. Pure regex/keyword heuristics —
 * no model call. Used both before Compile runs (score the raw user prompt)
 * and after (score the compiled output text) so the UI can show a real
 * before/after delta.
 */
import { detectStack, getApplicableConstraints, type StackKey } from "./stack";

export interface PromptScore {
  total: number;
  stackClarity: number;
  securityCoverage: number;
  completeness: number;
  structure: number;
  testability: number;
}

const MAX_POINTS_PER_DIMENSION = 20;

const FRAMEWORK_RE = /\b(next\.?js|react|vue|nuxt|remix|svelte(kit)?|astro|angular|solid(js)?)\b/i;
const DATABASE_RE = /\b(supabase|postgres(ql)?|firebase|firestore|mongo(db)?|mysql|planetscale|prisma|sqlite|dynamodb)\b/i;

function scoreStackClarity(text: string, stackKeys: StackKey[]): number {
  const hasFramework = FRAMEWORK_RE.test(text);
  const hasDatabase = DATABASE_RE.test(text) || stackKeys.includes("supabase") || stackKeys.includes("firebase");
  const integrationKeys: StackKey[] = ["stripe", "auth", "fileUpload", "realtime", "email", "backgroundJobs"];
  const hasIntegration = stackKeys.some((k) => integrationKeys.includes(k));

  const hits = [hasFramework, hasDatabase, hasIntegration].filter(Boolean).length;
  if (hits >= 3) return MAX_POINTS_PER_DIMENSION;
  if (hits >= 1) return 10;
  return 0;
}

/** Keyword proof that a given constraint is already addressed in raw prompt text (used only for scoring, not injection). */
const PROOF_KEYWORDS: Record<string, string[]> = {
  "universal-error-boundary": ["error boundary", "error page", "fallback ui"],
  "universal-secrets-env": ["environment variable", "env var", "never hardcode", ".env"],
  "universal-zod-validation": ["zod", "validate input", "input validation", "schema validation"],
  "supabase-rls": ["rls", "row level security", "row-level security", "security policy"],
  "supabase-service-role": ["service_role", "service role key"],
  "supabase-anon-key-client": ["anon key"],
  "stripe-webhook-signature": ["webhook signature", "verify webhook", "signing secret", "constructevent"],
  "stripe-no-secret-client": ["never expose", "server-only", "server only key"],
  "stripe-test-vs-live-keys": ["test mode", "live mode", "sk_test", "sk_live"],
  "auth-server-side-check": ["server-side auth", "auth check", "protected route", "401", "unauthorized"],
  "auth-httponly-cookies": ["httponly", "http-only cookie"],
  "auth-rate-limit": ["rate limit", "rate-limit"],
  "auth-csrf": ["csrf"],
  "firebase-restrictive-rules": ["security rules", "firestore rules"],
  "firebase-validate-shape": ["validate data shape", "schema validation"],
  "upload-validate-type-server": ["file type validation", "mime type", "server-side validation"],
  "upload-size-limit-server": ["file size limit", "max file size"],
  "upload-no-user-filenames": ["random filename", "uuid filename"],
  "scale-connection-pooling": ["connection pooling", "connection pool"],
  "scale-pagination": ["pagination", "paginate"],
  "scale-indexed-queries": ["index", "indexed query"],
};

/** Whether a specific constraint already appears to be addressed in the given text (used for scoring and for annotation placement). */
export function isConstraintMentioned(text: string, constraintId: string): boolean {
  const lower = text.toLowerCase();
  const keywords = PROOF_KEYWORDS[constraintId] ?? [];
  return keywords.some((kw) => lower.includes(kw));
}

function scoreSecurityCoverage(text: string, stackKeys: StackKey[]): number {
  const lower = text.toLowerCase();
  const applicable = getApplicableConstraints(stackKeys, "security").primary;
  if (applicable.length === 0) return 0;

  const mentioned = applicable.filter((c) => {
    const keywords = PROOF_KEYWORDS[c.id] ?? [];
    return keywords.some((kw) => lower.includes(kw));
  }).length;

  return Math.round((mentioned / applicable.length) * MAX_POINTS_PER_DIMENSION);
}

const PERSONA_RE = /\b(user|customer|admin|guest|host|tenant|patient|client|member|visitor|owner)s?\b/i;
const FEATURE_VERB_RE = /\b(book|pay|track|upload|send|manage|create|view|search|share|chat|schedule|browse|filter|export|invite|comment|rate|review|subscribe)\b/i;
const EDGE_CASE_RE = /\b(edge case|if not|error|fails?|invalid|empty state|no results|expired|cancel(led|s)?|declined|timeout|conflict)\b/i;
const DATA_MODEL_RE = /\b(schema|table|field|model|database|entity|relationship|column|record)\b/i;
const DEPLOYMENT_RE = /\b(vercel|deploy(ed|ment)?|production|netlify|railway|fly\.io|aws|self-host(ed)?)\b/i;

function scoreCompleteness(text: string, stackKeys: StackKey[]): number {
  let score = 0;
  if (PERSONA_RE.test(text)) score += 4;
  if (FEATURE_VERB_RE.test(text)) score += 4;
  if (EDGE_CASE_RE.test(text)) score += 4;
  if (DATA_MODEL_RE.test(text) || stackKeys.includes("supabase") || stackKeys.includes("firebase")) score += 4;
  if (DEPLOYMENT_RE.test(text)) score += 4;
  return score;
}

const BULLET_OR_NUMBERED_RE = /^\s*(?:[-*•]|\d+[.)]|#{1,6}\s|Step\s+\d+:)/m;
const CONNECTOR_RE = /\b(then|after|once|next|finally)\b/i;

function scoreStructure(text: string): number {
  if (BULLET_OR_NUMBERED_RE.test(text)) return MAX_POINTS_PER_DIMENSION;
  const sentenceCount = (text.match(/[.!?]+(\s|$)/g) ?? []).length;
  if (sentenceCount >= 2 || CONNECTOR_RE.test(text)) return 10;
  return 0;
}

const TESTABLE_PATTERNS = [
  /should be able to/gi,
  /\bmust\s+\w+/gi,
  /when\s+[^.,]+(then|,)/gi,
  /if\s+[^.,]+(should|must)/gi,
  /acceptance criteria/gi,
  /\buser (can|should)\b/gi,
  /error (message|handling)/gi,
  /\b(200|400|401|403|404|413|415|422|429|500)\b/g,
];

function scoreTestability(text: string): number {
  let statementCount = 0;
  for (const pattern of TESTABLE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) statementCount += matches.length;
  }
  return Math.min(MAX_POINTS_PER_DIMENSION, statementCount * 4);
}

/** Scores prompt text (raw user input, or compiled output) on 5 code-relevant dimensions, 20 points each. Pure local computation — no API call. */
export function scorePrompt(text: string, stackKeys?: StackKey[]): PromptScore {
  const keys = stackKeys ?? detectStack(text);
  const stackClarity = scoreStackClarity(text, keys);
  const securityCoverage = scoreSecurityCoverage(text, keys);
  const completeness = scoreCompleteness(text, keys);
  const structure = scoreStructure(text);
  const testability = scoreTestability(text);

  return {
    total: stackClarity + securityCoverage + completeness + structure + testability,
    stackClarity,
    securityCoverage,
    completeness,
    structure,
    testability,
  };
}
