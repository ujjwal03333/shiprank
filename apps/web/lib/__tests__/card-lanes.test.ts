import { describe, expect, it } from "vitest";
import {
  cardLanesFromScoreMap,
  cardLanesFromStations,
  formatCardLanes,
  lanesFromMetadata,
} from "../card-lanes";

describe("card lanes", () => {
  it("names the three lanes and marks an unscored lane n/a", () => {
    expect(
      formatCardLanes({ security: 82, healthy: 70, human: null }),
    ).toBe("Security 82 · Healthy 70 · Human n/a — not a web UI");
  });

  it("prints n/a when no lane ran, and keeps a real zero", () => {
    expect(
      formatCardLanes({ security: null, healthy: null, human: null }),
    ).toBe("Security n/a · Healthy n/a · Human n/a — not a web UI");
    expect(formatCardLanes({ security: 0, healthy: 0, human: 0 })).toBe(
      "Security 0 · Healthy 0 · Human 0",
    );
  });

  it("does not invent lanes from an older nine-station map", () => {
    expect(
      cardLanesFromScoreMap({ security: 90, growth: 40, quality: 10 }),
    ).toBeNull();
  });

  it("reads a lane-only map and stored metadata", () => {
    expect(cardLanesFromScoreMap({ security: 81.4, accessibility: 60 })).toEqual({
      security: 81,
      healthy: null,
      human: 60,
    });
    expect(
      lanesFromMetadata({ lanes: { security: 10, healthy: 20, human: 30 } }),
    ).toEqual({ security: 10, healthy: 20, human: 30 });
    expect(lanesFromMetadata({ previousScore: 40 })).toBeNull();
    expect(
      lanesFromMetadata({ lanes: { security: null, healthy: null, human: null } }),
    ).toEqual({ security: null, healthy: null, human: null });
    expect(cardLanesFromScoreMap({})).toEqual({
      security: null,
      healthy: null,
      human: null,
    });
  });

  it("skips a station that did not implement a check", () => {
    expect(
      cardLanesFromStations([
        { station: "security", score: 50, implemented: 2 },
        { station: "quality", score: 0, implemented: 0 },
        { station: "accessibility", score: 80, implemented: 1 },
      ]),
    ).toEqual({ security: 50, healthy: null, human: 80 });
  });
});
