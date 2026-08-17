import { describe, it, expect } from "vitest";
import { confidenceForCount, rankModels } from "../model-rankings";

describe("confidenceForCount", () => {
  it("gates volume honestly", () => {
    expect(confidenceForCount(0)).toBe("none");
    expect(confidenceForCount(4)).toBe("none");
    expect(confidenceForCount(5)).toBe("low");
    expect(confidenceForCount(19)).toBe("low");
    expect(confidenceForCount(20)).toBe("full");
  });
});

describe("rankModels", () => {
  it("averages scores and finds best/worst stations", () => {
    const rankings = rankModels([
      {
        model: "claude-sonnet",
        score: 80,
        stationScores: { security: 90, growth: 50 },
        scanId: "a",
      },
      {
        model: "claude-sonnet",
        score: 90,
        stationScores: { security: 80, growth: 70 },
        scanId: "b",
      },
      {
        model: "unknown",
        score: 10,
        stationScores: { security: 10 },
        scanId: "c",
      },
    ]);
    const claude = rankings.find((r) => r.model === "claude-sonnet")!;
    expect(claude.avgScore).toBe(85);
    expect(claude.scanCount).toBe(2);
    expect(claude.bestStation).toBe("security");
    expect(claude.worstStation).toBe("growth");
  });
});
