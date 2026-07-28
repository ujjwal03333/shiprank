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
- RLS enabled on every Supabase table; no table is publicly writable
- All secrets in server-side environment variables only; nothing secret in client bundles
- Server-side session validation on every protected route
- Input validated with Zod on every mutation before it touches the database
- Error boundary at app root; individual async boundaries around data-fetching subtrees

## OUTPUT
- Migration runs without errors

### Step 2: UI
## STACK
Next.js App Router

## BUILD
1. Create /signup page
2. Wire Supabase auth

## CONSTRAINTS
- RLS enabled on every Supabase table; no table is publicly writable
- All secrets in server-side environment variables only; nothing secret in client bundles
- Server-side session validation on every protected route
- Input validated with Zod on every mutation before it touches the database
- Error boundary at app root; individual async boundaries around data-fetching subtrees

## OUTPUT
- User can sign up and see /dashboard`;

import { compile } from "../compiler";
import { createMemoryRateLimiter } from "../rate-limiter";

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

  it("injects security baseline when constraints are missing required rules", async () => {
    // SINGLE_STEP_RESPONSE only has Zod, missing the other 4 rules
    const client = makeClient(SINGLE_STEP_RESPONSE);
    const result = await compile("build a dashboard", "user-3", rateLimiter, client);

    const r = result as Exclude<typeof result, { kind: string }>;
    const c = r.steps[0]!.constraints.toLowerCase();
    expect(c).toContain("rls enabled");
    expect(c).toContain("server-side environment");
    expect(c).toContain("server-side session");
    expect(c).toContain("zod");
    expect(c).toContain("error boundary");
  });

  it("does not duplicate baseline when all rules are already present", async () => {
    // MULTI_STEP_RESPONSE step 1 has all 5 rules
    const client = makeClient(MULTI_STEP_RESPONSE);
    const result = await compile("build an app", "user-4", rateLimiter, client);

    const r = result as Exclude<typeof result, { kind: string }>;
    const c = r.steps[0]!.constraints;
    const rlsCount = (c.toLowerCase().match(/rls enabled/g) ?? []).length;
    expect(rlsCount).toBe(1);
  });

  it("returns rate_limited when the limiter is exhausted", async () => {
    const tightLimiter = createMemoryRateLimiter(1, 24 * 60 * 60 * 1000);
    const client = makeClient(SINGLE_STEP_RESPONSE);

    // Exhaust the 1-request window
    await compile("first", "user-5", tightLimiter, client);

    const result = await compile("second", "user-5", tightLimiter, client);
    expect(result).toHaveProperty("kind", "rate_limited");
    // API should not have been called a second time
    expect(client.messages.stream).toHaveBeenCalledTimes(1);
  });
});
