export interface CheckFrequency {
  checkId: string;
  totalScans: number;
  failCount: number;
  failRate: number;
  fixPrompt: string;
}

export interface ScanCheckRecord {
  check_id: string;
  passed: boolean;
  fix_suggestion: string | null;
}

export function computeFailFrequencies(
  scanChecks: ScanCheckRecord[],
  totalScanCount: number,
): CheckFrequency[] {
  if (totalScanCount === 0) return [];

  const grouped = new Map<string, { fails: number; fixPrompt: string }>();

  for (const record of scanChecks) {
    const existing = grouped.get(record.check_id);
    if (existing) {
      if (!record.passed) existing.fails++;
      if (!existing.fixPrompt && record.fix_suggestion) {
        existing.fixPrompt = record.fix_suggestion;
      }
    } else {
      grouped.set(record.check_id, {
        fails: record.passed ? 0 : 1,
        fixPrompt: record.fix_suggestion ?? "",
      });
    }
  }

  const results: CheckFrequency[] = [];
  for (const [checkId, data] of grouped) {
    results.push({
      checkId,
      totalScans: totalScanCount,
      failCount: data.fails,
      failRate: data.fails / totalScanCount,
      fixPrompt: data.fixPrompt,
    });
  }

  return results.sort((a, b) => b.failRate - a.failRate);
}

export function getElevatedConstraints(
  frequencies: CheckFrequency[],
  threshold = 0.5,
): string[] {
  return frequencies
    .filter(f => f.failRate >= threshold && f.fixPrompt)
    .map(f => `- ${f.fixPrompt} [auto-elevated: ${Math.round(f.failRate * 100)}% fail rate across ${f.totalScans} scans]`);
}

export interface MemoryFailRow {
  checkId: string;
  title: string;
  fixSuggestion: string | null;
}

const MEMORY_LIMIT = 5;
const MEMORY_LINE_MAX = 240;

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Top Board failures → Compile extras. Deterministic: same rows → same lines.
 * Empty input → []. Never invents constraints from nothing.
 */
export function memoryConstraintLines(
  rows: readonly MemoryFailRow[],
  limit = MEMORY_LIMIT,
): string[] {
  if (rows.length === 0 || limit <= 0) return [];

  const grouped = new Map<string, { fails: number; text: string }>();
  for (const row of rows) {
    const text = oneLine(row.fixSuggestion ?? "") || oneLine(row.title);
    const existing = grouped.get(row.checkId);
    if (existing) {
      existing.fails++;
      if (text && (existing.text === "" || text < existing.text)) {
        existing.text = text;
      }
    } else {
      grouped.set(row.checkId, { fails: 1, text });
    }
  }

  return [...grouped.entries()]
    .filter(([, v]) => v.fails > 0 && v.text.length > 0)
    .sort((a, b) => {
      const byFails = b[1].fails - a[1].fails;
      if (byFails !== 0) return byFails;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([checkId, v]) => {
      const body = v.text.length > MEMORY_LINE_MAX ? v.text.slice(0, MEMORY_LINE_MAX) : v.text;
      return `- ${checkId} — ${body}`;
    });
}
