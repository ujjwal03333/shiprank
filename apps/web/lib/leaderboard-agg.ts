import {
  type Provenance,
  meetsSybilFloor,
  sybilExclusionReason,
} from "./provenance";

export interface LeaderboardRow {
  scanId: string;
  projectName: string;
  platform: string | null;
  framework: string | null;
  score: number;
  grade: string;
  url: string | null;
  stationScores: Record<string, number>;
  scannedAt: string;
  provenance: Provenance;
  contentHash: string | null;
  fileCount: number;
  lineCount: number;
}

export interface AggregateRow {
  platform?: string;
  framework?: string;
  avgScore: number;
  projectCount: number;
}

export interface EnrichedEntry extends LeaderboardRow {
  aggregateEligible: boolean;
  exclusionReason: string | null;
}

export interface LeaderboardResult {
  entries: EnrichedEntry[];
  platformLeaderboard: AggregateRow[];
  frameworkLeaderboard: AggregateRow[];
  excludedFromAggregates: number;
  note: string | null;
}

export interface AggregateOptions {
  /** When set, the returned `entries` list is filtered to this provenance. */
  provenanceFilter?: Provenance | undefined;
}

/**
 * Turn raw leaderboard rows into display entries plus per-platform /
 * per-framework averages.
 *
 * Aggregate rules (Sybil resistance):
 *   - only `verified` provenance counts toward averages
 *   - the scan must meet the file/line floor
 *   - a given content_hash counts at most once (dedup)
 * Rows that fail these still appear in `entries` with an honest exclusion
 * reason — they keep their full results, they just don't move the averages.
 */
export function aggregateLeaderboard(
  rows: LeaderboardRow[],
  opts: AggregateOptions = {},
): LeaderboardResult {
  const seenHashes = new Set<string>();
  const byPlatform: Record<string, { total: number; count: number }> = {};
  const byFramework: Record<string, { total: number; count: number }> = {};

  const enriched: EnrichedEntry[] = [];
  let excluded = 0;

  for (const row of rows) {
    // Eligibility is evaluated in row order so dedup is deterministic
    // (first occurrence of a content hash wins).
    let eligible = row.provenance === "verified" && meetsSybilFloor(row);
    let reason: string | null = null;

    if (row.provenance !== "verified") {
      reason = `Not counted in averages: provenance is '${row.provenance}' (only verified scans count).`;
    } else if (!meetsSybilFloor(row)) {
      reason = sybilExclusionReason(row);
    } else if (!row.contentHash) {
      eligible = false;
      reason = "Not counted in averages: no content hash on this scan.";
    } else if (seenHashes.has(row.contentHash)) {
      eligible = false;
      reason =
        "Not counted in averages: an identical file tree was already counted (dedup).";
    }

    if (eligible && row.contentHash) {
      seenHashes.add(row.contentHash);
      const plat = row.platform ?? "unknown";
      byPlatform[plat] ??= { total: 0, count: 0 };
      byPlatform[plat]!.total += row.score;
      byPlatform[plat]!.count++;

      const fw = row.framework ?? "unknown";
      byFramework[fw] ??= { total: 0, count: 0 };
      byFramework[fw]!.total += row.score;
      byFramework[fw]!.count++;
    } else {
      excluded++;
    }

    enriched.push({ ...row, aggregateEligible: eligible, exclusionReason: reason });
  }

  const platformLeaderboard = Object.entries(byPlatform)
    .map(([platform, { total, count }]) => ({
      platform,
      avgScore: Math.round(total / count),
      projectCount: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const frameworkLeaderboard = Object.entries(byFramework)
    .map(([framework, { total, count }]) => ({
      framework,
      avgScore: Math.round(total / count),
      projectCount: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const entries = opts.provenanceFilter
    ? enriched.filter((e) => e.provenance === opts.provenanceFilter)
    : enriched;

  const note =
    excluded > 0
      ? `${excluded} scan(s) are shown but excluded from platform/framework averages (below the ${5}-file/${200}-line floor, unverified, or a duplicate file tree).`
      : null;

  return {
    entries,
    platformLeaderboard,
    frameworkLeaderboard,
    excludedFromAggregates: excluded,
    note,
  };
}
