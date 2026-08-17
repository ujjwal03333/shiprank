import { describe, it, expect, vi } from "vitest";
import { fetchCheckPrevalence } from "../check-prevalence";

function mockDb(response: { data: unknown[] | null; error: unknown }) {
  const inFn = vi.fn().mockResolvedValue(response);
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as { from: ReturnType<typeof vi.fn> };
}

describe("fetchCheckPrevalence", () => {
  it("returns empty map for empty checkIds", async () => {
    const db = mockDb({ data: [], error: null });
    const result = await fetchCheckPrevalence(db as never, []);
    expect(result.size).toBe(0);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("aggregates pass/fail counts and computes failPct", async () => {
    const rows = [
      { check_id: "SEC-001", passed: true },
      { check_id: "SEC-001", passed: true },
      { check_id: "SEC-001", passed: false },
      ...Array.from({ length: 7 }, () => ({
        check_id: "SEC-001",
        passed: true,
      })),
    ];
    const db = mockDb({ data: rows, error: null });

    const result = await fetchCheckPrevalence(db as never, ["SEC-001"]);
    expect(result.size).toBe(1);
    const entry = result.get("SEC-001")!;
    expect(entry.sampleSize).toBe(10);
    expect(entry.failPct).toBe(10);
  });

  it("excludes checks with fewer than 10 samples", async () => {
    const rows = Array.from({ length: 5 }, () => ({
      check_id: "QUAL-001",
      passed: false,
    }));
    const db = mockDb({ data: rows, error: null });

    const result = await fetchCheckPrevalence(db as never, ["QUAL-001"]);
    expect(result.size).toBe(0);
  });

  it("returns empty map on query error", async () => {
    const db = mockDb({ data: null, error: { message: "connection refused" } });
    const result = await fetchCheckPrevalence(db as never, ["SEC-001"]);
    expect(result.size).toBe(0);
  });

  it("handles multiple check IDs independently", async () => {
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => ({
        check_id: "SEC-001",
        passed: i < 8,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        check_id: "QUAL-002",
        passed: i < 3,
      })),
    ];
    const db = mockDb({ data: rows, error: null });

    const result = await fetchCheckPrevalence(db as never, [
      "SEC-001",
      "QUAL-002",
    ]);
    expect(result.size).toBe(2);
    expect(result.get("SEC-001")!.failPct).toBe(20);
    expect(result.get("QUAL-002")!.failPct).toBe(75);
  });
});
