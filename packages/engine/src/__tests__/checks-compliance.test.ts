/**
 * Pure-function tests for the check engine's compliance station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { complianceChecks } from "../checks/compliance";
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

function runComp(id: string, profile: CodeProfile) {
  const fn = complianceChecks.find((c) => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

describe("COMP-001 — privacy policy", () => {
  it("PASS: app/privacy/page.tsx", () => {
    const result = runComp(
      "COMP-001",
      makeProfile({ files: [file("app/privacy/page.tsx", "export default function Privacy() { return <h1>Privacy</h1> }")] }),
    );
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("PASS: privacy-policy.md", () => {
    const result = runComp(
      "COMP-001",
      makeProfile({ files: [file("content/privacy-policy.md", "# Privacy")] }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL+WARNING: missing on a marketing site", () => {
    const result = runComp("COMP-001", makeProfile({ files: [file("app/page.tsx", "export default function Home() { return null }")] }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
  });

  it("FAIL+CRITICAL: missing when hasUserData", () => {
    const result = runComp("COMP-001", makeProfile({ hasUserData: true }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });
});

describe("COMP-002 — terms of service", () => {
  it("PASS: app/terms/page.tsx", () => {
    const result = runComp(
      "COMP-002",
      makeProfile({ files: [file("app/terms/page.tsx", "export default function Terms() { return <h1>Terms</h1> }")] }),
    );
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("FAIL+CRITICAL: missing when hasPayments", () => {
    const result = runComp("COMP-002", makeProfile({ hasPayments: true }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });

  it("FAIL+WARNING: missing otherwise", () => {
    const result = runComp("COMP-002", makeProfile());
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
  });
});

describe("COMP-003 — cookie consent", () => {
  it("PASS: no tracking detected", () => {
    const result = runComp("COMP-003", makeProfile());
    expect(result.passed).toBe(true);
    expect(result.title).toMatch(/not required/i);
  });

  it("FAIL: posthog without consent", () => {
    const result = runComp(
      "COMP-003",
      makeProfile({ dependencies: { "posthog-js": "1.0.0" } }),
    );
    expect(result.passed).toBe(false);
  });

  it("PASS: posthog plus react-cookie-consent", () => {
    const result = runComp(
      "COMP-003",
      makeProfile({
        dependencies: { "posthog-js": "1.0.0", "react-cookie-consent": "9.0.0" },
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("ignores tracking snippets that only live in tests", () => {
    const result = runComp(
      "COMP-003",
      makeProfile({
        files: [file("src/__tests__/tracking.test.ts", "gtag('config', 'G-XXX')")],
        testFiles: ["src/__tests__/tracking.test.ts"],
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.title).toMatch(/not required/i);
  });

  it("PASS: gtag plus a CookieConsent component", () => {
    const result = runComp(
      "COMP-003",
      makeProfile({
        files: [
          file("app/layout.tsx", "gtag('config', 'G-XXX')"),
          file("app/components/cookie-banner.tsx", "export function CookieConsent() { return <div /> }"),
        ],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

describe("COMP-004 — account deletion", () => {
  it("PASS: no auth and no user tables", () => {
    const result = runComp("COMP-004", makeProfile());
    expect(result.passed).toBe(true);
  });

  it("FAIL: hasAuth but no delete route", () => {
    const result = runComp("COMP-004", makeProfile({ hasAuth: true, apiRoutes: ["app/api/account/route.ts"] }));
    expect(result.passed).toBe(false);
  });

  it("PASS: DELETE on /api/account", () => {
    const result = runComp(
      "COMP-004",
      makeProfile({
        hasAuth: true,
        files: [file("app/api/account/route.ts", "export async function DELETE() { return Response.json({ ok: true }) }")],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

describe("COMP-005 — no PII in logs", () => {
  it("PASS: clean logs", () => {
    const result = runComp(
      "COMP-005",
      makeProfile({ files: [file("lib/log.ts", 'console.log("user", userId)')] }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL: console.log interpolates email", () => {
    const result = runComp(
      "COMP-005",
      makeProfile({ files: [file("lib/auth.ts", "console.log('signed in', user.email)")] }),
    );
    expect(result.passed).toBe(false);
  });

  it("ignores test files", () => {
    const result = runComp(
      "COMP-005",
      makeProfile({
        files: [file("src/__tests__/auth.test.ts", "console.log(user.email)")],
        testFiles: ["src/__tests__/auth.test.ts"],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("does not flag catalog strings that mention console.log(user.email)", () => {
    const result = runComp(
      "COMP-005",
      makeProfile({
        files: [file("src/decision-context.ts", 'const x = { aiPattern: "console.log(user.email) for debugging" }')],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

describe("remaining COMP checks stay stubs", () => {
  it("COMP-006..008 have confidence 0", () => {
    for (const id of ["COMP-006", "COMP-007", "COMP-008"]) {
      expect(runComp(id, makeProfile()).confidence).toBe(0);
    }
  });
});
