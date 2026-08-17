/**
 * Pure-function tests for the check engine's performance station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { performanceChecks } from "../checks/performance";
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

function runPerf(id: string, profile: CodeProfile) {
  const fn = performanceChecks.find(c => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

describe("PERF-002 — full-library barrel imports", () => {
  it("FAIL: real `import _ from 'lodash'` statement", () => {
    const result = runPerf("PERF-002", makeProfile({
      files: [file("src/util.ts", "import _ from 'lodash';\nexport const grouped = _.groupBy(items, 'id');")],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: prose describing the anti-pattern does not self-match (self-scan false positive)", () => {
    // Regression: the check's own descriptive label/fixPrompt text used to
    // literally contain "import _ from 'lodash'", which self-matched the
    // detection regex when the engine scanned its own performance.ts.
    const result = runPerf("PERF-002", makeProfile({
      files: [
        file("src/checks/performance.ts", [
          "const label = \"Default-imports the entire lodash library instead of individual functions\";",
          "const fixPrompt = \"Replace barrel imports with per-function imports — import the specific lodash function from its own subpath rather than default-importing the whole library.\";",
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: importing a specific lodash function is fine", () => {
    const result = runPerf("PERF-002", makeProfile({
      files: [file("src/util.ts", "import debounce from 'lodash/debounce';")],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: still catches moment/heroicons/react-icons barrel imports", () => {
    const result = runPerf("PERF-002", makeProfile({
      files: [file("src/util.ts", "import moment from 'moment';")],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: a regression-test fixture containing a deliberate real violation doesn't self-flag", () => {
    // Regression: this check's OWN test suite writes literal "import _ from
    // 'lodash'" strings as fixtures to prove true-positive detection still
    // works — those fixtures shouldn't count as a real barrel import when
    // the engine scans its own source tree.
    const testPath = "src/__tests__/checks-performance.test.ts";
    const result = runPerf("PERF-002", makeProfile({
      testFiles: [testPath],
      files: [file(testPath, "import _ from 'lodash';")],
    }));
    expect(result.passed).toBe(true);
  });
});

describe("PERF-005 — useEffect dependency arrays", () => {
  it("FAIL: useEffect with no deps array, short body", () => {
    const result = runPerf("PERF-005", makeProfile({
      files: [file("src/Component.tsx", "useEffect(() => { doStuff(); doMore(); });")],
    }));
    expect(result.passed).toBe(false);
  });

  it("FAIL: useEffect with no deps array and a long body (regression for the fixed-window false negative)", () => {
    // The old implementation only looked ~400 chars ahead for a ", [" — any
    // effect body longer than that made a genuinely-missing deps array
    // invisible to the check (a false NEGATIVE on the miss, which inverted
    // into a false positive on any long effect that DID have deps, since
    // the same window missed the array at the end).
    const longBody = Array(30).fill("  doSomethingWithSideEffects(x, y, z);").join("\n");
    const code = `useEffect(() => {\n${longBody}\n});`;
    const result = runPerf("PERF-005", makeProfile({
      files: [file("src/Component.tsx", code)],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: useEffect with a long body and an empty dependency array", () => {
    const longBody = Array(30).fill("  doSomethingWithSideEffects(x, y, z);").join("\n");
    const code = `useEffect(() => {\n${longBody}\n}, []);`;
    const result = runPerf("PERF-005", makeProfile({
      files: [file("src/Component.tsx", code)],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: useEffect with a long body and a real dependency array", () => {
    const longBody = Array(30).fill("  doSomethingWithSideEffects(x, y, z);").join("\n");
    const code = `useEffect(() => {\n${longBody}\n}, [x, y, z]);`;
    const result = runPerf("PERF-005", makeProfile({
      files: [file("src/Component.tsx", code)],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: useEffect body containing unrelated nested parens still resolves the true call end", () => {
    const code = "useEffect(() => { const x = (1 + 2) * (3 + 4); doStuff(x); }, [someProp]);";
    const result = runPerf("PERF-005", makeProfile({
      files: [file("src/Component.tsx", code)],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: a regression-test fixture with a deliberately-missing deps array doesn't self-flag", () => {
    const testPath = "src/__tests__/checks-performance.test.ts";
    const result = runPerf("PERF-005", makeProfile({
      testFiles: [testPath],
      files: [file(testPath, "useEffect(() => { doStuff(); });")],
    }));
    expect(result.passed).toBe(true);
  });
});
