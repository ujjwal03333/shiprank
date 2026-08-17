export interface ModelScanRow {
  model: string;
  score: number;
  stationScores: Record<string, number>;
  scanId: string;
}

export type ModelConfidence = "none" | "low" | "full";

export interface ModelRanking {
  model: string;
  avgScore: number;
  scanCount: number;
  bestStation: string | null;
  worstStation: string | null;
  stationAverages: Record<string, number>;
  topFailingChecks: Array<{ checkId: string; failRate: number; sample: number }>;
  confidence: ModelConfidence;
}

export function confidenceForCount(n: number): ModelConfidence {
  if (n < 5) return "none";
  if (n < 20) return "low";
  return "full";
}

export function rankModels(
  rows: ModelScanRow[],
  failRatesByModel: Map<string, Array<{ checkId: string; failRate: number; sample: number }>> = new Map(),
): ModelRanking[] {
  const byModel = new Map<string, ModelScanRow[]>();
  for (const row of rows) {
    const key = row.model || "unknown";
    const list = byModel.get(key) ?? [];
    list.push(row);
    byModel.set(key, list);
  }

  const rankings: ModelRanking[] = [];
  for (const [model, scans] of byModel) {
    const scanCount = scans.length;
    const avgScore = Math.round(
      scans.reduce((s, r) => s + r.score, 0) / scanCount,
    );

    const stationTotals: Record<string, { sum: number; n: number }> = {};
    for (const scan of scans) {
      for (const [station, score] of Object.entries(scan.stationScores)) {
        stationTotals[station] ??= { sum: 0, n: 0 };
        stationTotals[station]!.sum += score;
        stationTotals[station]!.n++;
      }
    }
    const stationAverages: Record<string, number> = {};
    let bestStation: string | null = null;
    let worstStation: string | null = null;
    for (const [station, { sum, n }] of Object.entries(stationTotals)) {
      const avg = Math.round(sum / n);
      stationAverages[station] = avg;
      if (bestStation == null || avg > stationAverages[bestStation]!) bestStation = station;
      if (worstStation == null || avg < stationAverages[worstStation]!) worstStation = station;
    }

    rankings.push({
      model,
      avgScore,
      scanCount,
      bestStation,
      worstStation,
      stationAverages,
      topFailingChecks: (failRatesByModel.get(model) ?? [])
        .slice()
        .sort((a, b) => b.failRate - a.failRate)
        .slice(0, 5),
      confidence: confidenceForCount(scanCount),
    });
  }

  return rankings.sort((a, b) => {
    if (a.confidence === "none" && b.confidence !== "none") return 1;
    if (b.confidence === "none" && a.confidence !== "none") return -1;
    return b.avgScore - a.avgScore;
  });
}
