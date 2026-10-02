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
        station("security", 80, 12),
        station("architecture", 100, 0),
        station("data", 100, 0),
        station("compliance", 100, 0),
        station("infrastructure", 100, 0),
      ]),
    ).toBe(80);
  });

  it("weights security 45 and healthy 30, ignoring empty stations", () => {
    expect(
      overallScore([
        station("security", 100, 10),
        station("quality", 80, 10),
        station("architecture", 0, 0),
      ]),
    ).toBe(92);
  });

  it("returns 0 when no station has implemented checks", () => {
    expect(overallScore([station("architecture", 0, 0)])).toBe(0);
    expect(overallScore([])).toBe(0);
  });

  it("caps a tree with too few applicable checks at C", () => {
    expect(overallScore([station("security", 90, 4), station("quality", 90, 4)])).toBe(69);
  });
});

describe("runChecks lanes", () => {
  it("does not score stations outside security, healthy, and human", () => {
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
    for (const id of ["architecture", "data", "compliance", "infrastructure", "growth", "performance"] as const) {
      const s = stations.find((x) => x.station === id)!;
      expect(s.implemented).toBe(0);
      expect(s.score).toBe(0);
    }
    expect(overallScore(stations)).toBeLessThanOrEqual(69);
  });
});
