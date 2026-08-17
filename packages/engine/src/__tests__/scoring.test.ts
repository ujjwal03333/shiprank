import { describe, it, expect } from "vitest";
import { overallScore, runChecks } from "../checks/engine";
import type { CodeProfile, StationScore } from "../checks/types";

function station(
  name: StationScore["station"],
  score: number,
  implemented: number,
): StationScore {
  return {
    station: name,
    name,
    score,
    checks: [],
    implemented,
    total: implemented,
  };
}

describe("overallScore", () => {
  it("excludes stub-only stations even if their stored score is 100", () => {
    expect(
      overallScore([
        station("security", 80, 5),
        station("architecture", 100, 0),
        station("data", 100, 0),
        station("compliance", 100, 0),
        station("infrastructure", 100, 0),
      ]),
    ).toBe(80);
  });

  it("averages only implemented stations", () => {
    expect(
      overallScore([
        station("security", 100, 10),
        station("quality", 80, 10),
        station("architecture", 0, 0),
      ]),
    ).toBe(90);
  });

  it("returns 0 when no station has implemented checks", () => {
    expect(overallScore([station("architecture", 0, 0)])).toBe(0);
    expect(overallScore([])).toBe(0);
  });
});

describe("runChecks stub stations", () => {
  it("does not treat ARCH/DATA/COMP/INFRA as 100 on an empty profile", () => {
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
    for (const id of ["architecture", "data", "compliance", "infrastructure"] as const) {
      const s = stations.find((x) => x.station === id)!;
      expect(s.implemented).toBe(0);
      expect(s.score).toBe(0);
    }
    const scored = stations.filter((s) => s.implemented > 0);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored.every((s) => s.station !== "architecture")).toBe(true);
  });
});
