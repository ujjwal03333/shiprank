import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  aggregateLeaderboard,
  type LeaderboardRow,
} from "@/lib/leaderboard-agg";
import { publicBoardEntries, type Provenance } from "@/lib/provenance";

const CACHE_TTL_SECONDS = 60;

const BASE_COLS =
  "scan_id, project_name, platform, framework, score, grade, url, station_scores, scanned_at";
const SYBIL_COLS = ", provenance, content_hash, file_count, line_count";

async function fetchRows(
  db: Awaited<ReturnType<typeof getServiceClient>>,
): Promise<LeaderboardRow[]> {
  // Prefer the enriched select (post migration 00004). If those columns don't
  // exist yet, fall back to base columns and treat every row as an eligible
  // verified row — this preserves the exact pre-migration leaderboard behavior
  // so the site keeps working before the provenance migration is applied.
  const enriched = await db
    .from("leaderboard_entries")
    .select(BASE_COLS + SYBIL_COLS)
    .order("score", { ascending: false })
    .limit(100);

  if (!enriched.error) {
    return ((enriched.data ?? []) as unknown as Record<string, unknown>[]).map((e) => ({
      scanId: e.scan_id as string,
      projectName: e.project_name as string,
      platform: (e.platform as string | null) ?? null,
      framework: (e.framework as string | null) ?? null,
      score: e.score as number,
      grade: e.grade as string,
      url: (e.url as string | null) ?? null,
      stationScores: (e.station_scores as Record<string, number>) ?? {},
      scannedAt: e.scanned_at as string,
      provenance: ((e.provenance as string | null) ?? "self-reported") as Provenance,
      contentHash: (e.content_hash as string | null) ?? null,
      fileCount: (e.file_count as number | null) ?? 0,
      lineCount: (e.line_count as number | null) ?? 0,
    }));
  }

  const base = await db
    .from("leaderboard_entries")
    .select(BASE_COLS)
    .order("score", { ascending: false })
    .limit(100);
  if (base.error) throw new Error(base.error.message);

  return ((base.data ?? []) as Record<string, unknown>[]).map((e) => ({
    scanId: e.scan_id as string,
    projectName: e.project_name as string,
    platform: (e.platform as string | null) ?? null,
    framework: (e.framework as string | null) ?? null,
    score: e.score as number,
    grade: e.grade as string,
    url: (e.url as string | null) ?? null,
    stationScores: (e.station_scores as Record<string, number>) ?? {},
    scannedAt: e.scanned_at as string,
    // Pre-migration fallback: count every row (unique hash avoids dedup collapse).
    provenance: "verified" as Provenance,
    contentHash: e.scan_id as string,
    fileCount: 999,
    lineCount: 99999,
  }));
}

async function getRows(): Promise<{ rows: LeaderboardRow[]; fromCache: boolean }> {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  const CACHE_KEY = "leaderboard:rows:v2";

  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    let cached: string | null = null;
    try {
      cached = await redis.get<string>(CACHE_KEY);
    } catch (err) {
      console.error("Leaderboard cache read failed, falling back to DB:", err);
    }
    if (cached) return { rows: JSON.parse(cached) as LeaderboardRow[], fromCache: true };

    const rows = await fetchRows(getServiceClient());
    try {
      await redis.setex(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(rows));
    } catch (err) {
      console.error("Leaderboard cache write failed, serving uncached:", err);
    }
    return { rows, fromCache: false };
  }

  return { rows: await fetchRows(getServiceClient()), fromCache: false };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const provenanceParam = new URL(request.url).searchParams.get("provenance");
  const provenanceFilter =
    provenanceParam === "verified" ||
    provenanceParam === "seed" ||
    provenanceParam === "self-reported"
      ? (provenanceParam as Provenance)
      : undefined;

  try {
    const { rows, fromCache } = await getRows();
    const result = aggregateLeaderboard(rows, { provenanceFilter });
    if (!provenanceFilter) {
      result.entries = publicBoardEntries(result.entries);
    }
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=30`,
        "X-Cache": fromCache ? "HIT" : "MISS",
      },
    });
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    return NextResponse.json(
      { error: "Leaderboard temporarily unavailable." },
      { status: 500 },
    );
  }
}
