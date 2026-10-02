import { describe, it, expect } from "vitest";
import { parseEvidenceLoc } from "../evidence";
import { runChecks } from "../checks/engine";
import type { CodeProfile } from "../checks/types";

describe("parseEvidenceLoc", () => {
  it("reads path and optional line", () => {
    expect(parseEvidenceLoc("app/login/page.tsx:42: <input>")).toEqual({
      filePath: "app/login/page.tsx",
      lineNumber: 42,
    });
  });
});

describe("human lane applicability", () => {
  it("does not score UI checks on a tree with no UI", () => {
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
    const human = runChecks(profile).find((s) => s.station === "accessibility")!;
    expect(human.checks.find((c) => c.id === "HUM-001")!.applicable).toBe(false);
    expect(human.checks.find((c) => c.id === "HUM-001")!.confidence).toBe(0);
  });
});
