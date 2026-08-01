import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";

const CACHE_TTL_SECONDS = 60;

async function fetchLeaderboard(db: Awaited<ReturnType<typeof getServiceClient>>) {
  const { data: entries, error } = await db
    .from("leaderboard_entries")
    .select("scan_id, project_name, platform, framework, score, grade, url, station_scores, scanned_at")
    .order("score", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  // Platform aggregate: avg score per platform
  const byPlatform: Record<string, { total: number; count: number }> = {};
  const byFramework: Record<string, { total: number; count: number }> = {};

  for (const e of entries ?? []) {
    const score = e.score as number;
    const plat = (e.platform as string | null) ?? "unknown";
    byPlatform[plat] ??= { total: 0, count: 0 };
    byPlatform[plat]!.total += score;
    byPlatform[plat]!.count++;

    const fw = (e.framework as string | null) ?? "unknown";
    byFramework[fw] ??= { total: 0, count: 0 };
    byFramework[fw]!.total += score;
    byFramework[fw]!.count++;
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

  return { entries, platformLeaderboard, frameworkLeaderboard };
}

async function getCachedLeaderboard() {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  const CACHE_KEY = "leaderboard:v1";

  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });

    let cached: string | null = null;
    try {
      cached = await redis.get<string>(CACHE_KEY);
    } catch (err) {
      console.error("Leaderboard cache read failed, falling back to DB:", err);
    }
    if (cached) return { data: JSON.parse(cached) as Record<string, unknown>, fromCache: true };

    const db = getServiceClient();
    const data = await fetchLeaderboard(db);
    try {
      await redis.setex(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(data));
    } catch (err) {
      console.error("Leaderboard cache write failed, serving uncached:", err);
    }
    return { data, fromCache: false };
  }

  const db = getServiceClient();
  const data = await fetchLeaderboard(db);
  return { data, fromCache: false };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { data, fromCache } = await getCachedLeaderboard();
    return NextResponse.json(data, {
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
