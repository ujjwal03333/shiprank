import { describe, it, expect } from "vitest";
import { computeContentHash } from "../attestation";

describe("computeContentHash", () => {
  it("is deterministic for identical trees", () => {
    const a = computeContentHash([
      { path: "src/a.ts", content: "const a = 1;" },
      { path: "src/b.ts", content: "const b = 2;" },
    ]);
    const b = computeContentHash([
      { path: "src/a.ts", content: "const a = 1;" },
      { path: "src/b.ts", content: "const b = 2;" },
    ]);
    expect(a).toBe(b);
  });

  it("is order-independent (same files, different discovery order)", () => {
    const forward = computeContentHash([
      { path: "src/a.ts", content: "A" },
      { path: "src/b.ts", content: "B" },
      { path: "src/c.ts", content: "C" },
    ]);
    const shuffled = computeContentHash([
      { path: "src/c.ts", content: "C" },
      { path: "src/a.ts", content: "A" },
      { path: "src/b.ts", content: "B" },
    ]);
    expect(forward).toBe(shuffled);
  });

  it("changes when any file content changes", () => {
    const base = computeContentHash([{ path: "x.ts", content: "1" }]);
    const changed = computeContentHash([{ path: "x.ts", content: "2" }]);
    expect(base).not.toBe(changed);
  });

  it("changes when a file path changes", () => {
    const base = computeContentHash([{ path: "x.ts", content: "1" }]);
    const renamed = computeContentHash([{ path: "y.ts", content: "1" }]);
    expect(base).not.toBe(renamed);
  });

  it("does not collide on path/content boundary ambiguity", () => {
    // ("ab","c") vs ("a","bc") must differ — the NUL separator guarantees this
    const first = computeContentHash([{ path: "ab", content: "c" }]);
    const second = computeContentHash([{ path: "a", content: "bc" }]);
    expect(first).not.toBe(second);
  });

  it("produces a 64-char lowercase hex sha-256 digest", () => {
    const h = computeContentHash([{ path: "a", content: "b" }]);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles an empty tree deterministically", () => {
    expect(computeContentHash([])).toBe(computeContentHash([]));
  });
});
