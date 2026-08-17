/**
 * Provenance tiers + Sybil-resistance floors.
 *
 * provenance describes how much we trust a scan's origin:
 *   - 'seed'          — hand-seeded demo data
 *   - 'self-reported' — submitted without a verified pipeline
 *   - 'verified'      — produced by the ShipRank CLI/engine upload path
 *
 * Sybil floors gate whether a scan counts toward leaderboard AGGREGATES
 * (per-model / per-platform averages). They never gate scanning itself —
 * anyone can always scan anything and receive full results + an attestation +
 * a badge. Below-floor scans are simply excluded from averages so a swarm of
 * trivial repos can't move a cohort's numbers.
 */
export type Provenance = "seed" | "self-reported" | "verified";

export const SYBIL_MIN_FILES = 5;
export const SYBIL_MIN_LINES = 200;

export interface SybilInputs {
  fileCount: number;
  lineCount: number;
}

export function meetsSybilFloor(input: SybilInputs): boolean {
  return (
    input.fileCount >= SYBIL_MIN_FILES && input.lineCount >= SYBIL_MIN_LINES
  );
}

/** Human-readable reason a scan is excluded from aggregates, or null if eligible. */
export function sybilExclusionReason(input: SybilInputs): string | null {
  if (input.fileCount < SYBIL_MIN_FILES) {
    return `Below aggregate floor: ${input.fileCount} files (min ${SYBIL_MIN_FILES}). Full results still available; excluded from model/platform averages.`;
  }
  if (input.lineCount < SYBIL_MIN_LINES) {
    return `Below aggregate floor: ${input.lineCount} lines (min ${SYBIL_MIN_LINES}). Full results still available; excluded from model/platform averages.`;
  }
  return null;
}

/**
 * Whether a scan is eligible to count toward a leaderboard aggregate.
 * Requires: verified provenance, above the Sybil floor, and a content hash
 * that has not already been counted (dedup handled by the caller via the
 * seenHashes set).
 */
export function isAggregateEligible(params: {
  provenance: Provenance;
  fileCount: number;
  lineCount: number;
  contentHash: string | null;
  seenHashes: Set<string>;
}): boolean {
  if (params.provenance !== "verified") return false;
  if (!meetsSybilFloor(params)) return false;
  if (!params.contentHash) return false;
  if (params.seenHashes.has(params.contentHash)) return false;
  return true;
}

/** Ingestion-time classification. CLI uploads are verified; everything else self-reported. */
export function classifyProvenance(source: string): Provenance {
  if (source === "cli-upload" || source === "dare") return "verified";
  if (source === "seed") return "seed";
  return "self-reported";
}
