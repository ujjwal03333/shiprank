import { describe, it, expect } from "vitest";
import { computeVelocity, formatVelocityLabel, type ScanPoint } from "../velocity";

// Fixture: 3 scans of the same project at fake, deliberately spaced timestamps.
const scan1: ScanPoint = {
  scanId: "scan-1",
  score: 70,
  stationScores: { security: 60, accessibility: 80 },
  scannedAt: "2026-07-23T00:00:00.000Z", // baseline
};
const scan2: ScanPoint = {
  scanId: "scan-2",
  score: 74, // +4 vs scan1
  stationScores: { security: 70, accessibility: 78 }, // security +10, accessibility -2
  scannedAt: "2026-07-30T00:00:00.000Z", // +7 days
  newFindingsCount: 3,
  aiCommitCount: 6,
};
const scan3: ScanPoint = {
  scanId: "scan-3",
  score: 67, // -7 vs scan2
  stationScores: { security: 65, accessibility: 78 }, // security -5, accessibility 0
  scannedAt: "2026-08-06T00:00:00.000Z", // +7 days
  newFindingsCount: 5,
  aiCommitCount: 10,
};

describe("computeVelocity", () => {
  it("returns no velocity for a single scan", () => {
    expect(computeVelocity([scan1])).toEqual({ history: [], latest: null });
  });

  it("computes score deltas between consecutive scans, in chronological order", () => {
    const result = computeVelocity([scan3, scan1, scan2]); // deliberately out of order
    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toMatchObject({
      scanId: "scan-2",
      scoreDelta: 4,
      daysSincePrevious: 7,
    });
    expect(result.history[1]).toMatchObject({
      scanId: "scan-3",
      scoreDelta: -7,
      daysSincePrevious: 7,
    });
  });

  it("computes per-station deltas", () => {
    const result = computeVelocity([scan1, scan2, scan3]);
    expect(result.history[0]!.stationDeltas).toEqual({
      security: 10,
      accessibility: -2,
    });
    expect(result.history[1]!.stationDeltas).toEqual({
      security: -5,
      accessibility: 0,
    });
  });

  it("computes overall points-per-week velocity for the latest gap", () => {
    const result = computeVelocity([scan1, scan2, scan3]);
    // scan2 -> scan3: -7 points over exactly 7 days = 1 week -> -7 pts/week
    expect(result.latest!.pointsPerWeek).toBe(-7);
    expect(result.latest!.direction).toBe("down");
    expect(result.latest!.scoreDelta).toBe(-7);
    expect(result.latest!.daysSinceLast).toBe(7);
  });

  it("computes new-findings-per-AI-commit rate when data exists", () => {
    const result = computeVelocity([scan1, scan2, scan3]);
    // scan3: 5 new findings / 10 AI commits = 0.5
    expect(result.latest!.newFindingsPerAiCommit).toBe(0.5);
  });

  it("returns null new-findings-per-AI-commit when that data is absent", () => {
    const noCommitData: ScanPoint = { ...scan3, newFindingsCount: null, aiCommitCount: null };
    const result = computeVelocity([scan1, scan2, noCommitData]);
    expect(result.latest!.newFindingsPerAiCommit).toBeNull();
  });

  it("formats a human label matching the spec's examples", () => {
    const up = computeVelocity([scan1, scan2]).latest!;
    expect(formatVelocityLabel(up)).toBe("↑ +4 points since last scan (7 days ago)");

    const down = computeVelocity([scan2, scan3]).latest!;
    expect(formatVelocityLabel(down)).toBe("↓ -7 points since last scan (7 days ago)");
  });
});
