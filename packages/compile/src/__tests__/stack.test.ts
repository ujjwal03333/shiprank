import { describe, it, expect } from "vitest";
import { detectStack, getApplicableConstraints, uniqueCheckIds } from "../stack";
import { scorePrompt } from "../prompt-score";

describe("detectStack", () => {
  it("detects supabase and stripe from a booking app prompt", () => {
    const keys = detectStack("build me a booking app with supabase and stripe");
    expect(keys).toContain("supabase");
    expect(keys).toContain("stripe");
    expect(keys).not.toContain("auth");
  });

  it("detects auth via login/signup/clerk keywords", () => {
    expect(detectStack("add clerk login")).toContain("auth");
    expect(detectStack("users signup then login")).toContain("auth");
  });

  it("returns empty array when no keywords match", () => {
    expect(detectStack("build me an app")).toEqual([]);
  });
});

describe("getApplicableConstraints", () => {
  it("security mode includes all applicable constraints, nothing deferred", () => {
    const sel = getApplicableConstraints(["supabase", "stripe"], "security");
    expect(sel.deferred).toHaveLength(0);
    expect(sel.primary.some((c) => c.id === "supabase-rls")).toBe(true);
    expect(sel.primary.some((c) => c.id === "stripe-webhook-signature")).toBe(true);
    expect(sel.primary.some((c) => c.id === "supabase-anon-key-client")).toBe(true);
  });

  it("speed mode only injects critical constraints now, defers the rest", () => {
    const sel = getApplicableConstraints(["supabase", "stripe"], "speed");
    expect(sel.primary.every((c) => c.critical)).toBe(true);
    expect(sel.deferred.every((c) => !c.critical)).toBe(true);
    expect(sel.deferred.length).toBeGreaterThan(0);
  });

  it("speed mode has fewer primary constraints than security mode", () => {
    const security = getApplicableConstraints(["supabase", "stripe", "auth"], "security");
    const speed = getApplicableConstraints(["supabase", "stripe", "auth"], "speed");
    expect(speed.primary.length).toBeLessThan(security.primary.length);
  });

  it("scale mode adds performance constraints", () => {
    const sel = getApplicableConstraints(["supabase"], "scale");
    expect(sel.primary.some((c) => c.category === "scale")).toBe(true);
  });

  it("always includes universal constraints regardless of stack", () => {
    const sel = getApplicableConstraints([], "security");
    expect(sel.primary.some((c) => c.category === "universal")).toBe(true);
    expect(sel.primary.length).toBe(3);
  });
});

describe("uniqueCheckIds", () => {
  it("dedupes repeated checkIds across constraints", () => {
    const sel = getApplicableConstraints(["supabase", "stripe"], "security");
    const ids = uniqueCheckIds(sel);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("scorePrompt", () => {
  it("scores a vague prompt low", () => {
    const score = scorePrompt("build me a booking app with supabase and stripe");
    expect(score.total).toBeLessThan(50);
    expect(score.securityCoverage).toBe(0);
  });

  it("scores a structured, detailed prompt higher", () => {
    const detailed = `## STACK
Next.js, Supabase, Stripe

## BUILD
1. Users can book a slot and pay a deposit
2. RLS enabled on every table via row level security policy
3. Webhook signature verified with the signing secret

## CONSTRAINTS
- Validate input with zod on every mutation
- Deploy to Vercel in production

## OUTPUT
- User should be able to book and pay; if payment fails, must show an error message`;
    const score = scorePrompt(detailed);
    expect(score.total).toBeGreaterThan(50);
    expect(score.structure).toBe(20);
  });
});
