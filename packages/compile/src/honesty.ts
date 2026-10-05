/**
 * Compile honesty: what the prompt is asking for, and which memory lines
 * belong on that brief. Pure — no model, no I/O.
 */
import type { StackKey } from "./stack";

/** Same cap the /compile box used to slice on. Over this, reject. Never slice. */
export const PROMPT_LIMIT = 2000;

export const REPO_RULES_MESSAGE =
  "Compile builds a new app. Paste repo rules into the coding agent.";

export const PROMPT_LIMIT_MESSAGE = `Prompt is over the ${PROMPT_LIMIT} character limit.`;

interface Span {
  start: number;
  end: number;
}

const DO_NOT_RE = /\b(?:do not|don't|dont|never)\b[^.\n]*/gi;
const LOCK_HEADING_RE = /^(?:#{1,6}\s*)?locks?\s*:?\s*$/i;
const LOCK_LINE_RE = /^(?:[-*]\s*)?locks?\s*:/i;
const SECTION_HEADING_RE = /^(?:#{1,6}\s+)\S/;
const ALL_CAPS_HEADING_RE = /^[A-Z][A-Z0-9 /-]{1,40}$/;

const PRODUCT_REQUEST_RE =
  /\b(?:build|create|make|design|add|ship|fix)\b[\s\S]{0,80}\b(?:app|application|website|web\s?app|saas|dashboard|page|site|login|signup|sign-up|checkout|booking|todo|api|feature|form)\b/i;

const WEB_APP_RE =
  /\b(?:web ?app|website|web site|landing page|next\.?js|react|vue|nuxt|svelte|remix|astro|angular|html|frontend|front-end|browser|dashboard|saas)\b/i;

const NON_WEB_RE = /\b(?:cli|command[- ]line|terminal app|library|npm package|sdk|rust crate)\b/i;

function isSectionHeading(trimmed: string): boolean {
  return SECTION_HEADING_RE.test(trimmed) || ALL_CAPS_HEADING_RE.test(trimmed);
}

/** Spans that are not a product request: lock lines, and "do not" / "never" clauses. */
export function nonProductSpans(text: string): Span[] {
  const spans: Span[] = [];
  const lines = text.split("\n");
  let offset = 0;
  let inLocks = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const lockHeading = LOCK_HEADING_RE.test(trimmed);
    const lockLine = LOCK_LINE_RE.test(trimmed);

    if (lockHeading) {
      inLocks = true;
      spans.push({ start: offset, end: offset + line.length });
    } else if (inLocks && isSectionHeading(trimmed) && !lockHeading) {
      inLocks = false;
    } else if (inLocks || lockLine) {
      spans.push({ start: offset, end: offset + line.length });
    } else {
      DO_NOT_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = DO_NOT_RE.exec(line))) {
        spans.push({
          start: offset + match.index,
          end: offset + match.index + match[0].length,
        });
      }
    }

    offset += line.length + 1;
  }

  return spans;
}

function covered(spans: readonly Span[], index: number): boolean {
  return spans.some((span) => index >= span.start && index < span.end);
}

/** Prompt text with lock lines and negation clauses removed. */
export function productRequestText(text: string): string {
  const spans = nonProductSpans(text);
  if (spans.length === 0) return text;
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) out += text.slice(cursor, span.start);
    cursor = Math.max(cursor, span.end);
  }
  if (cursor < text.length) out += text.slice(cursor);
  return out;
}

export function hasKeywordOutside(text: string, keyword: string, spans: readonly Span[]): boolean {
  const lower = text.toLowerCase();
  const needle = keyword.toLowerCase();
  let from = 0;
  while (from <= lower.length) {
    const index = lower.indexOf(needle, from);
    if (index === -1) return false;
    if (!covered(spans, index)) return true;
    from = index + needle.length;
  }
  return false;
}

export function isProductRequest(text: string): boolean {
  return PRODUCT_REQUEST_RE.test(productRequestText(text));
}

function hasLockSection(text: string): boolean {
  return text.split("\n").some((line) => {
    const trimmed = line.trim();
    return LOCK_HEADING_RE.test(trimmed) || LOCK_LINE_RE.test(trimmed);
  });
}

/** Instructions for an existing repo, not an app to build. */
export function isRepoRulesPrompt(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isProductRequest(trimmed)) return false;
  if (hasLockSection(trimmed)) return true;

  const prohibitions = trimmed.match(/\b(?:do not|don't|dont|never)\b/gi)?.length ?? 0;
  const agentInstruction =
    /\b(?:this repo|the repo|repo rules|coding agent|push origin|pull request|typecheck)\b/i.test(trimmed) ||
    /^(?:fix|ship|close|typecheck|commit)\b/im.test(trimmed);

  if (agentInstruction && prohibitions >= 1) return true;
  if (prohibitions >= 3) return true;
  return false;
}

/** A website or web UI was asked for. A CLI or library is not one. */
export function isWebAppRequest(text: string): boolean {
  const product = productRequestText(text);
  const web = WEB_APP_RE.test(product);
  if (NON_WEB_RE.test(product) && !web) return false;
  return web;
}

const LINE_TAGS: Array<{ kind: StackKey | "universal" | "web"; re: RegExp }> = [
  {
    kind: "universal",
    re: /\bSEC-00[12]\b|\bSEC-010\b|\bREL-\d+\b|\bsecrets?\b|environment variables|\.env\b|\bzod\b|input validation|error boundar/i,
  },
  {
    kind: "stripe",
    re: /\bSTR-\d+\b|\bSEC-012\b|\bstripe\b|sk_live|sk_test|webhook signature/i,
  },
  {
    kind: "supabase",
    re: /\bSUP-\d+\b|\bSEC-003\b|\bsupabase\b|\brls\b|row level|service_role/i,
  },
  {
    kind: "auth",
    re: /\bSEC-004\b|\bSEC-007\b|\bSEC-009\b|\bclerk\b|\blogin\b|\bsignup\b|sign-up|\bhttponly\b|\bcsrf\b|\bauth(?:entication|orization)?\b/i,
  },
  {
    kind: "firebase",
    re: /\bFB-\d+\b|\bfirebase\b|\bfirestore\b/i,
  },
  {
    kind: "fileUpload",
    re: /\bUPL-\d+\b|\bupload\b|mime type|file size limit/i,
  },
  {
    kind: "email",
    re: /\bsendgrid\b|\bresend\b|transactional email/i,
  },
  {
    kind: "realtime",
    re: /\bwebsocket\b|\brealtime\b/i,
  },
  {
    kind: "backgroundJobs",
    re: /\bcron\b|background job/i,
  },
  {
    kind: "web",
    re: /\bSEO-\d+\b|\bA11Y-\d+\b|\bHUM-\d+\b|\bSEC-033\b|sitemap|open graph|\bog tags\b|\bog:|robots\.txt|skip-?link|skip to main|skip-to-content|security headers|content-security-policy|x-frame-options|strict-transport|x-content-type-options|\bnosniff\b/i,
  },
];

function lineTags(line: string): Array<StackKey | "universal" | "web"> {
  const tags: Array<StackKey | "universal" | "web"> = [];
  for (const entry of LINE_TAGS) {
    if (entry.re.test(line)) tags.push(entry.kind);
  }
  return tags;
}

/**
 * Keep a memory line only when it matches the detected stack.
 * SEO, sitemap, skip-link, and header lines need a web app.
 * A Stripe line needs Stripe. Unmatched lines (Vitest, and the like) drop.
 */
export function filterMemoryLines(
  lines: readonly string[],
  stackKeys: readonly StackKey[],
  prompt: string,
): string[] {
  const stack = new Set(stackKeys);
  const web = isWebAppRequest(prompt);
  return lines.filter((line) => {
    const tags = lineTags(line);
    if (tags.length === 0) return false;
    for (const tag of tags) {
      if (tag === "universal") continue;
      if (tag === "web") {
        if (!web) return false;
        continue;
      }
      if (!stack.has(tag)) return false;
    }
    return true;
  });
}
