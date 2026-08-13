/**
 * Temporal decay / quality velocity.
 *
 * Pure computation over a project's scan history — no I/O. The caller
 * fetches scans + station_results for a project (ordered any way) and hands
 * them to computeVelocity(), which sorts by scannedAt and derives deltas.
 */
export interface ScanPoint {
  scanId: string;
  score: number;
  stationScores: Record<string, number>;
  scannedAt: string; // ISO
  /** Failing/new-finding count for this scan, if known. */
  newFindingsCount?: number | null;
  /** Likely-AI commits analyzed for this scan's fingerprint, if known. */
  aiCommitCount?: number | null;
}

export interface ConsecutiveDelta {
  scanId: string;
  scannedAt: string;
  scoreDelta: number;
  stationDeltas: Record<string, number>;
  daysSincePrevious: number;
}

export type VelocityDirection = "up" | "down" | "flat";

export interface VelocitySummary {
  scoreDelta: number;
  stationDeltas: Record<string, number>;
  daysSinceLast: number;
  pointsPerWeek: number;
  direction: VelocityDirection;
  previousScannedAt: string;
  /** null when no fingerprint AI-commit data is available for the latest scan. */
  newFindingsPerAiCommit: number | null;
}

export interface ProjectVelocity {
  /** One entry per scan after the first, in chronological order. */
  history: ConsecutiveDelta[];
  /** Summary vs. the immediately preceding scan. Null when <2 scans exist. */
  latest: VelocitySummary | null;
}

function stationDeltaBetween(
  prev: Record<string, number>,
  cur: Record<string, number>,
): Record<string, number> {
  const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
  const deltas: Record<string, number> = {};
  for (const k of keys) {
    deltas[k] = (cur[k] ?? 0) - (prev[k] ?? 0);
  }
  return deltas;
}

export function computeVelocity(points: ScanPoint[]): ProjectVelocity {
  const sorted = [...points].sort(
    (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime(),
  );

  if (sorted.length < 2) return { history: [], latest: null };

  const history: ConsecutiveDelta[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const msDiff =
      new Date(cur.scannedAt).getTime() - new Date(prev.scannedAt).getTime();
    history.push({
      scanId: cur.scanId,
      scannedAt: cur.scannedAt,
      scoreDelta: cur.score - prev.score,
      stationDeltas: stationDeltaBetween(prev.stationScores, cur.stationScores),
      daysSincePrevious: msDiff / 86_400_000,
    });
  }

  const last = history[history.length - 1]!;
  const prevPoint = sorted[sorted.length - 2]!;
  const curPoint = sorted[sorted.length - 1]!;
  const weeks = last.daysSincePrevious / 7;
  const pointsPerWeek = weeks > 0 ? last.scoreDelta / weeks : 0;

  const newFindingsPerAiCommit =
    curPoint.newFindingsCount != null &&
    curPoint.aiCommitCount != null &&
    curPoint.aiCommitCount > 0
      ? curPoint.newFindingsCount / curPoint.aiCommitCount
      : null;

  const latest: VelocitySummary = {
    scoreDelta: last.scoreDelta,
    stationDeltas: last.stationDeltas,
    daysSinceLast: last.daysSincePrevious,
    pointsPerWeek: Math.round(pointsPerWeek * 10) / 10,
    direction: last.scoreDelta > 0 ? "up" : last.scoreDelta < 0 ? "down" : "flat",
    previousScannedAt: prevPoint.scannedAt,
    newFindingsPerAiCommit,
  };

  return { history, latest };
}

function timeAgoLabel(days: number): string {
  if (days < 1) return "today";
  if (days < 2) return "1 day ago";
  if (days < 14) return `${Math.round(days)} days ago`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** "↑ +4 points since last scan (3 days ago)" */
export function formatVelocityLabel(latest: VelocitySummary): string {
  const arrow =
    latest.direction === "up" ? "↑" : latest.direction === "down" ? "↓" : "→";
  const sign = latest.scoreDelta > 0 ? "+" : "";
  const n = Math.abs(latest.scoreDelta);
  return `${arrow} ${sign}${latest.scoreDelta} point${n === 1 ? "" : "s"} since last scan (${timeAgoLabel(latest.daysSinceLast)})`;
}
