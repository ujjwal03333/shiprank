/**
 * Deterministic "why did the AI make this choice?" records.
 * No LLM. Frequency is only attached when the caller has real sample data.
 */
export interface DecisionContext {
  aiPattern: string;
  probableCause: string;
  whatShouldBe: string;
  impactChain: string;
  /** Fail rate 0–100 from genome. Omitted when sample is too small. */
  frequencyPct?: number | undefined;
  sampleSize?: number | undefined;
}

const CATALOG: Record<string, Omit<DecisionContext, "frequencyPct" | "sampleSize">> = {
  "SEC-001": {
    aiPattern: "Secrets inlined next to the code that uses them",
    probableCause:
      "Tutorials paste keys into .env and then copy the same string into source so the demo runs on first launch.",
    whatShouldBe:
      "Load secrets from environment variables that are never committed. Rotate anything that already leaked.",
    impactChain: "A public repo or a screenshot becomes a live credential dump.",
  },
  "SEC-002": {
    aiPattern: ".env committed so the agent can 'just run it'",
    probableCause: "The prompt said 'make it work' and never mentioned .gitignore.",
    whatShouldBe: "Ignore .env, keep .env.example with empty values, rotate leaked keys.",
    impactChain: "Git history retains the secret even after a later delete.",
  },
  "SEC-003": {
    aiPattern: "Tables created, RLS left off",
    probableCause: "The prompt asked for a database, not for security. Supabase defaults to open until you enable RLS.",
    whatShouldBe: "ENABLE ROW LEVEL SECURITY plus policies scoped to auth.uid().",
    impactChain: "Every row is world-readable via the anon key.",
  },
  "SEC-004": {
    aiPattern: "Auth checked only in the client",
    probableCause: "The UI login flow looks 'done', so the agent never guards the API route.",
    whatShouldBe: "Verify the session on every protected server handler.",
    impactChain: "Anyone who can hit the route skips the login screen.",
  },
  "SEC-005": {
    aiPattern: "Request body written straight to the database",
    probableCause: "Zod/schema validation is extra ceremony the demo does not need.",
    whatShouldBe: "Validate and bound every write before it touches storage.",
    impactChain: "Injection, type confusion, and stored XSS become trivial.",
  },
  "SEC-006": {
    aiPattern: "eval / dynamic require to 'be flexible'",
    probableCause: "The agent copied a snippet that treats user input as code.",
    whatShouldBe: "Map allowed values explicitly. Never eval user strings.",
    impactChain: "Remote code execution on the server or in the browser.",
  },
  "SEC-012": {
    aiPattern: "Payment webhook accepted without a signature check",
    probableCause: "The happy-path checkout tutorial stops at 'endpoint exists'.",
    whatShouldBe: "Verify Stripe (or equivalent) signatures before mutating state.",
    impactChain: "Anyone can POST a fake payment confirmation.",
  },
  "QUAL-001": {
    aiPattern: "No tests, or only a placeholder spec",
    probableCause: "The prompt asked for a working app, not a test suite.",
    whatShouldBe: "Cover the money, auth, and data-write paths first.",
    impactChain: "Refactors silently break the only flows that matter.",
  },
  "QUAL-002": {
    aiPattern: "TypeScript added without strict mode",
    probableCause: "strict: true fails the first compile, so the agent turns it off.",
    whatShouldBe: "Enable strict and fix the errors; they are the bugs.",
    impactChain: "any-typed data crosses trust boundaries unnoticed.",
  },
  "QUAL-009": {
    aiPattern: "await without a handler",
    probableCause: "The generated page assumes every fetch succeeds.",
    whatShouldBe: "try/catch, .catch, or an explicit error field check.",
    impactChain: "A flaky dependency becomes a blank page.",
  },
  "QUAL-012": {
    aiPattern: "Tests that assert the mock, not the behavior",
    probableCause: "The agent writes a file named *.test.ts so the check goes green.",
    whatShouldBe: "Exercise the real function with failing cases.",
    impactChain: "CI stays green while production is not.",
  },
  "PERF-002": {
    aiPattern: "Barrel-import the whole library",
    probableCause: "Default-importing the whole lodash package is what every snippet shows.",
    whatShouldBe: "Import the one function from its subpath, or drop the dep.",
    impactChain: "Hundreds of KB land on the first paint.",
  },
  "PERF-005": {
    aiPattern: "useEffect(fn) with no dependency array",
    probableCause: "The agent is thinking in 'run this on mount' and forgets the second argument.",
    whatShouldBe: "Pass [] or the real dependencies.",
    impactChain: "Infinite re-render or a fetch storm.",
  },
  "SEO-001": {
    aiPattern: "No favicon, blank browser tab",
    probableCause: "Favicons are not in the prompt, so they are not in the app.",
    whatShouldBe: "Add a favicon via the App Router file convention or a link tag.",
    impactChain: "The product looks unfinished the moment it is bookmarked.",
  },
  "SEO-002": {
    aiPattern: "Share card is an empty rectangle",
    probableCause: "OG tags are invisible in the running app, so the agent never adds them.",
    whatShouldBe: "title, description, and image — metadata export or raw meta tags.",
    impactChain: "Every tweet and Slack paste looks like a broken link.",
  },
  "A11Y-001": {
    aiPattern: "Images dropped in with no alt",
    probableCause: "The generator used a URL. Alt text is extra work.",
    whatShouldBe: "Descriptive alt, or alt=\"\" if the image is decorative.",
    impactChain: "Screen readers skip or invent meaning. Also an ADA/EAA gap.",
  },
  "A11Y-005": {
    aiPattern: "No skip-to-content link",
    probableCause: "It is not visible in a screenshot, so it is not generated.",
    whatShouldBe: "A skip link that becomes visible on focus.",
    impactChain: "Keyboard users tab through the entire nav on every page.",
  },
  "INFRA-001": {
    aiPattern: "Deploy is 'git push and hope'",
    probableCause: "The prompt never asked for CI.",
    whatShouldBe: "A workflow that typechecks, tests, and builds on every PR.",
    impactChain: "Broken main is discovered by the next user, not by CI.",
  },
  "COMP-001": {
    aiPattern: "No privacy policy",
    probableCause: "Legal pages are not part of the build prompt.",
    whatShouldBe: "A /privacy route that describes what you actually collect.",
    impactChain: "App stores, Stripe, and EU visitors all require one.",
  },
  "DATA-004": {
    aiPattern: "Schema edited in the dashboard, never migrated",
    probableCause: "The agent created tables by hand to get the demo up.",
    whatShouldBe: "Commit migrations so prod and preview stay in lockstep.",
    impactChain: "The next deploy cannot recreate the database.",
  },
};

const GENERIC: Omit<DecisionContext, "frequencyPct" | "sampleSize"> = {
  aiPattern: "The generated app skipped a production-hardening step",
  probableCause:
    "The original prompt asked for a working demo, not this check. Agents optimize for 'it runs'.",
  whatShouldBe: "Treat the failing check's fix prompt as the next instruction to your coding agent.",
  impactChain: "The gap is invisible in a local demo and shows up with real users.",
};

export function decisionContextFor(
  checkId: string,
  prevalence?: { failPct: number; sampleSize: number },
): DecisionContext {
  const base = CATALOG[checkId] ?? GENERIC;
  if (prevalence && prevalence.sampleSize >= 10) {
    return {
      ...base,
      frequencyPct: prevalence.failPct,
      sampleSize: prevalence.sampleSize,
    };
  }
  return { ...base };
}

export const DECISION_CONTEXT_IDS = Object.keys(CATALOG);
