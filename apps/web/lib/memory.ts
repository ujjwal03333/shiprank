import type { SupabaseClient } from "@supabase/supabase-js";
import { memoryConstraintLines, type MemoryFailRow } from "@shiprank/engine";
import { getServiceClient, isSupabaseConfigured } from "./supabase";

const MEMORY_LIMIT = 5;

/**
 * Highest-frequency public Board failures → Compile extras.
 * Service role, server-side only. Never throws — empty/unreadable → [].
 */
export async function loadMemoryConstraints(
  db?: SupabaseClient,
): Promise<string[]> {
  try {
    const client = db ?? (isSupabaseConfigured() ? getServiceClient() : null);
    if (!client) return [];

    const { data, error } = await client
      .from("check_results")
      .select(
        "check_id, title, fix_suggestion, station_results!inner(scans!inner(status, provenance))",
      )
      .eq("passed", false)
      .eq("visibility", "public")
      .eq("station_results.scans.status", "completed")
      .neq("station_results.scans.provenance", "seed");

    if (error || !data) return [];

    const rows: MemoryFailRow[] = (
      data as Array<{
        check_id: string;
        title: string | null;
        fix_suggestion: string | null;
      }>
    ).map((r) => ({
      checkId: r.check_id,
      title: r.title ?? "",
      fixSuggestion: r.fix_suggestion,
    }));

    return memoryConstraintLines(rows, MEMORY_LIMIT);
  } catch {
    return [];
  }
}
