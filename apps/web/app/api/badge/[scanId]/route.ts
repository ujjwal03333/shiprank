import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { renderBadgeSvg } from "@/lib/badge";

// The route file lives at /api/badge/[scanId] but READMEs reference
// /api/badge/<id>.svg — the ".svg" suffix is stripped here so both work.
function stripSvg(id: string): string {
  return id.endsWith(".svg") ? id.slice(0, -4) : id;
}

const FALLBACK_CACHE_SECONDS = 60;

function svgResponse(body: string, cacheSeconds: number, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheSeconds}`,
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  try {
    const { scanId: raw } = await params;
    const scanId = stripSvg(raw);

    if (!isSupabaseConfigured()) {
      // Keep READMEs clean: serve a grey "unknown" badge, cached briefly.
      return svgResponse(renderBadgeSvg({ score: null, grade: null }), FALLBACK_CACHE_SECONDS);
    }

    const db = getServiceClient();
    const { data: scan } = await db
      .from("scans")
      .select("score, grade")
      .eq("id", scanId)
      .maybeSingle();

    if (!scan || scan.score == null || scan.grade == null) {
      return svgResponse(renderBadgeSvg({ score: null, grade: null }), FALLBACK_CACHE_SECONDS, 404);
    }

    // 24h cache for a real, immutable scan result.
    return svgResponse(
      renderBadgeSvg({
        score: scan.score as number,
        grade: scan.grade as string,
      }),
      86400,
    );
  } catch {
    // A badge embedded in someone else's README must never break their
    // page — fall back to the same grey "unknown" badge used above.
    return svgResponse(renderBadgeSvg({ score: null, grade: null }), FALLBACK_CACHE_SECONDS, 500);
  }
}
