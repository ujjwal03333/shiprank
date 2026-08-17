/**
 * Pure-function tests for the check engine's architecture station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { architectureChecks } from "../checks/architecture";
import type { CodeProfile, FileInfo } from "../checks/types";

function file(path: string, content: string, lines?: number): FileInfo {
  const ext = "." + (path.split(".").pop() ?? "ts");
  const computed = content.split("\n").length;
  return { path, ext, size: content.length, lines: lines ?? computed, content };
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

function runArch(id: string, profile: CodeProfile) {
  const fn = architectureChecks.find((c) => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

describe("ARCH-001 — no DB in client components", () => {
  it("PASS: server component fetching is fine", () => {
    const result = runArch(
      "ARCH-001",
      makeProfile({
        files: [file("app/page.tsx", "import { createClient } from '@supabase/supabase-js'\nexport default async function Page() { await createClient().from('x').select() }")],
      }),
    );
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("FAIL: use client + supabase.from", () => {
    const result = runArch(
      "ARCH-001",
      makeProfile({
        files: [
          file(
            "app/dashboard.tsx",
            "'use client'\nimport { createClient } from '@supabase/supabase-js'\nexport function Dash() { createClient().from('orders').select() }",
          ),
        ],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("ARCH-002 — god components", () => {
  it("PASS: short component", () => {
    const result = runArch(
      "ARCH-002",
      makeProfile({ files: [file("app/page.tsx", "export default function Page() { return <div /> }")] }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL: 501-line component", () => {
    const result = runArch(
      "ARCH-002",
      makeProfile({ files: [file("app/god.tsx", "export default function God() { return null }", 501)] }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("ARCH-004 — service layer", () => {
  it("PASS: no db and no payments", () => {
    const result = runArch("ARCH-004", makeProfile());
    expect(result.passed).toBe(true);
  });

  it("FAIL: hasDatabase without services/", () => {
    const result = runArch("ARCH-004", makeProfile({ hasDatabase: true, files: [file("app/page.tsx", "")] }));
    expect(result.passed).toBe(false);
  });

  it("FAIL: workspace package.json has stripe but no wrappers", () => {
    const result = runArch(
      "ARCH-004",
      makeProfile({
        files: [file("apps/web/package.json", JSON.stringify({ dependencies: { stripe: "17.0.0" } }))],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("PASS: services/ directory", () => {
    const result = runArch(
      "ARCH-004",
      makeProfile({
        hasDatabase: true,
        files: [file("src/services/users.ts", "export async function getUser() {}")],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("PASS: two lib/ integration wrappers", () => {
    const result = runArch(
      "ARCH-004",
      makeProfile({
        hasPayments: true,
        files: [
          file("lib/stripe.ts", "import Stripe from 'stripe'\nexport const stripe = new Stripe('')"),
          file("lib/supabase.ts", "export { createClient } from '@supabase/supabase-js'"),
        ],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

describe("ARCH-006 — env separation", () => {
  it("PASS: no process.env", () => {
    const result = runArch("ARCH-006", makeProfile({ files: [file("app/page.tsx", "export default function P() { return null }")] }));
    expect(result.passed).toBe(true);
  });

  it("PASS: .env.example present", () => {
    const result = runArch(
      "ARCH-006",
      makeProfile({
        envExample: "DATABASE_URL=",
        files: [file("lib/db.ts", "process.env.DATABASE_URL")],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("FAIL: process.env without env files", () => {
    const result = runArch(
      "ARCH-006",
      makeProfile({ files: [file("lib/db.ts", "const url = process.env.DATABASE_URL")] }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("ARCH-008 — shared UI library", () => {
  it("PASS: packages/ui", () => {
    const result = runArch(
      "ARCH-008",
      makeProfile({
        files: [file("packages/ui/src/button.tsx", "export function Button() { return null }")],
        components: ["app/page.tsx", "app/a.tsx", "app/b.tsx", "app/c.tsx", "app/d.tsx"],
      }),
    );
    expect(result.passed).toBe(true);
  });

  it("PASS: few components", () => {
    const result = runArch("ARCH-008", makeProfile({ components: ["app/page.tsx"] }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: many components, no ui folder", () => {
    const result = runArch(
      "ARCH-008",
      makeProfile({
        components: ["a.tsx", "b.tsx", "c.tsx", "d.tsx", "e.tsx"],
        files: [file("app/a.tsx", ""), file("app/b.tsx", "")],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("remaining ARCH checks stay stubs", () => {
  it("ARCH-003/005/007/009 have confidence 0", () => {
    for (const id of ["ARCH-003", "ARCH-005", "ARCH-007", "ARCH-009"]) {
      expect(runArch(id, makeProfile()).confidence).toBe(0);
    }
  });
});
