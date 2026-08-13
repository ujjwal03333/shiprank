/**
 * Pure-function tests for the check engine's quality station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { qualityChecks } from "../checks/quality";
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

function runQual(id: string, profile: CodeProfile) {
  const fn = qualityChecks.find(c => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

// ── QUAL-001: Test coverage ──────────────────────────────────────────────────

describe("QUAL-001 — test coverage", () => {
  it("PASS: test files present", () => {
    const result = runQual("QUAL-001", makeProfile({
      testFiles: ["src/__tests__/app.test.ts"],
    }));
    expect(result.passed).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("FAIL: no test files", () => {
    const result = runQual("QUAL-001", makeProfile({ testFiles: [] }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("warning");
  });

  it("FAIL+CRITICAL: no tests when hasPayments", () => {
    const result = runQual("QUAL-001", makeProfile({
      testFiles: [],
      hasPayments: true,
    }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });

  it("FAIL+CRITICAL: no tests when hasUserData", () => {
    const result = runQual("QUAL-001", makeProfile({
      testFiles: [],
      hasUserData: true,
    }));
    expect(result.passed).toBe(false);
    expect(result.severity).toBe("critical");
  });

  it("PASS: .spec. files count as tests", () => {
    const result = runQual("QUAL-001", makeProfile({
      testFiles: ["src/utils.spec.ts"],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-002: TypeScript strict mode ────────────────────────────────────────

describe("QUAL-002 — TypeScript strict mode", () => {
  it("PASS: strict: true in tsconfig", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: { compilerOptions: { strict: true } },
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: strict not set", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: { compilerOptions: {} },
    }));
    expect(result.passed).toBe(false);
  });

  it("FAIL: strict explicitly false", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: { compilerOptions: { strict: false } },
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: individual strict flags all enabled", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: {
        compilerOptions: {
          noImplicitAny: true,
          strictNullChecks: true,
          strictFunctionTypes: true,
          strictPropertyInitialization: true,
          strictBindCallApply: true,
          noImplicitThis: true,
        },
      },
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: strict: true in extended base config (tsconfig extends chain)", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: {
        extends: "@shiprank/tsconfig/base.json",
        compilerOptions: { outDir: "dist", noEmit: true },
      },
      files: [
        file("tsconfig.json", JSON.stringify({
          extends: "@shiprank/tsconfig/base.json",
          compilerOptions: { outDir: "dist", noEmit: true },
        })),
        file("tsconfig.base.json", JSON.stringify({
          compilerOptions: { strict: true },
        })),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: strict in a base.json file in the project", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: {
        extends: "./base.json",
        compilerOptions: {},
      },
      files: [
        file("tsconfig.json", JSON.stringify({ extends: "./base.json" })),
        file("base.json", JSON.stringify({ compilerOptions: { strict: true } })),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: no tsconfig and no TS files (N/A)", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: null,
      files: [file("index.js", "console.log('hello')")],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: no tsconfig but TS files present", () => {
    const result = runQual("QUAL-002", makeProfile({
      tsConfig: null,
      files: [file("app.ts", "const x: string = 'hello'")],
    }));
    expect(result.passed).toBe(false);
  });
});

// ── QUAL-003: Excessive 'any' types ─────────────────────────────────────────

describe("QUAL-003 — excessive 'any' types", () => {
  it("PASS: no 'any' in source", () => {
    const result = runQual("QUAL-003", makeProfile({
      files: [
        file("src/util.ts", "export function add(a: number, b: number): number { return a + b; }"),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: minor 'any' usage (under threshold)", () => {
    const lines = Array(200).fill("const x: string = 'hello';");
    lines[50] = "const data: any = fetchData();";
    const result = runQual("QUAL-003", makeProfile({
      files: [file("src/util.ts", lines.join("\n"))],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: excessive ': any' usage", () => {
    const lines = Array(50).fill("function f(x: any): any { return x as any; }");
    const result = runQual("QUAL-003", makeProfile({
      files: [file("src/bad.ts", lines.join("\n"))],
    }));
    expect(result.passed).toBe(false);
    expect(result.evidence).toContain("bad.ts");
  });

  it("ignores 'any' in test files", () => {
    const lines = Array(50).fill("const mock: any = {};");
    const result = runQual("QUAL-003", makeProfile({
      files: [file("src/__tests__/mock.test.ts", lines.join("\n"))],
      testFiles: ["src/__tests__/mock.test.ts"],
    }));
    expect(result.passed).toBe(true);
  });

  it("does not false-positive on words containing 'any' (company, many)", () => {
    const result = runQual("QUAL-003", makeProfile({
      files: [
        file("src/util.ts", [
          "const company = 'Acme';",
          "const many = [1, 2, 3];",
          "const anything = true;",
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-005: console.log ──────────────────────────────────────────────────

describe("QUAL-005 — console.log in production code", () => {
  it("PASS: no console.log", () => {
    const result = runQual("QUAL-005", makeProfile({
      files: [file("src/app.ts", "export const x = 1;")],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: console.log in production files", () => {
    const result = runQual("QUAL-005", makeProfile({
      files: [
        file("src/handler.ts", 'console.log("debug"); console.log("more");'),
      ],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("2 console.log");
  });

  it("ignores console.log in test files", () => {
    const result = runQual("QUAL-005", makeProfile({
      files: [file("src/__tests__/app.test.ts", 'console.log("test output")')],
      testFiles: ["src/__tests__/app.test.ts"],
    }));
    expect(result.passed).toBe(true);
  });

  it("ignores console.log in logger wrapper files", () => {
    const result = runQual("QUAL-005", makeProfile({
      files: [file("src/lib/logger.ts", 'export function log(msg: string) { console.log(msg); }')],
    }));
    expect(result.passed).toBe(true);
  });

  it("does not flag console.error or console.warn", () => {
    const result = runQual("QUAL-005", makeProfile({
      files: [file("src/app.ts", 'console.error("oops"); console.warn("careful");')],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-006: Error boundaries ──────────────────────────────────────────────

describe("QUAL-006 — error boundaries", () => {
  it("PASS: ErrorBoundary component found", () => {
    const result = runQual("QUAL-006", makeProfile({
      framework: "nextjs",
      files: [file("app/error.tsx", "export default function ErrorBoundary() { return <p>Error</p> }")],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: react-error-boundary imported", () => {
    const result = runQual("QUAL-006", makeProfile({
      framework: "vite-react",
      files: [file("src/App.tsx", "import { ErrorBoundary } from 'react-error-boundary'")],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: componentDidCatch used", () => {
    const result = runQual("QUAL-006", makeProfile({
      framework: "nextjs",
      files: [file("src/ErrorWrapper.tsx", "componentDidCatch(error, info) {}")],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: no error boundary in React app", () => {
    const result = runQual("QUAL-006", makeProfile({
      framework: "nextjs",
      files: [file("app/page.tsx", "export default function Home() { return <h1>Hi</h1> }")],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: non-React framework skipped", () => {
    const result = runQual("QUAL-006", makeProfile({
      framework: "vue",
      files: [],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-007: Loading states ─────────────────────────────────────────────────

describe("QUAL-007 — loading states", () => {
  it("PASS: loading.tsx present (Next.js convention)", () => {
    const result = runQual("QUAL-007", makeProfile({
      framework: "nextjs",
      files: [file("app/loading.tsx", "export default function Loading() { return <p>Loading...</p> }")],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: fetch with isLoading state", () => {
    const result = runQual("QUAL-007", makeProfile({
      framework: "vite-react",
      files: [
        file("src/UserList.tsx", [
          "const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });",
          "if (isLoading) return <Spinner />;",
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: fetch without loading state in >50% of components", () => {
    const result = runQual("QUAL-007", makeProfile({
      framework: "nextjs",
      files: [
        file("app/page.tsx", "const data = await fetch('/api/data');"),
        file("app/users/page.tsx", "const users = await fetch('/api/users');"),
        file("app/settings/page.tsx", "const res = await fetch('/api/settings');"),
      ],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: Suspense boundaries count as loading state", () => {
    const result = runQual("QUAL-007", makeProfile({
      framework: "nextjs",
      files: [
        file("app/layout.tsx", [
          "import { Suspense } from 'react';",
          "const data = await fetch('/api/data');",
          "<Suspense fallback={<Loading />}>",
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: non-React framework skipped", () => {
    const result = runQual("QUAL-007", makeProfile({
      framework: "svelte",
      files: [],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: no async data fetching detected", () => {
    const result = runQual("QUAL-007", makeProfile({
      framework: "nextjs",
      files: [file("app/page.tsx", "export default function Home() { return <h1>Static</h1>; }")],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-008: Silent error swallowing ────────────────────────────────────────

describe("QUAL-008 — silent error swallowing", () => {
  it("PASS: catch blocks with error handling", () => {
    const result = runQual("QUAL-008", makeProfile({
      files: [
        file("src/handler.ts", `
try { doSomething(); }
catch (e) { console.error(e); }
`),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: empty catch block", () => {
    const result = runQual("QUAL-008", makeProfile({
      files: [
        file("src/handler.ts", `
try { doSomething(); }
catch (e) {}
try { doOther(); }
catch {}
`),
      ],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("2 empty catch");
  });

  it("ignores catch blocks in test files", () => {
    const result = runQual("QUAL-008", makeProfile({
      files: [file("src/__tests__/app.test.ts", "try { x(); } catch (e) {}")],
      testFiles: ["src/__tests__/app.test.ts"],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-009: Inconsistent async error handling ──────────────────────────────

describe("QUAL-009 — inconsistent async error handling", () => {
  it("PASS: consistent try/catch usage", () => {
    const result = runQual("QUAL-009", makeProfile({
      files: [
        file("src/api.ts", `
async function fetchUsers() {
  try { const res = await fetch('/api'); } catch (e) { throw e; }
}
async function fetchPosts() {
  try { const res = await fetch('/posts'); } catch (e) { throw e; }
}
`),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: async functions with zero error handling", () => {
    const result = runQual("QUAL-009", makeProfile({
      files: [
        file("src/a.ts", "async function f1() { await fetch('/a'); }"),
        file("src/b.ts", "async function f2() { await fetch('/b'); }"),
        file("src/c.ts", "async function f3() { await fetch('/c'); }"),
      ],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("no error handling");
  });

  it("FAIL: mixed try/catch and .catch() patterns", () => {
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) lines.push(`async function fn${i}() { try { await fetch('/a'); } catch(e) { throw e; } }`);
    for (let i = 5; i < 9; i++) lines.push(`async function fn${i}() { fetch('/b').catch(e => console.error(e)); }`);
    const result = runQual("QUAL-009", makeProfile({
      files: [file("src/mixed.ts", lines.join("\n"))],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("Mixed");
  });
});

// ── QUAL-010: Magic numbers/strings ──────────────────────────────────────────

describe("QUAL-010 — magic numbers", () => {
  it("PASS: no repeated magic numbers", () => {
    const result = runQual("QUAL-010", makeProfile({
      files: [file("src/util.ts", "const x = 42;\nconst y = 99;")],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: common safe numbers (100, 200, 404) not flagged", () => {
    const result = runQual("QUAL-010", makeProfile({
      files: [
        file("src/api.ts", Array(10).fill("if (status === 200) return 200; else return 404;").join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: many repeated magic numbers", () => {
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      lines.push(`const val${i} = ${42 + i * 7};`);
    }
    // Repeat 6 different numbers 3+ times each
    for (let n = 50; n <= 55; n++) {
      for (let r = 0; r < 4; r++) lines.push(`doThing(${n});`);
    }
    const result = runQual("QUAL-010", makeProfile({
      files: [file("src/magic.ts", lines.join("\n"))],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("magic number");
  });
});

// ── QUAL-011: Overly complex functions ───────────────────────────────────────

describe("QUAL-011 — overly complex functions", () => {
  it("PASS: simple files", () => {
    const result = runQual("QUAL-011", makeProfile({
      files: [file("src/util.ts", "export function add(a: number, b: number) { return a + b; }")],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: file with extreme branching", () => {
    const branches: string[] = [];
    for (let i = 0; i < 80; i++) branches.push(`if (x === ${i}) { return ${i}; }`);
    const code = `function megaHandler(x: number) {\n${branches.join("\n")}\n}`;
    const result = runQual("QUAL-011", makeProfile({
      files: [file("src/complex.ts", code)],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("complexity");
  });
});

// ── QUAL-012: Test coverage percentage ───────────────────────────────────────

describe("QUAL-012 — test coverage percentage", () => {
  it("PASS: good test-to-source ratio", () => {
    const result = runQual("QUAL-012", makeProfile({
      files: [
        file("src/a.ts", "export const a = 1;"),
        file("src/b.ts", "export const b = 2;"),
        file("src/c.ts", "export const c = 3;"),
        file("src/__tests__/a.test.ts", "test('a', () => {});"),
      ],
      testFiles: ["src/__tests__/a.test.ts"],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: no test files at all", () => {
    const result = runQual("QUAL-012", makeProfile({
      files: [
        file("src/a.ts", "export const a = 1;"),
        file("src/b.ts", "export const b = 2;"),
      ],
      testFiles: [],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("0%");
  });

  it("FAIL: low ratio with coverage tooling", () => {
    const sourceFiles = Array.from({ length: 20 }, (_, i) =>
      file(`src/mod${i}.ts`, `export const x${i} = ${i};`)
    );
    const result = runQual("QUAL-012", makeProfile({
      files: [...sourceFiles, file("src/__tests__/one.test.ts", "test('x', () => {});")],
      testFiles: ["src/__tests__/one.test.ts"],
      dependencies: { "@vitest/coverage-v8": "^1.0.0" },
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: no source files (nothing to test)", () => {
    const result = runQual("QUAL-012", makeProfile({
      files: [],
      testFiles: [],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── QUAL-013: Deeper dead code ───────────────────────────────────────────────

describe("QUAL-013 — deeper dead code", () => {
  it("PASS: all imports used", () => {
    const result = runQual("QUAL-013", makeProfile({
      files: [
        file("src/app.ts", `
import { useState, useEffect } from 'react';
useState(); useEffect();
`),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: many unused imports across files", () => {
    const makeFile = (name: string) => file(`src/${name}.ts`, `
import { alpha, beta, gamma, delta, epsilon } from './lib';
const x = 1;
`);
    const result = runQual("QUAL-013", makeProfile({
      files: [makeFile("a"), makeFile("b"), makeFile("c"), makeFile("d")],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("unused imports");
  });

  it("PASS: return inside if-branch does not flag reachable code outside the branch", () => {
    const codeWithEarlyReturns = `
function handleRequest(req) {
  if (!req.valid) {
    return { error: "invalid" };
  }

  const data = processData(req);
  const result = transform(data);
  const output = format(result);
  return output;
}

function checkAuth(user) {
  if (!user.token) {
    throw new Error("unauthorized");
  }

  const session = validateSession(user.token);
  const permissions = getPermissions(session);
  const role = determineRole(permissions);
  return { session, role };
}
`;
    // 4 files with this pattern should NOT trigger the check
    const result = runQual("QUAL-013", makeProfile({
      files: [
        file("src/a.ts", codeWithEarlyReturns),
        file("src/b.ts", codeWithEarlyReturns),
        file("src/c.ts", codeWithEarlyReturns),
        file("src/d.ts", codeWithEarlyReturns),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: truly unreachable code at the same brace depth", () => {
    const deadCode = `
function broken() {
  return 42;
  const a = 1;
  const b = 2;
  const c = 3;
  doSomething();
}
`;
    const result = runQual("QUAL-013", makeProfile({
      files: [
        file("src/a.ts", deadCode),
        file("src/b.ts", deadCode),
        file("src/c.ts", deadCode),
        file("src/d.ts", deadCode),
      ],
    }));
    expect(result.passed).toBe(false);
    expect(result.failMessage).toContain("unreachable");
  });

  it("PASS: try/catch/finally/else after return does not flag reachable catch/else branches", () => {
    const tryCatchCode = `
function readConfig(path) {
  try {
    const raw = fs.readFileSync(path, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadData(url) {
  try {
    const res = await fetch(url);
    return res.json();
  } catch (e) {
    console.error(e);
    return { error: e.message };
  } finally {
    cleanup();
  }
}

function getValue(obj) {
  if (obj.ready) {
    return obj.value;
  } else {
    return obj.fallback;
  }
}
`;
    const result = runQual("QUAL-013", makeProfile({
      files: [
        file("src/a.ts", tryCatchCode),
        file("src/b.ts", tryCatchCode),
        file("src/c.ts", tryCatchCode),
        file("src/d.ts", tryCatchCode),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("ignores dead code in test files", () => {
    const result = runQual("QUAL-013", makeProfile({
      files: [file("src/__tests__/helpers.test.ts", `
import { alpha, beta, gamma, delta, epsilon } from '../lib';
const x = 1;
`)],
      testFiles: ["src/__tests__/helpers.test.ts"],
    }));
    expect(result.passed).toBe(true);
  });
});

// ── Integration: station score ──────────────────────────────────────────────

describe("Quality station integration", () => {
  it("all 13 checks have confidence > 0 (no stubs remaining)", () => {
    const profile = makeProfile();
    const allIds = [
      "QUAL-001", "QUAL-002", "QUAL-003", "QUAL-004", "QUAL-005", "QUAL-006", "QUAL-007",
      "QUAL-008", "QUAL-009", "QUAL-010", "QUAL-011", "QUAL-012", "QUAL-013",
    ];
    for (const id of allIds) {
      const fn = qualityChecks.find(c => c(profile).id === id);
      expect(fn, `${id} not found`).toBeDefined();
      const result = fn!(profile);
      expect(result.confidence, `${id} should have confidence > 0`).toBeGreaterThan(0);
    }
  });

  it("all 13 checks are present", () => {
    expect(qualityChecks.length).toBe(13);
  });
});
