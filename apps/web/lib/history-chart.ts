import type { ScanPoint } from "./velocity";

export interface ChartPoint {
  scanId: string;
  date: string; // short display label, e.g. "Jul 23"
  score: number;
  [station: string]: string | number; // per-station scores, spread in
}

/**
 * Reshapes a project's scan history into recharts-friendly rows: one point
 * per scan, chronological, overall score plus every station's score as its
 * own key so per-station lines are just <Line dataKey="security" /> etc.
 */
export function toChartData(points: ScanPoint[]): ChartPoint[] {
  const sorted = [...points].sort(
    (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime(),
  );

  return sorted.map((p) => ({
    scanId: p.scanId,
    date: new Date(p.scannedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: p.score,
    ...p.stationScores,
  }));
}
