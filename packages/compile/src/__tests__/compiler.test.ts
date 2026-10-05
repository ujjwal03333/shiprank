import { describe, it, expect, vi, beforeEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

// Minimal mock for the streaming helper
function makeClient(responseText: string) {
  const stream = {
    finalMessage: async () => ({
      content: [{ type: "text" as const, text: responseText }],
    }),
  };
  return {
    messages: {
      stream: vi.fn().mockReturnValue(stream),
    },
  } as unknown as Anthropic;
}

const SINGLE_STEP_RESPONSE = `## STACK
Next.js App Router, Supabase, Stripe, Resend

## BUILD
1. Create /dashboard page
2. Add auth middleware

## CONSTRAINTS
- Input validated with Zod on every mutation

## OUTPUT
- Dashboard loads for authenticated users
- Unauthenticated users are redirected to /login`;

const MULTI_STEP_RESPONSE = `### Step 1: Database
## STACK
Supabase

## BUILD
1. Create users table
2. Enable RLS

## CONSTRAINTS
- RLS enabled on every Supabase table

## OUTPUT
- Migration runs without errors

### Step 2: UI
## STACK
Next.js App Router

## BUILD
1. Create /signup page
2. Wire Supabase auth

## CONSTRAINTS
- Server-side session validation

## OUTPUT
- User can sign up and see /dashboard`;

import { compile } from "../compiler";
import { createMemoryRateLimiter } from "../rate-limiter";
import { PROMPT_LIMIT, PROMPT_LIMIT_MESSAGE, REPO_RULES_MESSAGE } from "../honesty";

describe("compile()", () => {
  let rateLimiter: ReturnType<typeof createMemoryRateLimiter>;

  beforeEach(() => {
    rateLimiter = createMemoryRateLimiter(5, 24 * 60 * 60 * 1000);
  });

  it("parses a single-step response", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile("build a dashboard", "user-1", rateLimiter, client);

    expect(result).not.toHaveProperty("kind");
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.isSingleStep).toBe(true);
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0]!.stack).toContain("Next.js");
    expect(r.steps[0]!.build).toContain("dashboard");
  });

  it("partitions multi-step responses on ### Step N headers", async () => {
    const client = makeClient(MULTI_STEP_RESPONSE);
    const result = await compile("build an app", "user-2", rateLimiter, client);

    expect(result).not.toHaveProperty("kind");
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.isSingleStep).toBe(false);
    expect(r.steps).toHaveLength(2);
    expect(r.steps[0]!.name).toBe("Database");
    expect(r.steps[0]!.index).toBe(1);
    expect(r.steps[1]!.name).toBe("UI");
    expect(r.steps[1]!.index).toBe(2);
  });

  it("auto-detects stack from the prompt and injects only applicable constraints", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile(
      "build a dashboard with supabase and stripe",
      "user-3",
      rateLimiter,
      client,
    );

    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.detectedStack).toEqual(expect.arrayContaining(["supabase", "stripe"]));
    const c = r.steps[0]!.constraints.toLowerCase();
    expect(c).toContain("rls");
    expect(c).toContain("webhook signature");
    // no auth keyword in the prompt — auth-specific constraints should not appear
    expect(c).not.toContain("rate limit login");
  });

  it("with no stack keywords, injects only the 3 universal constraints", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile("build a dashboard", "user-4", rateLimiter, client);

    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.detectedStack).toEqual([]);
    const c = r.steps[0]!.constraints;
    expect(c).toContain("SEC-001");
    expect(c).toContain("SEC-010");
    expect(c).toContain("REL-001");
    expect(c).not.toContain("SEC-003"); // no RLS constraint without supabase
  });

  it("includes an inline code example and verify command for every injected constraint", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile(
      "build a booking app with supabase",
      "user-5",
      rateLimiter,
      client,
      [],
      undefined,
      "security",
    );

    const r = result as Exclude<typeof result, { kind: string }>;
    const c = r.steps[0]!.constraints;
    expect(c).toContain("```");
    expect(c).toContain("Verify:");
    expect(c).toContain("[SEC-003]");
  });

  it("security-first injects more constraints than speed-to-mvp for the same stack", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const stack: import("../stack").StackKey[] = ["supabase", "stripe", "auth"];

    const security = await compile("saas with supabase auth and stripe", "user-6a", rateLimiter, client, [], stack, "security");
    const speed = await compile("saas with supabase auth and stripe", "user-6b", rateLimiter, client, [], stack, "speed");

    const securityConstraints = (security as Exclude<typeof security, { kind: string }>).steps[0]!.constraints;
    const speedConstraints = (speed as Exclude<typeof speed, { kind: string }>).steps[0]!.constraints;

    // Count only constraints injected NOW (primary section) — speed mode
    // defers non-critical ones to "Phase 2: Harden" rather than dropping
    // them, so the *immediate* constraint count should differ even though
    // the total (primary + deferred) is the same.
    const countPrimaryBullets = (s: string) =>
      (s.split("### Phase 2: Harden")[0]!.match(/^- /gm) ?? []).length;
    expect(countPrimaryBullets(securityConstraints)).toBeGreaterThan(countPrimaryBullets(speedConstraints));
    expect(speedConstraints).toContain("Phase 2: Harden");
    expect(securityConstraints).not.toContain("Phase 2: Harden");
    expect(securityConstraints).toContain("do not proceed until verified");
  });

  it("scale-ready adds performance constraints not present in security or speed mode", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const stack: import("../stack").StackKey[] = ["supabase"];

    const scale = await compile("saas with supabase", "user-7", rateLimiter, client, [], stack, "scale");
    const c = (scale as Exclude<typeof scale, { kind: string }>).steps[0]!.constraints;
    expect(c).toContain("PERF-001");
    expect(c).toContain("PERF-002");
    expect(c).toContain("PERF-003");
  });

  it("falls back to a local brief when the model call fails", async () => {
    const client = {
      messages: {
        stream: vi.fn().mockRejectedValue(new Error("credit balance too low")),
      },
    } as unknown as Anthropic;
    const result = await compile(
      "todo app with supabase auth",
      "user-fb",
      rateLimiter,
      client,
    );

    expect(result).not.toHaveProperty("kind");
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.raw).toContain("## STACK");
    expect(r.raw).toContain("## BUILD");
    expect(r.raw).toContain("todo app with supabase auth");
    expect(r.raw).toContain("## CONSTRAINTS");
    expect(r.raw).not.toMatch(/## CONSTRAINTS\s*\n\s*(##|$)/);
    expect(r.detectedStack).toEqual(["supabase", "auth"]);
    expect(r.steps[0]!.constraints.toLowerCase()).toContain("rls");
    expect(r.steps[0]!.constraints).toContain("SEC-003");
    expect(r.raw).toContain("SEC-003");
    expect(r.steps[0]!.stack).not.toMatch(/stripe/i);
  });

  it("appends MEMORY extras to the raw brief and CONSTRAINTS", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const memory = [
      "- SEC-002 — Add .env to gitignore",
      "- SEC-005 — Add security headers",
    ];
    const result = await compile(
      "build a dashboard",
      "user-mem",
      rateLimiter,
      client,
      memory,
    );
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.raw).toContain("MEMORY");
    expect(r.raw).toContain("- SEC-002 — Add .env to gitignore");
    expect(r.steps[0]!.constraints).toContain("MEMORY");
    expect(r.steps[0]!.constraints).toContain("- SEC-005 — Add security headers");
  });

  it("omits MEMORY when there are no extras", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile("build a dashboard", "user-nomem", rateLimiter, client);
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.raw).not.toContain("MEMORY");
    expect(r.steps[0]!.constraints).not.toContain("MEMORY");
  });

  it("rejects repo rules instead of inventing a stack", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const prompt = `Fix Compile honesty only. Do not mount Compile on /. Do not add stations, checkout, or a paywall.

LOCKS
- Out: checkout, auth, Stripe
Never paywall the Card.`;
    const result = await compile(prompt, "user-rules", rateLimiter, client);
    expect(result).toEqual({ kind: "rejected", message: REPO_RULES_MESSAGE });
    expect(client.messages.stream).not.toHaveBeenCalled();
  });

  it("still compiles a product fix that happens to say do not", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile(
      "Fix the signup form. Do not store the password.",
      "user-fix-form",
      rateLimiter,
      client,
    );
    expect(result).not.toHaveProperty("kind", "rejected");
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.detectedStack).toContain("auth");
    expect(r.detectedStack).not.toContain("stripe");
  });

  it("rejects an over-long prompt with the limit and does not slice it", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const prompt = `${"build a booking app with stripe. Never ".repeat(20)}${"N".repeat(20)}ever ${"y".repeat(PROMPT_LIMIT)}`;
    expect(prompt.length).toBeGreaterThan(PROMPT_LIMIT);
    expect(prompt.includes("Never")).toBe(true);
    const result = await compile(prompt, "user-long", rateLimiter, client);
    expect(result).toEqual({ kind: "rejected", message: PROMPT_LIMIT_MESSAGE });
    expect(PROMPT_LIMIT_MESSAGE).toContain(String(PROMPT_LIMIT));
    expect(client.messages.stream).not.toHaveBeenCalled();
  });

  it("keeps the full prompt in BUILD when the model call fails", async () => {
    const client = {
      messages: { stream: vi.fn().mockRejectedValue(new Error("down")) },
    } as unknown as Anthropic;
    const prompt = "build a notes dashboard. Never log passwords. The word Never must survive intact.";
    const result = await compile(prompt, "user-full", rateLimiter, client);
    const r = result as Exclude<typeof result, { kind: string }>;
    expect(r.steps[0]!.build).toContain("Never must survive intact.");
    expect(r.steps[0]!.build).not.toContain("Neve ");
    expect(r.detectedStack).toEqual([]);
    expect(r.steps[0]!.stack).toBe("Not specified in the prompt.");
    expect(r.steps[0]!.constraints.trim().length).toBeGreaterThan(0);
    expect(r.raw).toContain("SEC-001");
  });

  it("drops memory lines that do not match the detected stack", async () => {
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const memory = [
      "- A11Y-005 — Add a skip-link to main content",
      "- QUAL-001 — Add Vitest or Jest tests",
      "- SEC-033 — Content-Security-Policy: default-src 'self'",
      "- SEO-002 — Add OG tags",
      "- SEO-004 — Add a sitemap.xml",
      "- SEC-012 — Verify Stripe webhook signatures",
      "- SEC-001 — Secrets stay in environment variables",
    ];
    const memoryOf = (raw: string) => {
      const index = raw.indexOf("\nMEMORY\n");
      return index === -1 ? "" : raw.slice(index);
    };

    const cli = await compile("build a notes cli", "user-cli-mem", rateLimiter, client, memory);
    const cliMemory = memoryOf((cli as Exclude<typeof cli, { kind: string }>).raw);
    expect(cliMemory).toContain("SEC-001");
    expect(cliMemory).not.toMatch(/skip-link|Vitest|OG tags|sitemap|Stripe|Content-Security-Policy/i);

    const web = await compile("build a next.js dashboard", "user-web-mem", rateLimiter, client, memory);
    const webMemory = memoryOf((web as Exclude<typeof web, { kind: string }>).raw);
    expect(webMemory).toContain("skip-link");
    expect(webMemory).toContain("OG tags");
    expect(webMemory).toContain("sitemap");
    expect(webMemory).toContain("Content-Security-Policy");
    expect(webMemory).not.toMatch(/Vitest|Stripe/i);

    const stripe = await compile(
      "build a stripe checkout api",
      "user-stripe-mem",
      rateLimiter,
      client,
      memory,
    );
    const stripeMemory = memoryOf((stripe as Exclude<typeof stripe, { kind: string }>).raw);
    expect(stripeMemory).toContain("Verify Stripe webhook signatures");
    expect(stripeMemory).not.toMatch(/sitemap|OG tags|skip-link|Vitest/i);
  });

  it("returns rate_limited when the limiter is exhausted", async () => {
    const tightLimiter = createMemoryRateLimiter(1, 24 * 60 * 60 * 1000);
    const client = makeClient(SINGLE_STEP_RESPONSE);

    // Exhaust the 1-request window
    await compile("first", "user-8", tightLimiter, client);

    const result = await compile("second", "user-8", tightLimiter, client);
    expect(result).toHaveProperty("kind", "rate_limited");
    // API should not have been called a second time
    expect(client.messages.stream).toHaveBeenCalledTimes(1);
  });
});
