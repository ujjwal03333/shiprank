import { describe, it, expect } from "vitest";
import { decisionContextFor } from "../decision-context";

describe("decisionContextFor", () => {
  it("returns a specific record for SEC-003", () => {
    const ctx = decisionContextFor("SEC-003");
    expect(ctx.probableCause.toLowerCase()).toContain("rls");
    expect(ctx.frequencyPct).toBeUndefined();
  });

  it("attaches frequency only when sample is large enough", () => {
    const withData = decisionContextFor("SEC-001", { failPct: 87, sampleSize: 40 });
    expect(withData.frequencyPct).toBe(87);
    expect(withData.sampleSize).toBe(40);

    const tooSmall = decisionContextFor("SEC-001", { failPct: 87, sampleSize: 3 });
    expect(tooSmall.frequencyPct).toBeUndefined();
  });

  it("falls back generically for unknown checks", () => {
    const ctx = decisionContextFor("NOPE-999");
    expect(ctx.aiPattern.length).toBeGreaterThan(10);
  });
});
