import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { cardImageResponse } from "@/lib/card-image";
import { formatPlatformName } from "@/lib/format-names";
import { lanesFromMetadata, type CardLanes } from "@/lib/card-lanes";

export const alt = "ShipRank card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let projectName = "Untitled";
  let score = 0;
  let grade = "F";
  let platform: string | null = null;
  let lanes: CardLanes | null = null;

  if (isSupabaseConfigured()) {
    try {
      const db = getServiceClient();
      const { data } = await db
        .from("scans")
        .select("score, grade, provenance, metadata, projects ( name, platform, framework )")
        .eq("id", id)
        .single();
      if (data && data["provenance"] !== "seed") {
        score = (data["score"] as number) ?? 0;
        grade = (data["grade"] as string) ?? "F";
        const proj = data["projects"] as {
          name?: string;
          platform?: string | null;
          framework?: string | null;
        } | null;
        projectName = proj?.name ?? "Untitled";
        platform = proj?.platform
          ? formatPlatformName(proj.platform)
          : proj?.framework ?? null;
        lanes = lanesFromMetadata(data["metadata"]);
      }
    } catch {
      /* default card */
    }
  }

  return cardImageResponse({
    score,
    grade,
    projectName,
    platform,
    lanes,
    size: "og",
  });
}
