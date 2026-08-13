/**
 * Monitoring tier — scheduling and regression detection. Pure, no I/O, so
 * the "which projects are due" and "did this scan regress" logic is
 * testable with fixtures independent of git cloning or the scan engine.
 */
export interface MonitoredProjectRow {
  id: string;
  repoUrl: string;
  scanFrequency: string;
  lastScannedAt: string | null;
  nextScanAt: string;
}

export function isDue(project: MonitoredProjectRow, now: Date): boolean {
  return new Date(project.nextScanAt).getTime() <= now.getTime();
}

export function selectDueProjects(
  projects: MonitoredProjectRow[],
  now: Date,
): MonitoredProjectRow[] {
  return projects.filter((p) => isDue(p, now));
}

const FREQUENCY_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/** Next scan timestamp for a frequency, computed from `from` (not now() drift). */
export function computeNextScanAt(scanFrequency: string, from: Date): string {
  const ms = FREQUENCY_MS[scanFrequency] ?? FREQUENCY_MS["weekly"]!;
  return new Date(from.getTime() + ms).toISOString();
}

export const REGRESSION_SCORE_DROP_THRESHOLD = 5;

export interface RegressionCheckInput {
  previousScore: number;
  newScore: number;
  /** Titles of critical findings present in the new scan but not the previous one. */
  newCriticalFindings: string[];
}

export interface RegressionResult {
  isRegression: boolean;
  scoreDelta: number;
  reasons: string[];
}

/**
 * Regression trigger: score dropped >= REGRESSION_SCORE_DROP_THRESHOLD points,
 * OR any new critical finding appeared. Either alone is sufficient.
 */
export function detectRegression(input: RegressionCheckInput): RegressionResult {
  const scoreDelta = input.newScore - input.previousScore;
  const reasons: string[] = [];

  if (scoreDelta <= -REGRESSION_SCORE_DROP_THRESHOLD) {
    reasons.push(
      `Score dropped ${Math.abs(scoreDelta)} points (${input.previousScore} → ${input.newScore}).`,
    );
  }
  if (input.newCriticalFindings.length > 0) {
    reasons.push(
      `${input.newCriticalFindings.length} new critical finding(s): ${input.newCriticalFindings.join(", ")}.`,
    );
  }

  return { isRegression: reasons.length > 0, scoreDelta, reasons };
}

/** Titles present in `newTitles` but not `previousTitles` — used to find new critical findings. */
export function newFindingTitles(
  previousTitles: string[],
  newTitles: string[],
): string[] {
  const seen = new Set(previousTitles);
  return newTitles.filter((t) => !seen.has(t));
}
