import { describe, it, expect, vi } from "vitest";
import { fetchScanFindings } from "../scan-findings";

function mockDb(response: { data: unknown[] | null; error: unknown }) {
  const eq = vi.fn().mockResolvedValue(response);
  const inFn = vi.fn().mockReturnValue({ eq });
  const select = vi.fn().mockReturnValue({ in: inFn });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, inFn, eq } as unknown as {
    from: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    inFn: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
  };
}

describe("fetchScanFindings", () => {
  it("returns empty array for empty station result ids", async () => {
    const db = mockDb({ data: [], error: null });
    const result = await fetchScanFindings(db as never, []);
    expect(result).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("queries check_results and maps fields to camelCase", async () => {
    const rows = [
      {
        id: "cr-1",
        check_id: "SEC-001",
        title: "No secrets",
        severity: "critical",
        passed: false,
        file_path: "src/index.ts",
        line_number: 5,
        snippet: "const key = ...",
        fix_suggestion: "Use env vars",
        docs_url: "https://example.com",
      },
    ];
    const db = mockDb({ data: rows, error: null });

    const result = await fetchScanFindings(db as never, ["sr-1"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "cr-1",
      checkId: "SEC-001",
      title: "No secrets",
      severity: "critical",
      passed: false,
      filePath: "src/index.ts",
      lineNumber: 5,
      snippet: "const key = ...",
      fixSuggestion: "Use env vars",
      docsUrl: "https://example.com",
    });
  });

  it("returns empty array on query error", async () => {
    const db = mockDb({ data: null, error: { message: "table missing" } });
    const result = await fetchScanFindings(db as never, ["sr-1"]);
    expect(result).toEqual([]);
  });
});
