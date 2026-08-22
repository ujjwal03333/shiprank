import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { cardImageResponse } from "@/lib/card-image";
import { formatPlatformName } from "@/lib/format-names";
import type { CardExportSize } from "@/lib/night-court";

export const runtime = "nodejs";

const SIZES = new Set<CardExportSize>(["og", "landscape", "story"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const raw = url.searchParams.get("size") ?? "og";
  const size: CardExportSize = SIZES.has(raw as CardExportSize)
    ? (raw as CardExportSize)
    : "og";

  let projectName = "Untitled";
  let score = 0;
  let grade = "F";
  let platform: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const db = getServiceClient();
      const { data } = await db
        .from("scans")
        .select("score, grade, provenance, projects ( name, platform, framework )")
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
    size,
  });
}
