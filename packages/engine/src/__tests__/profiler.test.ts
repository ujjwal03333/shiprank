import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { profileProject } from "../profiler";
import { detectFramework, readPackageJson } from "../profiler/detect-framework";
import { detectContext } from "../profiler/detect-context";
import {
  cleanProfilerFixtures,
  createNextjsFixture,
  createViteFixture,
  createRemixFixture,
  createEmptyFixture,
  createMonorepoFixture,
} from "./setup-fixtures";

let nextjsRoot: string;
let viteRoot: string;
let remixRoot: string;
let emptyRoot: string;
let monorepoRoot: string;

beforeAll(() => {
  cleanProfilerFixtures();
  nextjsRoot = createNextjsFixture();
  viteRoot = createViteFixture();
  remixRoot = createRemixFixture();
  emptyRoot = createEmptyFixture();
  monorepoRoot = createMonorepoFixture();
});

afterAll(() => {
  cleanProfilerFixtures();
});

describe("detectFramework", () => {
  it("detects Next.js project", async () => {
    const fw = await detectFramework(nextjsRoot);
    expect(fw.name).toBe("nextjs");
    expect(fw.version).toBe("14.2.0");
    expect(fw.confidence).toBeGreaterThan(0.7);
    expect(fw.signals).toContain("next in dependencies");
  });

  it("detects Vite project", async () => {
    const fw = await detectFramework(viteRoot);
    expect(fw.name).toBe("vite");
    expect(fw.version).toBe("6.0.0");
    expect(fw.confidence).toBeGreaterThan(0.5);
  });

  it("detects Remix project", async () => {
    const fw = await detectFramework(remixRoot);
    expect(fw.name).toBe("remix");
    expect(fw.version).toBe("2.15.0");
    expect(fw.signals).toContain("@remix-run/react in dependencies");
  });

  it("returns unknown for empty project", async () => {
    const fw = await detectFramework(emptyRoot);
    expect(fw.name).toBe("unknown");
    expect(fw.confidence).toBe(0);
    expect(fw.signals).toHaveLength(0);
  });

  it("Vite is not detected when Next.js scores higher", async () => {
    const fw = await detectFramework(nextjsRoot);
    expect(fw.name).not.toBe("vite");
  });
});

describe("detectContext", () => {
  it("detects auth in Next.js project (Supabase SSR)", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasAuth).toBe(true);
  });

  it("detects database in Next.js project (Supabase)", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasDatabase).toBe(true);
  });

  it("detects API routes", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasAPI).toBe(true);
  });

  it("detects tests", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasTests).toBe(true);
  });

  it("detects CI/CD", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasCICD).toBe(true);
  });

  it("detects env files", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasEnvFile).toBe(true);
  });

  it("detects TypeScript", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasTypeScript).toBe(true);
  });

  it("detects linting", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.hasLinting).toBe(true);
  });

  it("detects package manager: pnpm", async () => {
    const pkg = await readPackageJson(nextjsRoot);
    const ctx = await detectContext(nextjsRoot, pkg);
    expect(ctx.packageManager).toBe("pnpm");
  });

  it("detects package manager: npm (via lockfile)", async () => {
    const pkg = await readPackageJson(viteRoot);
    const ctx = await detectContext(viteRoot, pkg);
    expect(ctx.packageManager).toBe("npm");
  });

  it("detects package manager: yarn (via lockfile)", async () => {
    const pkg = await readPackageJson(remixRoot);
    const ctx = await detectContext(remixRoot, pkg);
    expect(ctx.packageManager).toBe("yarn");
  });

  it("detects no auth in Vite project", async () => {
    const pkg = await readPackageJson(viteRoot);
    const ctx = await detectContext(viteRoot, pkg);
    expect(ctx.hasAuth).toBe(false);
  });

  it("detects no database in Vite project", async () => {
    const pkg = await readPackageJson(viteRoot);
    const ctx = await detectContext(viteRoot, pkg);
    expect(ctx.hasDatabase).toBe(false);
  });

  it("detects monorepo", async () => {
    const pkg = await readPackageJson(monorepoRoot);
    const ctx = await detectContext(monorepoRoot, pkg);
    expect(ctx.hasMonorepo).toBe(true);
  });

  it("non-monorepo project returns false", async () => {
    const pkg = await readPackageJson(viteRoot);
    const ctx = await detectContext(viteRoot, pkg);
    expect(ctx.hasMonorepo).toBe(false);
  });
});

describe("profileProject (integration)", () => {
  it("produces a complete profile for a Next.js project", async () => {
    const profile = await profileProject(nextjsRoot);

    expect(profile.root).toBe(nextjsRoot);
    expect(profile.framework.name).toBe("nextjs");
    expect(profile.context.hasAuth).toBe(true);
    expect(profile.context.hasDatabase).toBe(true);
    expect(profile.context.hasAPI).toBe(true);
    expect(profile.context.hasTypeScript).toBe(true);
    expect(profile.files.totalFiles).toBeGreaterThan(0);
    expect(profile.files.sourceFiles.length).toBeGreaterThan(0);
    expect(profile.files.configFiles.length).toBeGreaterThan(0);
    expect(profile.files.envFiles.length).toBeGreaterThan(0);
  });

  it("handles empty project gracefully", async () => {
    const profile = await profileProject(emptyRoot);

    expect(profile.framework.name).toBe("unknown");
    expect(profile.context.hasAuth).toBe(false);
    expect(profile.context.hasDatabase).toBe(false);
    expect(profile.files.totalFiles).toBe(0);
  });
});
