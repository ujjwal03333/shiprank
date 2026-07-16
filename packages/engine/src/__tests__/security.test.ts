import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runSecurityStation } from "../stations/security";
import type { ProjectContext } from "../profiler/types";

const FIXTURE_ROOT = join(tmpdir(), "shiprank-security-fixtures");

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}
function writeText(path: string, text: string) {
  writeFileSync(path, text, "utf8");
}
function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

function fixtureDir(name: string) {
  return join(FIXTURE_ROOT, name);
}

const BASE_CTX: ProjectContext = {
  hasAuth: false,
  hasDatabase: false,
  hasAPI: false,
  hasTests: false,
  hasCICD: false,
  hasDocker: false,
  hasEnvFile: false,
  hasTypeScript: false,
  hasLinting: false,
  hasMonorepo: false,
  packageManager: "npm",
};

beforeAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
  ensureDir(FIXTURE_ROOT);
});

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

// ── SEC-001 ───────────────────────────────────────────────────────────────────

describe("SEC-001 — secret detection", () => {
  it("PASS: SUPABASE_ANON_KEY is NEVER flagged (public by design)", async () => {
    const root = fixtureDir("sec001-anon-key");
    ensureDir(root);
    writeText(
      join(root, ".env.local"),
      [
        "NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.abc123",
        "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.abc123",
      ].join("\n"),
    );
    const result = await runSecurityStation(root, BASE_CTX);
    const sec001 = result.checks.find((c) => c.id === "SEC-001")!;
    expect(sec001.passed).toBe(true);
  });

  it("FAIL: SUPABASE_SERVICE_ROLE_KEY with real-looking value IS flagged critical", async () => {
    const root = fixtureDir("sec001-service-role");
    ensureDir(root);
    writeText(
      join(root, ".env.local"),
      [
        "NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.serviceRolePayload.signature123",
      ].join("\n"),
    );
    const result = await runSecurityStation(root, BASE_CTX);
    const sec001 = result.checks.find((c) => c.id === "SEC-001")!;
    expect(sec001.passed).toBe(false);
    expect(sec001.severity).toBe("critical");
    expect(sec001.detail).toMatch(/service_role/i);
  });

  it("FAIL: OpenAI secret key in source flagged critical", async () => {
    const root = fixtureDir("sec001-openai");
    ensureDir(join(root, "lib"));
    writeText(
      join(root, "lib", "openai.ts"),
      'const client = new OpenAI({ apiKey: "sk-abcdefghijklmnopqrstuvwxyz1234567890" });',
    );
    const result = await runSecurityStation(root, BASE_CTX);
    const sec001 = result.checks.find((c) => c.id === "SEC-001")!;
    expect(sec001.passed).toBe(false);
    expect(sec001.severity).toBe("critical");
  });

  it("PASS: clean project with no secrets", async () => {
    const root = fixtureDir("sec001-clean");
    ensureDir(root);
    writeText(join(root, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co\n");
    writeText(join(root, "index.ts"), 'console.log("hello");');
    const result = await runSecurityStation(root, BASE_CTX);
    const sec001 = result.checks.find((c) => c.id === "SEC-001")!;
    expect(sec001.passed).toBe(true);
  });
});

// ── SEC-002 ───────────────────────────────────────────────────────────────────

describe("SEC-002 — .env in .gitignore", () => {
  it("PASS: .gitignore contains .env", async () => {
    const root = fixtureDir("sec002-pass");
    ensureDir(root);
    writeText(join(root, ".gitignore"), "node_modules\n.env\n.env.local\n");
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-002")!;
    expect(check.passed).toBe(true);
  });

  it("PASS: .gitignore contains .env* wildcard", async () => {
    const root = fixtureDir("sec002-wildcard");
    ensureDir(root);
    writeText(join(root, ".gitignore"), "node_modules\n.env*\n");
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-002")!;
    expect(check.passed).toBe(true);
  });

  it("FAIL: .gitignore exists but no .env rule", async () => {
    const root = fixtureDir("sec002-missing-rule");
    ensureDir(root);
    writeText(join(root, ".gitignore"), "node_modules\ndist\n");
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-002")!;
    expect(check.passed).toBe(false);
  });

  it("FAIL: no .gitignore at all", async () => {
    const root = fixtureDir("sec002-no-gitignore");
    ensureDir(root);
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-002")!;
    expect(check.passed).toBe(false);
  });
});

// ── SEC-003 ───────────────────────────────────────────────────────────────────

describe("SEC-003 — NEXT_PUBLIC_ secret leakage", () => {
  it("PASS: NEXT_PUBLIC_SUPABASE_ANON_KEY is never flagged", async () => {
    const root = fixtureDir("sec003-anon-safe");
    ensureDir(root);
    writeText(
      join(root, ".env.local"),
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiJ9.anon.sig\nNEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\n",
    );
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-003")!;
    expect(check.passed).toBe(true);
  });

  it("FAIL: NEXT_PUBLIC_STRIPE_SECRET_KEY is flagged", async () => {
    const root = fixtureDir("sec003-stripe-public");
    ensureDir(root);
    writeText(
      join(root, ".env.local"),
      "NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_abc123\n",
    );
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-003")!;
    expect(check.passed).toBe(false);
  });
});

// ── SEC-007 ───────────────────────────────────────────────────────────────────

describe("SEC-007 — RLS enabled", () => {
  it("PASS: SQL files enable RLS and define policies", async () => {
    const root = fixtureDir("sec007-rls-good");
    ensureDir(join(root, "supabase", "migrations"));
    writeText(
      join(root, "supabase", "migrations", "001_init.sql"),
      "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;\nCREATE POLICY select_own ON profiles FOR SELECT USING (auth.uid() = user_id);\n",
    );
    const ctx = { ...BASE_CTX, hasDatabase: true };
    const result = await runSecurityStation(root, ctx);
    const check = result.checks.find((c) => c.id === "SEC-007")!;
    expect(check.passed).toBe(true);
  });

  it("FAIL: SQL file explicitly disables RLS", async () => {
    const root = fixtureDir("sec007-rls-disabled");
    ensureDir(join(root, "supabase", "migrations"));
    writeText(
      join(root, "supabase", "migrations", "001_init.sql"),
      "ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;\n",
    );
    const ctx = { ...BASE_CTX, hasDatabase: true };
    const result = await runSecurityStation(root, ctx);
    const check = result.checks.find((c) => c.id === "SEC-007")!;
    expect(check.passed).toBe(false);
    expect(check.severity).toBe("critical");
  });

  it("SKIP: no database detected", async () => {
    const root = fixtureDir("sec007-no-db");
    ensureDir(root);
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-007")!;
    expect(check.passed).toBe(true);
    expect(check.severity).toBe("info");
  });
});

// ── SEC-011 ───────────────────────────────────────────────────────────────────

describe("SEC-011 — input validation", () => {
  it("PASS: zod in dependencies", async () => {
    const root = fixtureDir("sec011-zod");
    ensureDir(root);
    writeJson(join(root, "package.json"), {
      dependencies: { zod: "3.22.0", next: "14.2.0" },
    });
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-011")!;
    expect(check.passed).toBe(true);
  });

  it("FAIL: no validation library", async () => {
    const root = fixtureDir("sec011-no-validation");
    ensureDir(root);
    writeJson(join(root, "package.json"), {
      dependencies: { next: "14.2.0", react: "18.3.0" },
    });
    const result = await runSecurityStation(root, BASE_CTX);
    const check = result.checks.find((c) => c.id === "SEC-011")!;
    expect(check.passed).toBe(false);
  });
});

// ── SEC-012 ───────────────────────────────────────────────────────────────────

describe("SEC-012 — TypeScript strict mode", () => {
  it("PASS: strict: true in tsconfig", async () => {
    const root = fixtureDir("sec012-strict");
    ensureDir(root);
    writeText(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));
    const ctx = { ...BASE_CTX, hasTypeScript: true };
    const result = await runSecurityStation(root, ctx);
    const check = result.checks.find((c) => c.id === "SEC-012")!;
    expect(check.passed).toBe(true);
  });

  it("FAIL: tsconfig missing strict flag", async () => {
    const root = fixtureDir("sec012-no-strict");
    ensureDir(root);
    writeText(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022" } }));
    const ctx = { ...BASE_CTX, hasTypeScript: true };
    const result = await runSecurityStation(root, ctx);
    const check = result.checks.find((c) => c.id === "SEC-012")!;
    expect(check.passed).toBe(false);
  });
});

// ── Full station score ────────────────────────────────────────────────────────

describe("runSecurityStation — scoring", () => {
  it("score is 0-100 and all 12 check IDs present", async () => {
    const root = fixtureDir("sec-scoring");
    ensureDir(root);
    writeJson(join(root, "package.json"), { dependencies: { next: "14.2.0" } });
    const result = await runSecurityStation(root, BASE_CTX);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    const ids = result.checks.map((c) => c.id);
    for (let i = 1; i <= 12; i++) {
      expect(ids).toContain(`SEC-${String(i).padStart(3, "0")}`);
    }
  });

  it("perfect project with all signals scores high", async () => {
    const root = fixtureDir("sec-perfect");
    ensureDir(join(root, "supabase", "migrations"));
    ensureDir(join(root, "app", "api", "hello"));

    writeJson(join(root, "package.json"), {
      dependencies: {
        next: "14.2.0",
        zod: "3.22.0",
        "@supabase/ssr": "0.5.0",
      },
      devDependencies: { typescript: "5.6.0" },
    });
    writeText(join(root, ".gitignore"), "node_modules\n.env*\n");
    writeText(join(root, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\n");
    writeText(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { strict: true } }));
    writeText(
      join(root, "next.config.ts"),
      "export default { async headers() { return [{ source: '/**', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'Content-Security-Policy', value: \"default-src 'self'\" }] }] } }",
    );
    writeText(
      join(root, "supabase", "migrations", "001_init.sql"),
      "ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;\nCREATE POLICY rls_select ON profiles FOR SELECT USING (auth.uid() = user_id);\n",
    );
    writeText(
      join(root, "middleware.ts"),
      "import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';\nexport const config = { matcher: ['/dashboard/:path*'] };",
    );
    writeText(
      join(root, "app", "api", "hello", "route.ts"),
      "export function GET() { return Response.json({ ok: true }) }",
    );

    const ctx: ProjectContext = {
      ...BASE_CTX,
      hasAuth: true,
      hasDatabase: true,
      hasAPI: true,
      hasTypeScript: true,
    };

    const result = await runSecurityStation(root, ctx);
    expect(result.score).toBeGreaterThan(60);
  });
});
