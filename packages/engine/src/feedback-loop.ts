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
