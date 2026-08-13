import { describe, it, expect } from "vitest";
import { buildGenomeMatrix, GENOME_LOW_VOLUME_THRESHOLD, type GenomeRow } from "../genome";

function rows(overrides: Partial<GenomeRow>[]): GenomeRow[] {
  return overrides.map((o, i) => ({
    checkId: "SEC-001",
    passed: true,
    scanId: `scan-${i}`,
    platform: "cursor",
    model: "claude-4-sonnet",
    ...o,
  }));
}

describe("buildGenomeMatrix", () => {
  it("computes fail rate and scan count per (check, platform) cohort", () => {
    const matrix = buildGenomeMatrix(
      rows([
        { scanId: "s1", platform: "cursor", passed: false },
        { scanId: "s2", platform: "cursor", passed: true },
        { scanId: "s3", platform: "bolt", passed: false },
      ]),
    );
    const cursor = matrix.byPlatform.find((c) => c.cohort === "cursor")!;
    expect(cursor).toMatchObject({ checkId: "SEC-001", scanCount: 2, failCount: 1, failRate: 0.5 });
    const bolt = matrix.byPlatform.find((c) => c.cohort === "bolt")!;
    expect(bolt).toMatchObject({ scanCount: 1, failCount: 1, failRate: 1 });
  });

  it("computes the same fail rate independently by model", () => {
    const matrix = buildGenomeMatrix(
      rows([
        { scanId: "s1", model: "gpt-5", passed: false },
        { scanId: "s2", model: "gpt-5", passed: false },
        { scanId: "s3", model: "claude-4-sonnet", passed: true },
      ]),
    );
    const gpt5 = matrix.byModel.find((c) => c.cohort === "gpt-5")!;
    expect(gpt5).toMatchObject({ scanCount: 2, failCount: 2, failRate: 1 });
  });

  it("flags cohorts under the low-volume threshold honestly", () => {
    const matrix = buildGenomeMatrix(rows([{ scanId: "s1" }, { scanId: "s2" }]));
    expect(matrix.byPlatform[0]!.lowVolume).toBe(true);
    expect(matrix.byPlatform[0]!.scanCount).toBeLessThan(GENOME_LOW_VOLUME_THRESHOLD);
  });

  it("does not flag low_volume once a cohort reaches the threshold", () => {
    const many = Array.from({ length: GENOME_LOW_VOLUME_THRESHOLD }, (_, i) => ({
      scanId: `s${i}`,
    }));
    const matrix = buildGenomeMatrix(rows(many));
    expect(matrix.byPlatform[0]!.scanCount).toBe(GENOME_LOW_VOLUME_THRESHOLD);
    expect(matrix.byPlatform[0]!.lowVolume).toBe(false);
  });

  it("counts distinct scans once even with multiple check rows per scan", () => {
    const matrix = buildGenomeMatrix([
      { checkId: "SEC-001", passed: false, scanId: "s1", platform: "cursor", model: "gpt-5" },
      { checkId: "SEC-002", passed: true, scanId: "s1", platform: "cursor", model: "gpt-5" },
    ]);
    expect(matrix.totalEligibleScans).toBe(1);
  });
});
