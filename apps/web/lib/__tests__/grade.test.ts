import { describe, it, expect } from "vitest";
import {
  gradeStroke,
  gradeBadgeClass,
  verdictFor,
  STATION_LABEL,
  STATION_DESCRIPTION,
  STATION_COLOR,
} from "../grade";

describe("gradeStroke", () => {
  it("returns green for A+ and A", () => {
    expect(gradeStroke("A+")).toBe("#3f7d52");
    expect(gradeStroke("A")).toBe("#3f7d52");
  });

  it("returns teal for B", () => {
    expect(gradeStroke("B")).toBe("#3d6e8c");
  });

  it("returns amber for C", () => {
    expect(gradeStroke("C")).toBe("#c08a1e");
  });

  it("returns red for D and F", () => {
    expect(gradeStroke("D")).toBe("#b23b3b");
    expect(gradeStroke("F")).toBe("#b23b3b");
  });
});

describe("gradeBadgeClass", () => {
  it("returns success classes for A grades", () => {
    expect(gradeBadgeClass("A+")).toBe("bg-success-soft text-success-ink");
    expect(gradeBadgeClass("A")).toBe("bg-success-soft text-success-ink");
  });

  it("returns info classes for B", () => {
    expect(gradeBadgeClass("B")).toBe("bg-info-soft text-info-ink");
  });

  it("returns warning classes for C", () => {
    expect(gradeBadgeClass("C")).toBe("bg-warning-soft text-warning-ink");
  });

  it("returns danger classes for D/F", () => {
    expect(gradeBadgeClass("D")).toBe("bg-danger-soft text-danger-ink");
    expect(gradeBadgeClass("F")).toBe("bg-danger-soft text-danger-ink");
  });
});

describe("verdictFor", () => {
  it("returns hold-before-shipping when critical issues exist", () => {
    const v = verdictFor(95, 2, 5);
    expect(v.headline).toBe("Hold before shipping.");
    expect(v.detail).toContain("2 critical issues");
  });

  it("uses singular for 1 critical issue", () => {
    const v = verdictFor(95, 1, 1);
    expect(v.detail).toContain("1 critical issue");
  });

  it("returns ready-to-ship for score >= 90 with no criticals", () => {
    const v = verdictFor(92, 0, 3);
    expect(v.headline).toBe("Ready to ship.");
    expect(v.detail).toContain("3 minor polish items");
  });

  it("returns every-check-passed for score >= 90 with zero failures", () => {
    const v = verdictFor(100, 0, 0);
    expect(v.detail).toBe("Every check passed.");
  });

  it("returns ship-almost for score 75-89", () => {
    const v = verdictFor(82, 0, 4);
    expect(v.headline).toBe("Ship it — almost.");
    expect(v.detail).toContain("4 fixes stand");
  });

  it("returns functional-not-finished for score 50-74", () => {
    const v = verdictFor(60, 0, 8);
    expect(v.headline).toBe("Functional, not finished.");
    expect(v.detail).toContain("8 findings");
  });

  it("returns needs-work for score < 50", () => {
    const v = verdictFor(30, 0, 15);
    expect(v.headline).toBe("Needs work before shipping.");
    expect(v.detail).toContain("15 findings");
  });

  it("handles zero findings for each score band", () => {
    expect(verdictFor(80, 0, 0).detail).toContain("partial-credit");
    expect(verdictFor(40, 0, 0).detail).toContain("significant gaps");
  });
});

describe("station metadata exports", () => {
  it("STATION_LABEL covers all 9 stations", () => {
    expect(Object.keys(STATION_LABEL)).toHaveLength(9);
    expect(STATION_LABEL["security"]).toBe("Security");
    expect(STATION_LABEL["code_quality"]).toBe("Code Quality");
  });

  it("STATION_DESCRIPTION covers all 9 stations", () => {
    expect(Object.keys(STATION_DESCRIPTION)).toHaveLength(9);
  });

  it("STATION_COLOR covers all 9 stations", () => {
    expect(Object.keys(STATION_COLOR)).toHaveLength(9);
    for (const color of Object.values(STATION_COLOR)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
