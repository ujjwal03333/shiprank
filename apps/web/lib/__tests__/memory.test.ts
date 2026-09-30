import { describe, it, expect, vi } from "vitest";
import { loadMemoryConstraints } from "../memory";

function mockDb(response: { data: unknown[] | null; error: unknown }) {
  const neq = vi.fn().mockResolvedValue(response);
  const eq3 = vi.fn().mockReturnValue({ neq });
  const eq2 = vi.fn().mockReturnValue({ eq: eq3 });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as Parameters<typeof loadMemoryConstraints>[0];
}

describe("loadMemoryConstraints", () => {
  it("returns [] when the table is empty", async () => {
    expect(await loadMemoryConstraints(mockDb({ data: [], error: null }))).toEqual([]);
  });

  it("returns [] when the table is unreadable", async () => {
    expect(
      await loadMemoryConstraints(mockDb({ data: null, error: { message: "boom" } })),
    ).toEqual([]);
  });

  it("returns at most 5 MEMORY lines from Board fails", async () => {
    const rows = [
      ...Array.from({ length: 4 }, () => ({
        check_id: "SEC-002",
        title: "env",
        fix_suggestion: "Add .env to gitignore",
      })),
      ...Array.from({ length: 2 }, () => ({
        check_id: "SEC-005",
        title: "headers",
        fix_suggestion: "Add security headers",
      })),
    ];
    const lines = await loadMemoryConstraints(mockDb({ data: rows, error: null }));
    expect(lines).toEqual([
      "- SEC-002 — Add .env to gitignore",
      "- SEC-005 — Add security headers",
    ]);
  });
});
