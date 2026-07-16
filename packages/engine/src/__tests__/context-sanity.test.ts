/**
 * Sanity checks for hasDatabase and hasAuth.
 * These two flags feed severity multipliers in the security station —
 * if they're wrong every downstream score is wrong.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { detectContext } from "../profiler/detect-context";
import { readPackageJson } from "../profiler/detect-framework";
import {
  cleanSanityFixtures,
  createSupabaseDepFixture,
  createSupabaseFolderFixture,
  createClerkFixture,
  createNextAuthFixture,
  createAuthJsFixture,
  createSupabaseAuthHelpersFixture,
  createNoAuthNoDbFixture,
} from "./setup-fixtures";

let supabaseDepRoot: string;
let supabaseFolderRoot: string;
let clerkRoot: string;
let nextAuthRoot: string;
let authJsRoot: string;
let supabaseAuthHelpersRoot: string;
let noAuthNoDbRoot: string;

beforeAll(() => {
  cleanSanityFixtures();
  supabaseDepRoot = createSupabaseDepFixture();
  supabaseFolderRoot = createSupabaseFolderFixture();
  clerkRoot = createClerkFixture();
  nextAuthRoot = createNextAuthFixture();
  authJsRoot = createAuthJsFixture();
  supabaseAuthHelpersRoot = createSupabaseAuthHelpersFixture();
  noAuthNoDbRoot = createNoAuthNoDbFixture();
});

afterAll(() => cleanSanityFixtures());

// ── hasDatabase ──────────────────────────────────────────────────────────────

describe("hasDatabase — @supabase/supabase-js dependency", () => {
  it("detects hasDatabase=true via @supabase/supabase-js in dependencies", async () => {
    const pkg = await readPackageJson(supabaseDepRoot);
    const ctx = await detectContext(supabaseDepRoot, pkg);
    expect(ctx.hasDatabase).toBe(true);
  });
});

describe("hasDatabase — supabase/ folder", () => {
  it("detects hasDatabase=true when project has a supabase/ folder", async () => {
    const pkg = await readPackageJson(supabaseFolderRoot);
    const ctx = await detectContext(supabaseFolderRoot, pkg);
    expect(ctx.hasDatabase).toBe(true);
  });
});

describe("hasDatabase — negative", () => {
  it("hasDatabase=false for a plain React project with no DB deps or folders", async () => {
    const pkg = await readPackageJson(noAuthNoDbRoot);
    const ctx = await detectContext(noAuthNoDbRoot, pkg);
    expect(ctx.hasDatabase).toBe(false);
  });
});

// ── hasAuth ───────────────────────────────────────────────────────────────────

describe("hasAuth — Clerk", () => {
  it("detects hasAuth=true via @clerk/nextjs", async () => {
    const pkg = await readPackageJson(clerkRoot);
    const ctx = await detectContext(clerkRoot, pkg);
    expect(ctx.hasAuth).toBe(true);
  });
});

describe("hasAuth — next-auth", () => {
  it("detects hasAuth=true via next-auth", async () => {
    const pkg = await readPackageJson(nextAuthRoot);
    const ctx = await detectContext(nextAuthRoot, pkg);
    expect(ctx.hasAuth).toBe(true);
  });
});

describe("hasAuth — Auth.js (@auth/core)", () => {
  it("detects hasAuth=true via @auth/core", async () => {
    const pkg = await readPackageJson(authJsRoot);
    const ctx = await detectContext(authJsRoot, pkg);
    expect(ctx.hasAuth).toBe(true);
  });
});

describe("hasAuth — @supabase/auth-helpers-nextjs", () => {
  it("detects hasAuth=true via @supabase/auth-helpers-nextjs", async () => {
    const pkg = await readPackageJson(supabaseAuthHelpersRoot);
    const ctx = await detectContext(supabaseAuthHelpersRoot, pkg);
    expect(ctx.hasAuth).toBe(true);
  });
});

describe("hasAuth — negative", () => {
  it("hasAuth=false for a plain React project with no auth deps", async () => {
    const pkg = await readPackageJson(noAuthNoDbRoot);
    const ctx = await detectContext(noAuthNoDbRoot, pkg);
    expect(ctx.hasAuth).toBe(false);
  });
});
