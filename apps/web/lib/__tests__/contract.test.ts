import { describe, it, expect } from "vitest";
import { pickContract, estimateDelta, defaultAgentPrompt } from "../contract";
import type { FindingRow } from "../plan-gating";

function finding(partial: Partial<FindingRow> & Pick<FindingRow, "checkId" | "title">): FindingRow {
  return {
    id: partial.id ?? partial.checkId,
    checkId: partial.checkId,
    title: partial.title,
    severity: partial.severity ?? "medium",
    passed: partial.passed ?? false,
    filePath: partial.filePath ?? null,
    lineNumber: partial.lineNumber ?? null,
    snippet: partial.snippet ?? null,
    fixSuggestion: partial.fixSuggestion ?? null,
    docsUrl: partial.docsUrl ?? null,
  };
}

describe("pickContract", () => {
  it("returns null when nothing is failing", () => {
    expect(
      pickContract([finding({ checkId: "SEC-001", title: "ok", passed: true })]),
    ).toBeNull();
  });

  it("picks the highest-severity failure", () => {
    const c = pickContract([
      finding({ checkId: "QUAL-001", title: "no tests", severity: "low" }),
      finding({ checkId: "SEC-003", title: "RLS off", severity: "critical" }),
      finding({ checkId: "PERF-001", title: "images", severity: "medium" }),
    ]);
    expect(c?.checkId).toBe("SEC-003");
    expect(c?.estimatedDelta).toBe(8);
    expect(c?.why.length).toBeGreaterThan(10);
  });

  it("embeds the fix as the Do this step, not as the whole prompt", () => {
    const c = pickContract([
      finding({
        checkId: "SEC-004",
        title: "client-only auth",
        severity: "critical",
        fixSuggestion: "Guard the route.",
      }),
    ]);
    expect(c?.prompt).toContain("Close this ShipRank contract.");
    expect(c?.prompt).toContain("Contract: SEC-004 — client-only auth");
    expect(c?.prompt).toContain("Do this:");
    expect(c?.prompt).toContain("Guard the route.");
    expect(c?.prompt).toContain("This check must pass: SEC-004");
    expect(c?.prompt).toContain("npx shiprank");
  });
});

describe("estimateDelta / defaultAgentPrompt", () => {
  it("scales by severity", () => {
    expect(estimateDelta("critical")).toBe(8);
    expect(estimateDelta("info")).toBe(2);
  });

  it("names the contract in the fallback prompt", () => {
    const p = defaultAgentPrompt({
      checkId: "SEC-003",
      title: "RLS off",
      filePath: "supabase/schema.sql",
      lineNumber: 12,
    });
    expect(p).toContain("SEC-003");
    expect(p).toContain("Where: supabase/schema.sql:12");
    expect(p).toContain("Close this ShipRank contract.");
    expect(p).toContain("This check must pass: SEC-003");
  });
});
