import { describe, it, expect } from "vitest";
import { toChartData } from "../history-chart";
import type { ScanPoint } from "../velocity";

// Same 3-scan fixture as velocity.test.ts (Part 6) — same fake project,
// same timestamps — so the history chart and the velocity math are proven
// against one consistent, honest fixture.
const scan1: ScanPoint = {
  scanId: "scan-1",
  score: 70,
  stationScores: { security: 60, accessibility: 80 },
  scannedAt: "2026-07-23T00:00:00.000Z",
};
const scan2: ScanPoint = {
  scanId: "scan-2",
  score: 74,
  stationScores: { security: 70, accessibility: 78 },
  scannedAt: "2026-07-30T00:00:00.000Z",
};
const scan3: ScanPoint = {
  scanId: "scan-3",
  score: 67,
  stationScores: { security: 65, accessibility: 78 },
  scannedAt: "2026-08-06T00:00:00.000Z",
};

describe("toChartData", () => {
  it("orders points chronologically regardless of input order", () => {
    const chart = toChartData([scan3, scan1, scan2]);
    expect(chart.map((c) => c.scanId)).toEqual(["scan-1", "scan-2", "scan-3"]);
  });

  it("carries the overall score per point", () => {
    const chart = toChartData([scan1, scan2, scan3]);
    expect(chart.map((c) => c.score)).toEqual([70, 74, 67]);
  });

  it("spreads per-station scores as their own keys for per-station lines", () => {
    const chart = toChartData([scan1, scan2, scan3]);
    expect(chart[0]).toMatchObject({ security: 60, accessibility: 80 });
    expect(chart[1]).toMatchObject({ security: 70, accessibility: 78 });
    expect(chart[2]).toMatchObject({ security: 65, accessibility: 78 });
  });

  it("formats a short display date", () => {
    const chart = toChartData([scan1]);
    expect(chart[0]!.date).toBe("Jul 23");
  });
});
