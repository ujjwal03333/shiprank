import { getServiceClient, isSupabaseConfigured } from "./supabase";

export interface LiveCard {
  scanId: string;
  projectName: string;
  score: number;
  grade: string;
  platform: string | null;
}

/**
 * Latest public Cards on the board. Real rows only — never fabricated.
 */
export async function getLiveCards(limit = 3): Promise<LiveCard[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const db = getServiceClient();
    const { data, error } = await db
      .from("leaderboard_entries")
      .select("scan_id, project_name, score, grade, platform, scanned_at, provenance")
      .not("scan_id", "is", null)
      .neq("provenance", "seed")
      .order("scanned_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data
      .filter((row) => typeof row["scan_id"] === "string")
      .map((row) => ({
        scanId: row["scan_id"] as string,
        projectName: (row["project_name"] as string) ?? "Untitled",
        score: (row["score"] as number) ?? 0,
        grade: (row["grade"] as string) ?? "F",
        platform: (row["platform"] as string | null) ?? null,
      }));
  } catch {
    return [];
  }
}
