/**
 * Pure-function tests for the check engine's security station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { securityChecks } from "../checks/security";
import { runChecks } from "../checks/engine";
import type { CodeProfile, FileInfo } from "../checks/types";

// ── helpers ───────────────────────────────────────────────────────────────────

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

function runSec(id: string, profile: CodeProfile) {
  const fn = securityChecks.find(c => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

// ── SEC-001: Secret detection ─────────────────────────────────────────────────

describe("SEC-001 — secret detection (critical gate)", () => {
  it("PASS: SUPABASE_ANON_KEY in .env is NEVER flagged (public by design)", () => {
    const profile = makeProfile({
      files: [
        file(".env.local", [
          "NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co",
          // anon key JWT with role:anon payload
          "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMH0.abc123sig",
          "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMH0.abc123sig",
        ].join("\n")),
      ],
    });
    // .env files are not scanned — so this trivially passes
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(true);
  });

  it("PASS: process.env.SUPABASE_ANON_KEY reference in source is safe", () => {
    const profile = makeProfile({
      files: [
        file("lib/supabase.ts", [
          "import { createClient } from '@supabase/supabase-js'",
          "export const supabase = createClient(",
          "  process.env.NEXT_PUBLIC_SUPABASE_URL!,",
          "  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,",
          ")",
        ].join("\n")),
      ],
    });
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(true);
  });

  it("FAIL: SUPABASE_SERVICE_ROLE_KEY with JWT value in source IS critical", () => {
    const profile = makeProfile({
      files: [
        file("lib/admin.ts", [
          "import { createClient } from '@supabase/supabase-js'",
          // service_role JWT: payload contains role:service_role
          "const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefsignature'",
          "export const admin = createClient(process.env.SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY)",
        ].join("\n")),
      ],
    });
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });

  it("FAIL: SUPABASE_SERVICE_ROLE_KEY= assignment in source file is flagged", () => {
    const profile = makeProfile({
      files: [
        file("scripts/seed.ts", "const SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiJ9.serviceRoleSig.abc\n"),
      ],
    });
    // High-entropy string check catches the JWT-shaped value
    const result = runSec("SEC-001", profile);
    // Pattern: SUPABASE_SERVICE_ROLE_KEY followed by = and eyJ value
    // OR high-entropy string > 40 chars
    expect(result.passed).toBe(false);
  });

  it("FAIL: OpenAI sk- key hardcoded in source is flagged", () => {
    const profile = makeProfile({
      files: [
        file("lib/openai.ts", 'const client = new OpenAI({ apiKey: "sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF" })'),
      ],
    });
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
    expect(result.evidence).toMatch(/OpenAI/i);
  });

  it("FAIL: Stripe live key in source", () => {
    const profile = makeProfile({
      files: [
        file("lib/stripe.ts", 'const stripe = new Stripe("sk_live_FAKE_KEY_NOT_REAL_abcdefghij1234")'),
      ],
    });
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(false);
    expect(result.evidence).toMatch(/Stripe/i);
  });

  it("FAIL: private key in source", () => {
    const profile = makeProfile({
      files: [
        file("lib/jwt.ts", "const key = `-----BEGIN RSA PRIVATE KEY-----\nMIIEo...\n-----END RSA PRIVATE KEY-----`"),
      ],
    });
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(false);
  });

  it("PASS: clean source with only env var references", () => {
    const profile = makeProfile({
      files: [
        file("lib/client.ts", "const url = process.env.NEXT_PUBLIC_SUPABASE_URL;\nconst key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;"),
        file(".gitignore", "node_modules\n.env*\n"),
      ],
    });
    const result = runSec("SEC-001", profile);
    expect(result.passed).toBe(true);
  });
});

// ── SEC-002: .gitignore ───────────────────────────────────────────────────────

describe("SEC-002 — .env in .gitignore", () => {
  it("PASS: .env* in .gitignore", () => {
    const profile = makeProfile({ files: [file(".gitignore", "node_modules\n.env*\ndist\n")] });
    expect(runSec("SEC-002", profile).passed).toBe(true);
  });

  it("PASS: .env.local in .gitignore", () => {
    const profile = makeProfile({ files: [file(".gitignore", ".env.local\n.env.production.local\n")] });
    expect(runSec("SEC-002", profile).passed).toBe(true);
  });

  it("FAIL: .gitignore has no .env rule", () => {
    const profile = makeProfile({ files: [file(".gitignore", "node_modules\ndist\n")] });
    const r = runSec("SEC-002", profile);
    expect(r.passed).toBe(false);
  });

  it("FAIL: no .gitignore at all", () => {
    const profile = makeProfile({ files: [] });
    expect(runSec("SEC-002", profile).passed).toBe(false);
  });
});

// ── SEC-003: RLS ──────────────────────────────────────────────────────────────

describe("SEC-003 — Supabase RLS", () => {
  it("PASS: all tables have ENABLE ROW LEVEL SECURITY", () => {
    const profile = makeProfile({
      hasDatabase: true,
      supabaseMigrations: [
        "CREATE TABLE profiles (id uuid);\nALTER TABLE profiles ENABLE ROW LEVEL SECURITY;\nCREATE POLICY rls ON profiles FOR SELECT USING (true);",
      ],
    });
    expect(runSec("SEC-003", profile).passed).toBe(true);
  });

  it("FAIL: table without RLS", () => {
    const profile = makeProfile({
      hasDatabase: true,
      supabaseMigrations: [
        "CREATE TABLE posts (id uuid);\nCREATE TABLE comments (id uuid);\nALTER TABLE posts ENABLE ROW LEVEL SECURITY;",
      ],
    });
    const r = runSec("SEC-003", profile);
    expect(r.passed).toBe(false);
    expect(r.severity).toBe("critical");
    expect(r.evidence).toContain("comments");
  });

  it("FAIL: explicit DISABLE ROW LEVEL SECURITY", () => {
    const profile = makeProfile({
      hasDatabase: true,
      supabaseMigrations: ["CREATE TABLE t (id uuid);\nALTER TABLE t DISABLE ROW LEVEL SECURITY;"],
    });
    const r = runSec("SEC-003", profile);
    expect(r.passed).toBe(false);
  });

  it("PASS: no database, check skips gracefully", () => {
    const profile = makeProfile({ hasDatabase: false, supabaseMigrations: [] });
    expect(runSec("SEC-003", profile).passed).toBe(true);
  });
});

// ── SEC-010: Input validation ─────────────────────────────────────────────────

describe("SEC-010 — input validation", () => {
  it("PASS: zod in dependencies", () => {
    const profile = makeProfile({ dependencies: { zod: "3.22.0" } });
    expect(runSec("SEC-010", profile).passed).toBe(true);
  });

  it("PASS: valibot in dependencies", () => {
    const profile = makeProfile({ dependencies: { valibot: "0.30.0" } });
    expect(runSec("SEC-010", profile).passed).toBe(true);
  });

  it("FAIL: no validation library", () => {
    const profile = makeProfile({ dependencies: { next: "14.2.0" } });
    expect(runSec("SEC-010", profile).passed).toBe(false);
  });
});

// ── Engine integration ────────────────────────────────────────────────────────

describe("runChecks — engine integration", () => {
  it("returns 9 station scores", () => {
    const scores = runChecks(makeProfile());
    expect(scores).toHaveLength(9);
    const ids = scores.map(s => s.station);
    expect(ids).toContain("security");
    expect(ids).toContain("growth");
    expect(ids).toContain("infrastructure");
  });

  it("each station has a score between 0 and 100", () => {
    const scores = runChecks(makeProfile());
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  it("all 30 SEC check IDs are present in security station", () => {
    const scores = runChecks(makeProfile());
    const sec = scores.find(s => s.station === "security")!;
    expect(sec.checks).toHaveLength(30);
    for (let i = 1; i <= 30; i++) {
      const id = `SEC-${String(i).padStart(3, "0")}`;
      expect(sec.checks.map(c => c.id)).toContain(id);
    }
  });

  it("stubs are excluded from scoring (confidence: 0)", () => {
    const scores = runChecks(makeProfile());
    const sec = scores.find(s => s.station === "security")!;
    const stubs = sec.checks.filter(c => c.confidence === 0);
    // 18 wave-2 stubs + SEC-011 (returns confidence:0 when gitCommits is null)
    expect(stubs.length).toBe(19);
    expect(stubs.every(c => c.passed)).toBe(true);
  });

  it("security score is lower with a service role key in source", () => {
    const cleanProfile = makeProfile({ files: [file(".gitignore", ".env*\n")] });
    const dirtyProfile = makeProfile({
      files: [
        file(".gitignore", ".env*\n"),
        file("lib/admin.ts", "const SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.somesig'"),
      ],
    });

    const cleanScores = runChecks(cleanProfile);
    const dirtyScores = runChecks(dirtyProfile);

    const cleanSec = cleanScores.find(s => s.station === "security")!.score;
    const dirtySec = dirtyScores.find(s => s.station === "security")!.score;

    expect(dirtySec).toBeLessThan(cleanSec);
  });
});
