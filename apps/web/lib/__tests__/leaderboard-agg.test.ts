import { describe, it, expect } from "vitest";
import { aggregateLeaderboard, type LeaderboardRow } from "../leaderboard-agg";

function row(overrides: Partial<LeaderboardRow>): LeaderboardRow {
  return {
    scanId: crypto.randomUUID(),
    projectName: "proj",
    platform: "cursor",
    framework: "nextjs",
    score: 80,
    grade: "A",
    url: null,
    stationScores: {},
    scannedAt: "2026-08-01T00:00:00.000Z",
    provenance: "verified",
    contentHash: crypto.randomUUID().replace(/-/g, "").padEnd(64, "0"),
    fileCount: 50,
    lineCount: 5000,
    ...overrides,
  };
}

describe("aggregateLeaderboard — Sybil floors", () => {
  it("excludes below-floor scans from averages but keeps them in entries", () => {
    const rows = [
      row({ platform: "cursor", score: 90, fileCount: 50, lineCount: 5000 }),
      // below floor: only 2 files
      row({ platform: "cursor", score: 10, fileCount: 2, lineCount: 5000 }),
      // below floor: only 100 lines
      row({ platform: "cursor", score: 10, fileCount: 50, lineCount: 100 }),
    ];
    const result = aggregateLeaderboard(rows);

    // averages reflect ONLY the one eligible 90-score scan
    const cursor = result.platformLeaderboard.find((p) => p.platform === "cursor");
    expect(cursor).toEqual({ platform: "cursor", avgScore: 90, projectCount: 1 });

    // all three still appear as entries
    expect(result.entries).toHaveLength(3);
    expect(result.excludedFromAggregates).toBe(2);
    expect(result.entries.filter((e) => !e.aggregateEligible)).toHaveLength(2);
  });

  it("excludes non-verified provenance from averages", () => {
    const rows = [
      row({ platform: "bolt", score: 70, provenance: "verified" }),
      row({ platform: "bolt", score: 20, provenance: "self-reported" }),
      row({ platform: "bolt", score: 20, provenance: "seed" }),
    ];
    const result = aggregateLeaderboard(rows);
    const bolt = result.platformLeaderboard.find((p) => p.platform === "bolt");
    expect(bolt).toEqual({ platform: "bolt", avgScore: 70, projectCount: 1 });
  });
});

describe("aggregateLeaderboard — content-hash dedup", () => {
  it("counts an identical content hash at most once", () => {
    const dupHash = "a".repeat(64);
    const rows = [
      row({ platform: "lovable", score: 60, contentHash: dupHash }),
      row({ platform: "lovable", score: 100, contentHash: dupHash }), // dup → ignored
      row({ platform: "lovable", score: 80, contentHash: "b".repeat(64) }),
    ];
    const result = aggregateLeaderboard(rows);
    const lovable = result.platformLeaderboard.find((p) => p.platform === "lovable");
    // only the first (60) and the distinct (80) count → avg 70 over 2
    expect(lovable).toEqual({ platform: "lovable", avgScore: 70, projectCount: 2 });
    expect(result.excludedFromAggregates).toBe(1);

    const dupEntry = result.entries[1]!;
    expect(dupEntry.aggregateEligible).toBe(false);
    expect(dupEntry.exclusionReason).toMatch(/dedup/i);
  });

  it("dedup is deterministic — first occurrence wins", () => {
    const dupHash = "c".repeat(64);
    const result = aggregateLeaderboard([
      row({ score: 40, contentHash: dupHash }),
      row({ score: 90, contentHash: dupHash }),
    ]);
    // first (40) counts, second ignored
    const p = result.platformLeaderboard[0]!;
    expect(p.avgScore).toBe(40);
    expect(p.projectCount).toBe(1);
  });
});

describe("aggregateLeaderboard — provenance filter", () => {
  it("filters the entries list by provenance when requested", () => {
    const rows = [
      row({ provenance: "verified" }),
      row({ provenance: "self-reported" }),
      row({ provenance: "seed" }),
    ];
    const result = aggregateLeaderboard(rows, { provenanceFilter: "verified" });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.provenance).toBe("verified");
  });
});
