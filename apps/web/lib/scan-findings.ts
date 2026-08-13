import type { SupabaseClient } from "@supabase/supabase-js";
import type { FindingRow } from "./plan-gating";

/**
 * Public (visibility='public') check_results for a scan, given its
 * station_result ids. Shared by /api/scan/[id] and the scan detail page so
 * there's exactly one query + row-shape for "findings", used by both the
 * API and the server-rendered UI.
 */
export async function fetchScanFindings(
  db: SupabaseClient,
  stationResultIds: string[],
): Promise<FindingRow[]> {
  if (stationResultIds.length === 0) return [];

  const { data: checkRows, error } = await db
    .from("check_results")
    .select(
      "id, check_id, title, severity, passed, file_path, line_number, snippet, fix_suggestion, docs_url, visibility",
    )
    .in("station_result_id", stationResultIds)
    .eq("visibility", "public");

  // On error (e.g. migration 00005's visibility column not applied yet),
  // findings simply stay empty — this read path degrades gracefully.
  if (error || !checkRows) return [];

  return (
    checkRows as Array<{
      id: string;
      check_id: string;
      title: string;
      severity: string;
      passed: boolean;
      file_path: string | null;
      line_number: number | null;
      snippet: string | null;
      fix_suggestion: string | null;
      docs_url: string | null;
    }>
  ).map((r) => ({
    id: r.id,
    checkId: r.check_id,
    title: r.title,
    severity: r.severity,
    passed: r.passed,
    filePath: r.file_path,
    lineNumber: r.line_number,
    snippet: r.snippet,
    fixSuggestion: r.fix_suggestion,
    docsUrl: r.docs_url,
  }));
}
