import { getServiceClient, isSupabaseConfigured } from "./supabase";

export interface HeroProofScan {
  scanId: string;
  projectName: string;
  score: number;
  grade: string;
  scannedAt: string;
}

export interface HeroStats {
  scanCount: number;
  proof: HeroProofScan | null;
}

const FALLBACK: HeroStats = { scanCount: 0, proof: null };

/**
 * The hero's proof-of-product widget shows a real scan, not a mock. We
 * feature ShipRank scanning its own engine package — genuinely real,
 * always available, and honest: no fabricated "known public app" result.
 */
export async function getHeroStats(): Promise<HeroStats> {
  if (!isSupabaseConfigured()) return FALLBACK;

  try {
    const db = getServiceClient();

    const [{ count }, { data: selfScan }] = await Promise.all([
      db.from("leaderboard_entries").select("scan_id", { count: "exact", head: true }),
      db
        .from("leaderboard_entries")
        .select("scan_id, project_name, score, grade, scanned_at")
        .eq("project_name", "@shiprank/engine")
        .order("scanned_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      scanCount: count ?? 0,
      proof: selfScan
        ? {
            scanId: selfScan["scan_id"] as string,
            projectName: selfScan["project_name"] as string,
            score: selfScan["score"] as number,
            grade: selfScan["grade"] as string,
            scannedAt: selfScan["scanned_at"] as string,
          }
        : null,
    };
  } catch (err) {
    console.error("Hero stats fetch failed:", err);
    return FALLBACK;
  }
}
