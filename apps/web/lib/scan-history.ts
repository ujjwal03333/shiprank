import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScanPoint } from "./velocity";

export interface ScanHistoryRow {
  scanId: string;
  score: number;
  grade: string;
  stationScores: Record<string, number>;
  scannedAt: string;
  issueCount: number | null;
}

/**
 * All completed scans for a project, oldest first, with per-station scores
 * and fingerprint AI-commit counts attached. Shared by /api/scan/[id]
 * (velocity) and /project/[id]/history (trend chart).
 */
export async function fetchProjectScanHistory(
  db: SupabaseClient,
  projectId: string,
): Promise<ScanHistoryRow[]> {
  const { data, error } = await db
    .from("scans")
    .select(
      "id, score, grade, completed_at, created_at, issue_count, station_results ( station, score )",
    )
    .eq("project_id", projectId)
    .eq("status", "completed")
    .not("score", "is", null)
    .order("completed_at", { ascending: true });

  if (error || !data) return [];

  return (data as unknown as Array<{
    id: string;
    score: number;
    grade: string;
    completed_at: string | null;
    created_at: string;
    issue_count: number | null;
    station_results: Array<{ station: string; score: number }> | null;
  }>).map((row) => ({
    scanId: row.id,
    score: row.score,
    grade: row.grade,
    scannedAt: row.completed_at ?? row.created_at,
    issueCount: row.issue_count,
    stationScores: Object.fromEntries(
      (row.station_results ?? []).map((s) => [s.station, s.score]),
    ),
  }));
}

/** Attaches AI-commit counts (from fingerprints) so velocity can derive new-findings-per-AI-commit. */
export async function fetchProjectScanPoints(
  db: SupabaseClient,
  projectId: string,
): Promise<ScanPoint[]> {
  const history = await fetchProjectScanHistory(db, projectId);
  if (history.length === 0) return [];

  const { data: fingerprints } = await db
    .from("fingerprints")
    .select("scan_id, metadata")
    .in(
      "scan_id",
      history.map((h) => h.scanId),
    );

  const aiCommitsByScan = new Map<string, number | null>();
  for (const f of (fingerprints ?? []) as Array<{
    scan_id: string;
    metadata: Record<string, unknown> | null;
  }>) {
    const aiRatio = f.metadata?.["aiRatio"] as
      | { likelyAiCommits?: number }
      | undefined;
    aiCommitsByScan.set(f.scan_id, aiRatio?.likelyAiCommits ?? null);
  }

  return history.map((h) => ({
    scanId: h.scanId,
    score: h.score,
    stationScores: h.stationScores,
    scannedAt: h.scannedAt,
    newFindingsCount: h.issueCount,
    aiCommitCount: aiCommitsByScan.get(h.scanId) ?? null,
  }));
}
