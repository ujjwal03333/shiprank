import { describe, it, expect } from "vitest";
import { decisionContextFor, runChecks } from "../index";
import type { CodeProfile } from "../checks/types";

describe("decisionContextFor", () => {
  it("returns a specific record for SEC-003", () => {
    expect(decisionContextFor("SEC-003").probableCause.toLowerCase()).toContain("rls");
  });

  it("attaches frequency only when n >= 10", () => {
    expect(decisionContextFor("SEC-001", { failPct: 87, sampleSize: 40 }).frequencyPct).toBe(87);
    expect(decisionContextFor("SEC-001", { failPct: 87, sampleSize: 3 }).frequencyPct).toBeUndefined();
  });
});

describe("runChecks attaches decisionContext", () => {
  it("puts a record on every public check", () => {
    const profile = {
      root: "/p",
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
      framework: "unknown",
      hasAuth: false,
      hasDatabase: false,
      hasPayments: false,
      hasUserData: false,
    } as CodeProfile;
    const stations = runChecks(profile);
    const first = stations[0]?.checks[0];
    expect(first?.decisionContext?.aiPattern).toBeTruthy();
  });
});
