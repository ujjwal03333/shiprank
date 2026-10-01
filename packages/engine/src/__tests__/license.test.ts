import { describe, it, expect } from "vitest";
import {
  licenseFor,
  verdictFor,
  criticalCountOf,
  failingCountOf,
} from "../license";
import type { CheckResult, StationScore } from "../checks/types";

function check(partial: Partial<CheckResult> & Pick<CheckResult, "id">): CheckResult {
  return {
    station: "security",
    passed: true,
    severity: "warning",
    confidence: 80,
    title: partial.id,
    failMessage: "",
    evidence: "",
    fixPrompt: "",
    fixDifficulty: "copy-paste",
    fixTime: "5 min",
    autoFixSafety: "safe",
    scoreWeight: 10,
    ...partial,
  };
}

function station(checks: CheckResult[]): StationScore {
  return {
    station: "security",
    name: "Security",
    score: 50,
    implemented: checks.filter((c) => c.confidence > 0).length,
    total: checks.length,
    checks,
  };
}

describe("licenseFor", () => {
  it("is Hold when criticalCount > 0 (same rule as verdictFor)", () => {
    expect(licenseFor(1)).toBe("Hold");
    expect(verdictFor(100, 1, 1).headline).toBe("Hold before shipping.");
    expect(licenseFor(3)).toBe("Hold");
  });

  it("is Licensed when criticalCount is 0", () => {
    expect(licenseFor(0)).toBe("Licensed");
    expect(verdictFor(40, 0, 12).headline).not.toBe("Hold before shipping.");
  });
});

describe("criticalCountOf", () => {
  it("counts scored critical failures", () => {
    const stations = [
      station([
        check({ id: "SEC-001", passed: false, severity: "critical", confidence: 90 }),
        check({ id: "SEC-002", passed: false, severity: "warning", confidence: 80 }),
      ]),
    ];
    expect(criticalCountOf(stations)).toBe(1);
    expect(failingCountOf(stations)).toBe(2);
    expect(licenseFor(criticalCountOf(stations))).toBe("Hold");
  });

  it("ignores stubs (confidence 0)", () => {
    const stations = [
      station([
        check({ id: "STUB", passed: false, severity: "critical", confidence: 0 }),
      ]),
    ];
    expect(criticalCountOf(stations)).toBe(0);
    expect(licenseFor(criticalCountOf(stations))).toBe("Licensed");
  });

  it("ignores N/A checks (applicable === false)", () => {
    const stations = [
      station([
        check({
          id: "A11Y-001",
          passed: false,
          severity: "critical",
          confidence: 90,
          applicable: false,
        }),
      ]),
    ];
    expect(criticalCountOf(stations)).toBe(0);
  });

  it("does not count passing criticals", () => {
    const stations = [
      station([
        check({ id: "SEC-001", passed: true, severity: "critical", confidence: 90 }),
      ]),
    ];
    expect(criticalCountOf(stations)).toBe(0);
  });
});
