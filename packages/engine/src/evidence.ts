/**
 * Evidence strings in this engine follow "<path>[:line]: message".
 * Contract 01 is not allowed to ship without a path we can point an agent at.
 */
export function parseEvidenceLoc(
  evidence: string | null | undefined,
): { filePath: string; lineNumber: number | null } | null {
  if (!evidence) return null;
  const first = evidence.split(";")[0]?.trim() ?? "";
  const m = first.match(/^([^\s:;]+?\.[A-Za-z0-9]+)(?::(\d+))?/);
  if (!m?.[1]) return null;
  if (m[1].startsWith("http")) return null;
  return {
    filePath: m[1],
    lineNumber: m[2] ? Number(m[2]) : null,
  };
}

export function attachEvidenceLoc<T extends { evidence?: string; filePath?: string | null; lineNumber?: number | null }>(
  result: T,
): T {
  if (result.filePath) return result;
  const loc = parseEvidenceLoc(result.evidence);
  if (!loc) return result;
  return { ...result, filePath: loc.filePath, lineNumber: loc.lineNumber };
}
