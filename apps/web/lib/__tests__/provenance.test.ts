import { describe, it, expect } from "vitest";
import {
  meetsSybilFloor,
  sybilExclusionReason,
  isAggregateEligible,
  classifyProvenance,
  isPublicBoardProvenance,
  publicBoardEntries,
  SYBIL_MIN_FILES,
  SYBIL_MIN_LINES,
} from "../provenance";

describe("meetsSybilFloor", () => {
  it("returns true when both thresholds are met", () => {
    expect(meetsSybilFloor({ fileCount: 10, lineCount: 500 })).toBe(true);
  });

  it("returns false when fileCount is below minimum", () => {
    expect(meetsSybilFloor({ fileCount: 2, lineCount: 500 })).toBe(false);
  });

  it("returns false when lineCount is below minimum", () => {
    expect(meetsSybilFloor({ fileCount: 10, lineCount: 50 })).toBe(false);
  });

  it("returns true at exact thresholds", () => {
    expect(
      meetsSybilFloor({
        fileCount: SYBIL_MIN_FILES,
        lineCount: SYBIL_MIN_LINES,
      }),
    ).toBe(true);
  });
});

describe("sybilExclusionReason", () => {
  it("returns null when above floor", () => {
    expect(sybilExclusionReason({ fileCount: 20, lineCount: 1000 })).toBeNull();
  });

  it("returns file-count reason when files are below minimum", () => {
    const reason = sybilExclusionReason({ fileCount: 2, lineCount: 1000 });
    expect(reason).toContain("2 files");
    expect(reason).toContain(`min ${SYBIL_MIN_FILES}`);
  });

  it("returns line-count reason when lines are below minimum", () => {
    const reason = sybilExclusionReason({ fileCount: 10, lineCount: 50 });
    expect(reason).toContain("50 lines");
    expect(reason).toContain(`min ${SYBIL_MIN_LINES}`);
  });

  it("checks files before lines", () => {
    const reason = sybilExclusionReason({ fileCount: 1, lineCount: 10 });
    expect(reason).toContain("files");
  });
});

describe("isAggregateEligible", () => {
  const base = {
    provenance: "verified" as const,
    fileCount: 20,
    lineCount: 1000,
    contentHash: "abc123",
    seenHashes: new Set<string>(),
  };

  it("returns true for verified, above-floor, unique hash", () => {
    expect(isAggregateEligible(base)).toBe(true);
  });

  it("rejects non-verified provenance", () => {
    expect(
      isAggregateEligible({ ...base, provenance: "self-reported" }),
    ).toBe(false);
    expect(isAggregateEligible({ ...base, provenance: "seed" })).toBe(false);
  });

  it("rejects below-floor scans", () => {
    expect(isAggregateEligible({ ...base, fileCount: 1 })).toBe(false);
  });

  it("rejects null content hash", () => {
    expect(isAggregateEligible({ ...base, contentHash: null })).toBe(false);
  });

  it("rejects duplicate content hash", () => {
    const seen = new Set(["abc123"]);
    expect(isAggregateEligible({ ...base, seenHashes: seen })).toBe(false);
  });
});

describe("isPublicBoardProvenance", () => {
  it("hides seed fixtures from public surfaces", () => {
    expect(isPublicBoardProvenance("seed")).toBe(false);
    expect(isPublicBoardProvenance("verified")).toBe(true);
    expect(isPublicBoardProvenance("self-reported")).toBe(true);
    expect(isPublicBoardProvenance(null)).toBe(true);
  });

  it("strips seed rows from a public list", () => {
    const rows = publicBoardEntries([
      { provenance: "seed" as const, name: "DevDash" },
      { provenance: "verified" as const, name: "aicommits" },
      { provenance: "self-reported" as const, name: "local" },
    ]);
    expect(rows.map((r) => r.name)).toEqual(["aicommits", "local"]);
  });
});

describe("classifyProvenance", () => {
  it("classifies cli-upload as verified", () => {
    expect(classifyProvenance("cli-upload")).toBe("verified");
  });

  it("classifies dare as verified", () => {
    expect(classifyProvenance("dare")).toBe("verified");
  });

  it("classifies seed as seed", () => {
    expect(classifyProvenance("seed")).toBe("seed");
  });

  it("classifies everything else as self-reported", () => {
    expect(classifyProvenance("web-form")).toBe("self-reported");
    expect(classifyProvenance("api")).toBe("self-reported");
    expect(classifyProvenance("")).toBe("self-reported");
  });
});
