import { describe, it, expect } from "vitest";
import { evaluateLieDetector } from "../lie-detector";

describe("evaluateLieDetector", () => {
  it("marks a claim verified only when mapped ran checks all passed", () => {
    const result = evaluateLieDetector(
      ["SEC-001"],
      ["SEC-003", "SEC-004", "SEC-001", "QUAL-001"],
    );
    const auth = result.claims.find((c) => c.claim === "Authentication added");
    const db = result.claims.find((c) => c.claim === "Database secured");
    const pay = result.claims.find((c) => c.claim === "Payments integrated");
    expect(auth?.verified).toBe(true);
    expect(db?.verified).toBe(true);
    expect(pay?.verified).toBe(false);
    expect(pay?.failedIds).toContain("SEC-001");
  });

  it("ignores mapped checks that did not run (stubs)", () => {
    const result = evaluateLieDetector([], ["SEC-004"]);
    const auth = result.claims.find((c) => c.claim === "Authentication added");
    expect(auth?.verified).toBe(true);
    expect(result.claims.some((c) => c.claim === "Database secured")).toBe(false);
  });

  it("never fabricates claims when nothing ran", () => {
    const result = evaluateLieDetector(["SEC-003"], []);
    expect(result.total).toBe(0);
    expect(result.verifiedCount).toBe(0);
  });
});
