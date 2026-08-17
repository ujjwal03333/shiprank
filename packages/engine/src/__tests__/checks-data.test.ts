/**
 * Pure-function tests for the check engine's data station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { dataChecks } from "../checks/data";
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

function runData(id: string, profile: CodeProfile) {
  const fn = dataChecks.find((c) => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

const GOOD_SQL = `
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  email text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
`;

describe("DATA-003 — no float money", () => {
  it("PASS: no schema", () => {
    const result = runData("DATA-003", makeProfile());
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("PASS: numeric money column", () => {
    const result = runData("DATA-003", makeProfile({ supabaseMigrations: [GOOD_SQL] }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: amount double precision", () => {
    const result = runData(
      "DATA-003",
      makeProfile({
        supabaseMigrations: [
          "CREATE TABLE orders (id uuid, amount double precision);",
        ],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("FAIL: Prisma Float price", () => {
    const result = runData(
      "DATA-003",
      makeProfile({
        files: [file("prisma/schema.prisma", "model Order { id String @id\n  price Float }")],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("DATA-004 — migrations in repo", () => {
  it("PASS: no database", () => {
    const result = runData("DATA-004", makeProfile({ hasDatabase: false }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: hasDatabase without migrations", () => {
    const result = runData("DATA-004", makeProfile({ hasDatabase: true }));
    expect(result.passed).toBe(false);
  });

  it("PASS: supabase migrations present", () => {
    const result = runData(
      "DATA-004",
      makeProfile({ hasDatabase: true, supabaseMigrations: [GOOD_SQL] }),
    );
    expect(result.passed).toBe(true);
  });

  it("PASS: nested workspace migrations even when hasDatabase is false", () => {
    const result = runData(
      "DATA-004",
      makeProfile({
        hasDatabase: false,
        files: [file("packages/database/supabase/migrations/00001.sql", GOOD_SQL)],
      }),
    );
    expect(result.passed).toBe(true);
  });
});

describe("DATA-006 — N+1 queries", () => {
  it("PASS: no loops", () => {
    const result = runData(
      "DATA-006",
      makeProfile({ files: [file("lib/db.ts", "const rows = await prisma.order.findMany()")] }),
    );
    expect(result.passed).toBe(true);
  });

  it("PASS: for-loop that awaits a non-query", () => {
    const src = `
      async function countFiles(entries: string[]) {
        let n = 0;
        for (const entry of entries) {
          n += await countFiles([entry]);
        }
        return n;
      }
    `;
    const result = runData("DATA-006", makeProfile({ files: [file("lib/walk.ts", src)] }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: await prisma inside for-loop", () => {
    const src = `
      export async function load(ids: string[]) {
        const out = [];
        for (const id of ids) {
          out.push(await prisma.user.findUnique({ where: { id } }));
        }
        return out;
      }
    `;
    const result = runData("DATA-006", makeProfile({ files: [file("lib/users.ts", src)] }));
    expect(result.passed).toBe(false);
  });
});

describe("DATA-007 — timestamps", () => {
  it("PASS: created_at present even with NUMERIC(12,2)", () => {
    const result = runData("DATA-007", makeProfile({ supabaseMigrations: [GOOD_SQL] }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: table without created_at", () => {
    const result = runData(
      "DATA-007",
      makeProfile({
        supabaseMigrations: ["CREATE TABLE notes (id uuid PRIMARY KEY, body text);"],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("PASS: no schema", () => {
    expect(runData("DATA-007", makeProfile()).passed).toBe(true);
  });
});

describe("DATA-008 — unique email", () => {
  it("PASS: UNIQUE on email", () => {
    const result = runData("DATA-008", makeProfile({ supabaseMigrations: [GOOD_SQL] }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: email without unique", () => {
    const result = runData(
      "DATA-008",
      makeProfile({
        supabaseMigrations: [
          "CREATE TABLE users (id uuid, email text, created_at timestamptz);",
        ],
      }),
    );
    expect(result.passed).toBe(false);
  });

  it("FAIL: Prisma email String without @unique", () => {
    const result = runData(
      "DATA-008",
      makeProfile({
        files: [file("prisma/schema.prisma", "model User {\n  id String @id\n  email String\n}")],
      }),
    );
    expect(result.passed).toBe(false);
  });
});

describe("remaining DATA checks stay stubs", () => {
  it("DATA-001/002/005/009/010 have confidence 0", () => {
    for (const id of ["DATA-001", "DATA-002", "DATA-005", "DATA-009", "DATA-010"]) {
      expect(runData(id, makeProfile()).confidence).toBe(0);
    }
  });
});
