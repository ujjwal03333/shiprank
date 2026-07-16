import { describe, it, expect } from "vitest";
import { buildRemediationPlan, parseMinutes } from "../remediation";
import type { StationScore, CheckResult } from "../checks/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function check(
  id: string,
  passed: boolean,
  weight: number,
  severity: CheckResult["severity"],
  fixTime: string,
  autoFixSafety: CheckResult["autoFixSafety"],
  fixDifficulty: CheckResult["fixDifficulty"] = "moderate",
): CheckResult {
  return {
    id,
    station: "security",
    passed,
    severity,
    confidence: 90,
    title: `Check ${id}`,
    failMessage: passed ? "" : `${id} failed`,
    evidence: "",
    fixPrompt: `Fix for ${id}`,
    fixDifficulty,
    fixTime,
    autoFixSafety,
    scoreWeight: weight,
  };
}

function station(
  name: StationScore["station"],
  checks: CheckResult[],
  score = 50,
): StationScore {
  return {
    station: name,
    name: String(name),
    score,
    checks,
    implemented: checks.filter(c => c.confidence > 0).length,
    total: checks.length,
  };
}

// A minimal 2-station plan so overallScore = avg(s1, s2).
function twoStationPlan(
  s1checks: CheckResult[],
  s2checks: CheckResult[],
  s1score = 50,
  s2score = 50,
): StationScore[] {
  return [
    station("security", s1checks, s1score),
    station("accessibility", s2checks, s2score),
  ];
}

// ── parseMinutes ──────────────────────────────────────────────────────────────

describe("parseMinutes", () => {
  it("parses '5 min'", () => expect(parseMinutes("5 min")).toBe(5));
  it("parses '30 min'", () => expect(parseMinutes("30 min")).toBe(30));
  it("parses '1 hr'",  () => expect(parseMinutes("1 hr")).toBe(60));
  it("parses '2 hrs'", () => expect(parseMinutes("2 hrs")).toBe(120));
  it("parses '4 hrs'", () => expect(parseMinutes("4 hrs")).toBe(240));
  it("falls back to 60 for unknown", () => expect(parseMinutes("unknown")).toBe(60));
});

// ── ROI ordering — the key invariant ─────────────────────────────────────────

describe("ROI ordering", () => {
  it("short-effort warning ranks above long-effort critical when ROI is higher", () => {
    // totalWeight = 10 + 14 = 24 (both in same station, both failed)
    // A: weight 10, 5 min  → stationGain=41.7, overallGain=20.8 (2 stations), ROI=4.17
    // B: weight 14, 120 min → stationGain=58.3, overallGain=29.2 (2 stations), ROI=0.24
    const A = check("A", false, 10, "warning",  "5 min",   "safe");
    const B = check("B", false, 14, "critical", "2 hrs",   "review");
    const scores = twoStationPlan([A, B], []);
    const plan = buildRemediationPlan(scores);

    expect(plan.all[0]!.checkId).toBe("A");
    expect(plan.all[1]!.checkId).toBe("B");
    expect(plan.all[0]!.roi).toBeGreaterThan(plan.all[1]!.roi);
  });

  it("among equal effort, higher scoreGain ranks first", () => {
    // C: weight 14, 30 min → higher gain
    // D: weight 6,  30 min → lower gain
    const C = check("C", false, 14, "critical", "30 min", "review");
    const D = check("D", false,  6, "warning",  "30 min", "safe");
    const scores = twoStationPlan([C, D], []);
    const plan = buildRemediationPlan(scores);

    expect(plan.all[0]!.checkId).toBe("C");
    expect(plan.all[0]!.scoreGain).toBeGreaterThan(plan.all[1]!.scoreGain);
  });

  it("passed checks are excluded from remediation list", () => {
    const failed = check("F1", false, 10, "warning", "5 min", "safe");
    const passed = check("P1", true,  20, "critical","5 min", "safe");
    const plan = buildRemediationPlan(twoStationPlan([failed, passed], []));

    expect(plan.all.map(i => i.checkId)).not.toContain("P1");
    expect(plan.all).toHaveLength(1);
  });

  it("stubs (confidence: 0) are excluded from remediation list", () => {
    const stub: CheckResult = {
      id: "STUB-001", station: "security", passed: false,
      severity: "warning", confidence: 0, title: "stub",
      failMessage: "stub failed", evidence: "", fixPrompt: "",
      fixDifficulty: "moderate", fixTime: "5 min",
      autoFixSafety: "safe", scoreWeight: 10,
    };
    const real = check("REAL", false, 10, "warning", "5 min", "safe");
    const plan = buildRemediationPlan(twoStationPlan([stub, real], []));

    expect(plan.all.map(i => i.checkId)).not.toContain("STUB-001");
    expect(plan.all.map(i => i.checkId)).toContain("REAL");
  });
});

// ── Projected score ───────────────────────────────────────────────────────────

describe("projectedScore", () => {
  it("projected > current when there are fixable checks", () => {
    const failed = check("X", false, 20, "warning", "5 min", "safe");
    const plan = buildRemediationPlan(twoStationPlan([failed], []));

    expect(plan.projectedScore).toBeGreaterThan(plan.currentScore);
  });

  it("projected equals current when there are no failed checks", () => {
    const p1 = check("P1", true, 10, "warning", "5 min", "safe");
    const plan = buildRemediationPlan(twoStationPlan([p1], []));

    expect(plan.projectedScore).toBe(plan.currentScore);
    expect(plan.all).toHaveLength(0);
    expect(plan.top3).toHaveLength(0);
  });

  it("projected is capped at 100", () => {
    // Build a plan where the score gain would push past 100
    const f1 = check("F1", false, 50, "warning", "5 min", "safe");
    const f2 = check("F2", false, 50, "warning", "5 min", "safe");
    const plan = buildRemediationPlan([
      station("security",       [f1, f2], 95),
      station("accessibility",  [],       100),
    ]);

    expect(plan.projectedScore).toBeLessThanOrEqual(100);
  });

  it("projected = current + sum of top-3 scoreGains (when not capped)", () => {
    // 3 failed checks in different stations to avoid interaction
    const f1 = check("F1", false, 10, "warning", "5 min",  "safe");
    const f2 = check("F2", false, 10, "warning", "15 min", "review");
    const f3 = check("F3", false, 10, "warning", "30 min", "human-only");

    const plan = buildRemediationPlan([
      station("security",       [f1], 0),
      station("accessibility",  [f2], 0),
      station("performance",    [f3], 0),
      station("growth",         [],  0),
      station("quality",        [],  0),
      station("architecture",   [],  0),
      station("data",           [],  0),
      station("compliance",     [],  0),
      station("infrastructure", [],  0),
    ]);

    const sumGains = plan.top3.reduce((s, i) => s + i.scoreGain, 0);
    expect(plan.projectedScore).toBeLessThanOrEqual(100);
    // Allow for rounding
    expect(Math.abs(plan.projectedScore - (plan.currentScore + sumGains))).toBeLessThan(1);
  });
});

// ── AutoFix classification ────────────────────────────────────────────────────

describe("autoFixClass", () => {
  it("safe → SAFE-AUTO", () => {
    const f = check("S", false, 10, "warning", "5 min", "safe");
    const plan = buildRemediationPlan(twoStationPlan([f], []));
    expect(plan.all[0]!.autoFixClass).toBe("SAFE-AUTO");
  });

  it("review → REVIEW", () => {
    const f = check("R", false, 10, "warning", "5 min", "review");
    const plan = buildRemediationPlan(twoStationPlan([f], []));
    expect(plan.all[0]!.autoFixClass).toBe("REVIEW");
  });

  it("human-only → HUMAN-ONLY", () => {
    const f = check("H", false, 10, "warning", "5 min", "human-only");
    const plan = buildRemediationPlan(twoStationPlan([f], []));
    expect(plan.all[0]!.autoFixClass).toBe("HUMAN-ONLY");
  });

  it("all three classes can appear in the same plan", () => {
    const safe   = check("S", false, 10, "warning", "5 min",  "safe");
    const review = check("R", false, 10, "warning", "10 min", "review");
    const human  = check("H", false, 10, "warning", "15 min", "human-only");

    const plan = buildRemediationPlan([
      station("security",      [safe],   50),
      station("accessibility", [review], 50),
      station("performance",   [human],  50),
    ]);

    const classes = plan.all.map(i => i.autoFixClass);
    expect(classes).toContain("SAFE-AUTO");
    expect(classes).toContain("REVIEW");
    expect(classes).toContain("HUMAN-ONLY");
  });
});

// ── top3 cap ──────────────────────────────────────────────────────────────────

describe("top3", () => {
  it("returns at most 3 items", () => {
    const checks = Array.from({ length: 6 }, (_, i) =>
      check(`F${i}`, false, 10, "warning", "5 min", "safe"),
    );
    const plan = buildRemediationPlan(twoStationPlan(checks, []));
    expect(plan.top3).toHaveLength(3);
  });

  it("returns fewer than 3 when not enough failed checks", () => {
    const f = check("F1", false, 10, "warning", "5 min", "safe");
    const plan = buildRemediationPlan(twoStationPlan([f], []));
    expect(plan.top3).toHaveLength(1);
  });

  it("top3 items are the highest-ROI items from the full list", () => {
    const checks = Array.from({ length: 5 }, (_, i) =>
      // Each has a different effort so ROI differs
      check(`F${i}`, false, 10, "warning", `${(i + 1) * 10} min`, "safe"),
    );
    const plan = buildRemediationPlan(twoStationPlan(checks, []));
    // top3[0] should be the lowest effort (10 min = F0)
    expect(plan.top3[0]!.checkId).toBe("F0");
    expect(plan.top3.map(i => i.checkId)).toEqual(["F0", "F1", "F2"]);
  });
});

// ── Mixed severity fixture ────────────────────────────────────────────────────

describe("mixed severity fixture — ranked output", () => {
  it("prints ranked remediation output for a realistic project", () => {
    // Simulate a project scan: some security issues, some SEO gaps
    const secChecks: CheckResult[] = [
      check("SEC-001", false, 14, "critical", "30 min", "review"),    // hardcoded secret
      check("SEC-002", true,  10, "warning",  "5 min",  "safe"),      // .gitignore OK
      check("SEC-005", false,  8, "warning",  "5 min",  "safe"),      // missing headers
      check("SEC-010", false,  5, "warning",  "1 hr",   "review"),    // no validation
      check("SEC-011", true,   5, "warning",  "2 hrs",  "human-only"),// git history OK
    ];
    const seoChecks: CheckResult[] = [
      check("SEO-001", false, 16, "warning", "5 min",  "safe"),       // favicon
      check("SEO-002", false, 15, "warning", "15 min", "safe"),       // og tags
      check("SEO-003", true,  14, "warning", "5 min",  "safe"),       // meta desc OK
      check("SEO-005", false, 12, "warning", "5 min",  "safe"),       // robots.txt
    ];

    const scores: StationScore[] = [
      station("security",    secChecks,    60),
      station("growth",      seoChecks,    55),
      station("accessibility", [],        100),
      station("performance",   [],        100),
      station("quality",       [],        100),
      station("architecture",  [],        100),
      station("data",          [],        100),
      station("compliance",    [],        100),
      station("infrastructure",[],        100),
    ];

    const plan = buildRemediationPlan(scores);

    // Verify structure
    expect(plan.top3).toHaveLength(3);
    expect(plan.projectedScore).toBeGreaterThan(plan.currentScore);

    // All top3 should be short-effort SAFE-AUTO or REVIEW items (not 30-min critical)
    // because short-effort items have much higher ROI
    const top3Efforts = plan.top3.map(i => i.effortMinutes);
    expect(Math.max(...top3Efforts)).toBeLessThanOrEqual(15);

    // SEC-001 (30 min effort) should NOT be in top3 even though it's critical
    expect(plan.top3.map(i => i.checkId)).not.toContain("SEC-001");

    // favicon (SEO-001: 16 weight, 5 min) should be near the top
    const seoItem = plan.all.find(i => i.checkId === "SEO-001");
    expect(seoItem).toBeDefined();
    expect(seoItem!.roi).toBeGreaterThan(0);

    // Snapshot the ranked IDs for visibility
    const rankedIds = plan.all.map(i => `${i.checkId} (${i.effortMinutes}min, ROI=${i.roi})`);
    expect(rankedIds[0]).toMatch(/^(SEO-001|SEO-005|SEC-005)/); // 5-min items lead
  });
});
