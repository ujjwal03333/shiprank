/**
 * Vulnerability genome — pure aggregation over check_genome_rows.
 * Fail-frequency per check_id, grouped separately by platform and by model.
 */
export const GENOME_LOW_VOLUME_THRESHOLD = 20;

export interface GenomeRow {
  checkId: string;
  passed: boolean;
  scanId: string;
  platform: string;
  model: string;
}

export interface GenomeCohort {
  checkId: string;
  cohort: string; // platform name, or model name
  scanCount: number;
  failCount: number;
  failRate: number;
  lowVolume: boolean;
}

export interface GenomeMatrix {
  byPlatform: GenomeCohort[];
  byModel: GenomeCohort[];
  totalEligibleScans: number;
  generatedAt: string;
}

interface CohortAccumulator {
  checkId: string;
  cohort: string;
  scans: Set<string>;
  fails: number;
  total: number;
}

function aggregateByDimension(
  rows: GenomeRow[],
  dimension: "platform" | "model",
): GenomeCohort[] {
  // Keyed by checkId, then by cohort — a nested map avoids any ambiguity
  // from concatenating+splitting strings if a platform/model name were ever
  // to contain a separator character.
  const byCheck = new Map<string, Map<string, CohortAccumulator>>();

  for (const row of rows) {
    const cohortName = row[dimension];
    const cohorts = byCheck.get(row.checkId) ?? new Map<string, CohortAccumulator>();
    byCheck.set(row.checkId, cohorts);

    const entry = cohorts.get(cohortName) ?? {
      checkId: row.checkId,
      cohort: cohortName,
      scans: new Set<string>(),
      fails: 0,
      total: 0,
    };
    entry.scans.add(row.scanId);
    entry.total++;
    if (!row.passed) entry.fails++;
    cohorts.set(cohortName, entry);
  }

  const out: GenomeCohort[] = [];
  for (const cohorts of byCheck.values()) {
    for (const entry of cohorts.values()) {
      const scanCount = entry.scans.size;
      out.push({
        checkId: entry.checkId,
        cohort: entry.cohort,
        scanCount,
        failCount: entry.fails,
        failRate:
          entry.total > 0 ? Math.round((entry.fails / entry.total) * 1000) / 1000 : 0,
        lowVolume: scanCount < GENOME_LOW_VOLUME_THRESHOLD,
      });
    }
  }

  return out.sort((a, b) =>
    a.checkId === b.checkId
      ? b.failRate - a.failRate
      : a.checkId.localeCompare(b.checkId),
  );
}

export function buildGenomeMatrix(rows: GenomeRow[]): GenomeMatrix {
  const totalEligibleScans = new Set(rows.map((r) => r.scanId)).size;
  return {
    byPlatform: aggregateByDimension(rows, "platform"),
    byModel: aggregateByDimension(rows, "model"),
    totalEligibleScans,
    generatedAt: new Date().toISOString(),
  };
}
