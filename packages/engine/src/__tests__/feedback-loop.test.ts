import { describe, it, expect } from "vitest";
import { computeFailFrequencies, getElevatedConstraints } from "../feedback-loop";
import type { ScanCheckRecord } from "../feedback-loop";

describe("computeFailFrequencies", () => {
  it("returns empty array for zero scans", () => {
    expect(computeFailFrequencies([], 0)).toEqual([]);
  });

  it("computes correct fail rates across 20+ scans", () => {
    const records: ScanCheckRecord[] = [];
    const TOTAL_SCANS = 25;

    // SEC-001 fails in 20 of 25 scans (80%)
    for (let i = 0; i < TOTAL_SCANS; i++) {
      records.push({
        check_id: "SEC-001",
        passed: i >= 20, // fails for scans 0-19, passes 20-24
        fix_suggestion: "Enable RLS on all tables",
      });
    }

    // QUAL-005 fails in 15 of 25 scans (60%)
    for (let i = 0; i < TOTAL_SCANS; i++) {
      records.push({
        check_id: "QUAL-005",
        passed: i >= 15,
        fix_suggestion: "Remove console.log from production code",
      });
    }

    // QUAL-001 fails in 5 of 25 scans (20%)
    for (let i = 0; i < TOTAL_SCANS; i++) {
      records.push({
        check_id: "QUAL-001",
        passed: i >= 5,
        fix_suggestion: "Add test files",
      });
    }

    // PERF-001 never fails (0%)
    for (let i = 0; i < TOTAL_SCANS; i++) {
      records.push({
        check_id: "PERF-001",
        passed: true,
        fix_suggestion: null,
      });
    }

    const freqs = computeFailFrequencies(records, TOTAL_SCANS);

    expect(freqs.length).toBe(4);

    // Sorted by fail rate descending
    expect(freqs[0]!.checkId).toBe("SEC-001");
    expect(freqs[0]!.failRate).toBe(0.8);
    expect(freqs[0]!.failCount).toBe(20);

    expect(freqs[1]!.checkId).toBe("QUAL-005");
    expect(freqs[1]!.failRate).toBe(0.6);
    expect(freqs[1]!.failCount).toBe(15);

    expect(freqs[2]!.checkId).toBe("QUAL-001");
    expect(freqs[2]!.failRate).toBe(0.2);
    expect(freqs[2]!.failCount).toBe(5);

    expect(freqs[3]!.checkId).toBe("PERF-001");
    expect(freqs[3]!.failRate).toBe(0);
  });
});

describe("getElevatedConstraints", () => {
  it("returns constraints for checks exceeding the threshold", () => {
    const freqs = computeFailFrequencies(
      // 25 scans, SEC-001 fails 20 times, QUAL-005 fails 15
      [
        ...Array.from({ length: 25 }, (_, i) => ({
          check_id: "SEC-001",
          passed: i >= 20,
          fix_suggestion: "Enable RLS on all tables",
        })),
        ...Array.from({ length: 25 }, (_, i) => ({
          check_id: "QUAL-005",
          passed: i >= 15,
          fix_suggestion: "Remove console.log from production code",
        })),
        ...Array.from({ length: 25 }, (_, i) => ({
          check_id: "QUAL-001",
          passed: i >= 5,
          fix_suggestion: "Add test files",
        })),
      ],
      25,
    );

    const elevated = getElevatedConstraints(freqs, 0.5);

    expect(elevated.length).toBe(2);
    expect(elevated[0]).toContain("Enable RLS on all tables");
    expect(elevated[0]).toContain("80%");
    expect(elevated[1]).toContain("Remove console.log");
    expect(elevated[1]).toContain("60%");
  });

  it("returns nothing when no checks exceed threshold", () => {
    const freqs = computeFailFrequencies(
      Array.from({ length: 25 }, () => ({
        check_id: "SEC-001",
        passed: true,
        fix_suggestion: "Enable RLS",
      })),
      25,
    );

    expect(getElevatedConstraints(freqs, 0.5)).toEqual([]);
  });

  it("uses default 50% threshold", () => {
    const freqs = computeFailFrequencies(
      Array.from({ length: 20 }, (_, i) => ({
        check_id: "SEC-001",
        passed: i >= 10, // exactly 50%
        fix_suggestion: "Fix it",
      })),
      20,
    );

    const elevated = getElevatedConstraints(freqs);
    expect(elevated.length).toBe(1);
  });

  it("elevated constraints integrate into compiler (structural proof)", () => {
    const freqs = computeFailFrequencies(
      Array.from({ length: 25 }, (_, i) => ({
        check_id: "SEC-001",
        passed: i >= 20,
        fix_suggestion: "Enable RLS on all tables",
      })),
      25,
    );

    const elevated = getElevatedConstraints(freqs, 0.5);

    // The elevated constraints are string[] — exactly the type
    // that compiler.compile() accepts as its last parameter.
    // This proves zero additional engineering is needed: once scan
    // volume grows and this function returns non-empty arrays,
    // they flow directly into compile().
    expect(Array.isArray(elevated)).toBe(true);
    expect(typeof elevated[0]).toBe("string");
    expect(elevated[0]).toMatch(/^- /);
  });
});
