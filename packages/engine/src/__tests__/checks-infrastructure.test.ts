/**
 * Pure-function tests for the check engine's infrastructure station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { infrastructureChecks } from "../checks/infrastructure";
import type { CodeProfile, FileInfo } from "../checks/types";

function file(path: string, content: string): FileInfo {
  const ext = "." + (path.split(".").pop() ?? "ts");
  return { path, ext, size: content.length, lines: content.split("\n").length, content };
}

function makeProfile(overrides: Partial<CodeProfile> = {}): CodeProfile {
  return {
    root: "/project",
    files: [],
    packageJson: null,
    dependencies: {},
    tsConfig: null,
    supabaseMigrations: [],
    apiRoutes: [],
    components: [],
    testFiles: [],
    configFiles: {},
    envExample: null,
    gitCommits: null,
    framework: "nextjs",
    hasAuth: false,
    hasDatabase: false,
    hasPayments: false,
    hasUserData: false,
    ...overrides,
  };
}

function runInfra(id: string, profile: CodeProfile) {
  const fn = infrastructureChecks.find((c) => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

describe("INFRA-001 — CI pipeline", () => {
  it("PASS: GitHub Actions workflow", () => {
    const result = runInfra(
      "INFRA-001",
      makeProfile({ files: [file(".github/workflows/ci.yml", "name: CI\non: [push]")] }),
    );
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("FAIL: no CI config", () => {
    const result = runInfra("INFRA-001", makeProfile());
    expect(result.passed).toBe(false);
  });
});

describe("INFRA-002 — error tracking", () => {
  it("PASS: @sentry/nextjs dependency", () => {
    const result = runInfra("INFRA-002", makeProfile({ dependencies: { "@sentry/nextjs": "8.0.0" } }));
    expect(result.passed).toBe(true);
  });

  it("PASS: Sentry.init in source", () => {
    const result = runInfra(
      "INFRA-002",
      makeProfile({ files: [file("sentry.server.config.ts", "Sentry.init({ dsn: process.env.SENTRY_DSN })")] }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL: nothing configured", () => {
    const result = runInfra("INFRA-002", makeProfile());
    expect(result.passed).toBe(false);
  });

  it("does not treat a test fixture as production Sentry", () => {
    const result = runInfra(
      "INFRA-002",
      makeProfile({
        files: [file("src/__tests__/infra.test.ts", "Sentry.init({ dsn: 'x' })")],
        testFiles: ["src/__tests__/infra.test.ts"],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("INFRA-003 — analytics", () => {
  it("PASS: @vercel/analytics", () => {
    const result = runInfra("INFRA-003", makeProfile({ dependencies: { "@vercel/analytics": "1.0.0" } }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: no analytics", () => {
    const result = runInfra("INFRA-003", makeProfile());
    expect(result.passed).toBe(false);
  });

  it("does not treat a catalog string '@vercel/analytics' as configured", () => {
    const result = runInfra(
      "INFRA-003",
      makeProfile({
        files: [file("src/checks.ts", 'const ANALYTICS_DEPS = ["@vercel/analytics", "posthog-js"]')],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("INFRA-004 — health check", () => {
  it("PASS: app/api/health/route.ts", () => {
    const result = runInfra(
      "INFRA-004",
      makeProfile({
        files: [file("app/api/health/route.ts", "export function GET() { return Response.json({ ok: true }) }")],
        apiRoutes: ["app/api/health/route.ts"],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("PASS: skipped when there is no server", () => {
    const result = runInfra("INFRA-004", makeProfile({ framework: "vite-react", apiRoutes: [] }));
    expect(result.passed).toBe(true);
    expect(result.title).toMatch(/not required/i);
  });

  it("FAIL: nextjs app with no health route", () => {
    const result = runInfra(
      "INFRA-004",
      makeProfile({
        framework: "nextjs",
        apiRoutes: ["app/api/hello/route.ts"],
        files: [file("app/api/hello/route.ts", "export function GET() { return Response.json({}) }")],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("INFRA-005 — hardcoded localhost", () => {
  it("PASS: process.env fallback to localhost", () => {
    const result = runInfra(
      "INFRA-005",
      makeProfile({
        files: [file("lib/url.ts", "export const url = process.env.APP_URL ?? 'http://localhost:3000'")],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL: hardcoded fetch URL", () => {
    const result = runInfra(
      "INFRA-005",
      makeProfile({
        files: [file("lib/api.ts", 'export const API = "http://localhost:4000"')],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("ignores test files", () => {
    const result = runInfra(
      "INFRA-005",
      makeProfile({
        files: [file("src/api.test.ts", 'fetch("http://localhost:3000")')],
        testFiles: ["src/api.test.ts"],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

describe("INFRA-008 — dependabot", () => {
  it("PASS: dependabot.yml", () => {
    const result = runInfra(
      "INFRA-008",
      makeProfile({ files: [file(".github/dependabot.yml", "version: 2")] }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL: missing", () => {
    const result = runInfra("INFRA-008", makeProfile());
    expect(result.passed).toBe(false);
  });
});

describe("remaining INFRA checks stay stubs", () => {
  it("INFRA-006 and INFRA-007 have confidence 0", () => {
    expect(runInfra("INFRA-006", makeProfile()).confidence).toBe(0);
    expect(runInfra("INFRA-007", makeProfile()).confidence).toBe(0);
  });
});
