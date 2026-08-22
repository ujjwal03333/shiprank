import { describe, it, expect } from "vitest";
import { renderBadgeSvg } from "../badge";

describe("renderBadgeSvg", () => {
  it("renders valid SVG markup with the score and grade", () => {
    const svg = renderBadgeSvg({ score: 86, grade: "A" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
    expect(svg).toContain("ShipRank");
    expect(svg).toContain("86 A");
  });

  it("colors A gold, B steel, C amber, F blood", () => {
    expect(renderBadgeSvg({ score: 95, grade: "A" })).toContain("#E8C547");
    expect(renderBadgeSvg({ score: 78, grade: "B" })).toContain("#8FBFCC");
    expect(renderBadgeSvg({ score: 60, grade: "C" })).toContain("#F0A03A");
    expect(renderBadgeSvg({ score: 30, grade: "F" })).toContain("#FF4D4D");
  });

  it("renders an 'unknown' badge when score/grade are missing", () => {
    const svg = renderBadgeSvg({ score: null, grade: null });
    expect(svg).toContain("unknown");
    expect(svg.startsWith("<svg")).toBe(true);
  });

  it("escapes XML in the label", () => {
    const svg = renderBadgeSvg({ label: "A&B<C", score: 1, grade: "F" });
    expect(svg).toContain("A&amp;B&lt;C");
    expect(svg).not.toContain("A&B<C");
  });

  it("supports a custom label", () => {
    expect(renderBadgeSvg({ label: "MyApp", score: 50, grade: "D" })).toContain(
      "MyApp",
    );
  });
});
