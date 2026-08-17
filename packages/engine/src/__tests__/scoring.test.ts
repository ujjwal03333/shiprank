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

describe("runChecks Phase 6 stations", () => {
  it("implements at least 3 checks each on COMP/INFRA/DATA/ARCH", () => {
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
      expect(s.implemented).toBeGreaterThanOrEqual(3);
    }
  });

  it("does not give COMP or INFRA a free 100 on an empty profile", () => {
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
    const compliance = stations.find((x) => x.station === "compliance")!;
    const infra = stations.find((x) => x.station === "infrastructure")!;
    expect(compliance.score).toBeLessThan(100);
    expect(infra.score).toBeLessThan(100);
    expect(compliance.checks.some((c) => c.confidence > 0 && !c.passed)).toBe(true);
    expect(infra.checks.some((c) => c.confidence > 0 && !c.passed)).toBe(true);
  });
});
