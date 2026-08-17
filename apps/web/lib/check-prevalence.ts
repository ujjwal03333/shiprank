import type { SupabaseClient } from "@supabase/supabase-js";

export interface CheckPrevalence {
  failPct: number;
  sampleSize: number;
}

const MIN_SAMPLE_SIZE = 10;

/**
 * Queries the genome view for fail-frequency of specific checks across all
 * eligible scans. Returns only entries with enough data to be meaningful —
 * an empty map means "not enough data", not "zero failures".
 */
export async function fetchCheckPrevalence(
  db: SupabaseClient,
  checkIds: string[],
): Promise<Map<string, CheckPrevalence>> {
  if (checkIds.length === 0) return new Map();

  const { data, error } = await db
    .from("check_genome_rows")
    .select("check_id, passed")
    .in("check_id", checkIds);

  if (error || !data) return new Map();

  const counts = new Map<string, { total: number; failCount: number }>();
  for (const row of data as Array<{ check_id: string; passed: boolean }>) {
    const entry = counts.get(row.check_id) ?? { total: 0, failCount: 0 };
    entry.total++;
    if (!row.passed) entry.failCount++;
    counts.set(row.check_id, entry);
  }

  const result = new Map<string, CheckPrevalence>();
  for (const [checkId, { total, failCount }] of counts) {
    if (total >= MIN_SAMPLE_SIZE) {
      result.set(checkId, {
        failPct: Math.round((failCount / total) * 100),
        sampleSize: total,
      });
    }
  }
  return result;
}
