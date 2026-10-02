import { describe, expect, it } from "vitest";
import {
  cardLanesFromScoreMap,
  cardLanesFromStations,
  formatCardLanes,
  lanesFromMetadata,
} from "../card-lanes";

describe("card lanes", () => {
  it("names the three lanes and leaves an unscored lane blank", () => {
    expect(
      formatCardLanes({ security: 82, healthy: 70, human: null }),
    ).toBe("Security 82 · Healthy 70 · Human —");
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
