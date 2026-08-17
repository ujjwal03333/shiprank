import { describe, it, expect } from "vitest";
import { scoreNarrative } from "../score-narrative";

describe("scoreNarrative", () => {
  it("maps the specified ranges", () => {
    expect(scoreNarrative(100)).toContain("Production-ready");
    expect(scoreNarrative(90)).toContain("Production-ready");
    expect(scoreNarrative(85)).toContain("Strong foundation");
    expect(scoreNarrative(75)).toContain("Good bones");
    expect(scoreNarrative(65)).toContain("Needs work");
    expect(scoreNarrative(10)).toContain("Major concerns");
  });
});
