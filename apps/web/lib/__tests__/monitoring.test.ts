import { describe, it, expect } from "vitest";
import {
  selectDueProjects,
  computeNextScanAt,
  detectRegression,
  newFindingTitles,
  REGRESSION_SCORE_DROP_THRESHOLD,
  type MonitoredProjectRow,
} from "../monitoring";

// Fixture: a fake repo monitored weekly, with fake timestamps around "now".
const NOW = new Date("2026-08-07T00:00:00.000Z");

function project(overrides: Partial<MonitoredProjectRow>): MonitoredProjectRow {
  return {
    id: "mp-1",
    repoUrl: "https://github.com/example/fake-repo.git",
    scanFrequency: "weekly",
    lastScannedAt: "2026-07-30T00:00:00.000Z",
    nextScanAt: "2026-08-06T00:00:00.000Z", // 1 day in the past — due
    ...overrides,
  };
}

describe("selectDueProjects", () => {
  it("selects a project whose next_scan_at has passed", () => {
    const due = project({ nextScanAt: "2026-08-06T00:00:00.000Z" });
    const notDue = project({ id: "mp-2", nextScanAt: "2026-08-14T00:00:00.000Z" });
    expect(selectDueProjects([due, notDue], NOW)).toEqual([due]);
  });

  it("selects a project scheduled for exactly now", () => {
    const dueNow = project({ nextScanAt: NOW.toISOString() });
    expect(selectDueProjects([dueNow], NOW)).toEqual([dueNow]);
  });

  it("excludes a project scheduled in the future", () => {
    const future = project({ nextScanAt: "2026-08-08T00:00:00.000Z" });
    expect(selectDueProjects([future], NOW)).toEqual([]);
  });
});

describe("computeNextScanAt", () => {
  it("schedules weekly re-scans 7 days out", () => {
    const next = computeNextScanAt("weekly", NOW);
    expect(next).toBe("2026-08-14T00:00:00.000Z");
  });

  it("schedules daily re-scans 1 day out", () => {
    const next = computeNextScanAt("daily", NOW);
    expect(next).toBe("2026-08-08T00:00:00.000Z");
  });
});

describe("detectRegression — the fixture: 3 scans, scores 70 -> 74 -> 67", () => {
  it("does NOT flag a small improvement (70 -> 74)", () => {
    const result = detectRegression({ previousScore: 70, newScore: 74, newCriticalFindings: [] });
    expect(result.isRegression).toBe(false);
    expect(result.scoreDelta).toBe(4);
  });

  it("flags a >=5 point drop (74 -> 67) even with no new critical findings", () => {
    const result = detectRegression({ previousScore: 74, newScore: 67, newCriticalFindings: [] });
    expect(result.isRegression).toBe(true);
    expect(result.scoreDelta).toBe(-7);
    expect(result.reasons[0]).toBe("Score dropped 7 points (74 → 67).");
  });

  it("does not flag a drop just under the threshold with no new critical findings", () => {
    const result = detectRegression({ previousScore: 80, newScore: 76, newCriticalFindings: [] });
    expect(result.scoreDelta).toBe(-REGRESSION_SCORE_DROP_THRESHOLD + 1);
    expect(result.isRegression).toBe(false);
  });

  it("flags exactly the threshold drop", () => {
    const result = detectRegression({ previousScore: 80, newScore: 75, newCriticalFindings: [] });
    expect(result.scoreDelta).toBe(-REGRESSION_SCORE_DROP_THRESHOLD);
    expect(result.isRegression).toBe(true);
  });

  it("flags a new critical finding even when the score improved", () => {
    const result = detectRegression({
      previousScore: 70,
      newScore: 85,
      newCriticalFindings: ["Hardcoded secret in src/client.ts"],
    });
    expect(result.isRegression).toBe(true);
    expect(result.reasons[0]).toContain("1 new critical finding(s)");
  });

  it("combines both reasons when both trigger", () => {
    const result = detectRegression({
      previousScore: 80,
      newScore: 60,
      newCriticalFindings: ["RLS disabled on users table"],
    });
    expect(result.reasons).toHaveLength(2);
  });
});

describe("newFindingTitles", () => {
  it("returns only titles absent from the previous scan", () => {
    const titles = newFindingTitles(
      ["No hardcoded secrets", ".env excluded from git"],
      ["No hardcoded secrets", ".env excluded from git", "RLS disabled on users table"],
    );
    expect(titles).toEqual(["RLS disabled on users table"]);
  });
});
