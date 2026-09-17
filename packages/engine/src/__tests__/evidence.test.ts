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

describe("accessibility applicability", () => {
  it("marks A11Y-001/002 N/A on a tree with no images or inputs", () => {
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
    const a11y = runChecks(profile).find((s) => s.station === "accessibility")!;
    expect(a11y.checks.find((c) => c.id === "A11Y-001")!.applicable).toBe(false);
    expect(a11y.checks.find((c) => c.id === "A11Y-002")!.applicable).toBe(false);
  });
});
