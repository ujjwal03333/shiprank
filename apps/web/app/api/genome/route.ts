import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { buildGenomeMatrix, type GenomeRow } from "@/lib/genome";

/**
 * GET /api/genome
 *
 * Fail-frequency per check_id, grouped by platform and by model, over the
 * eligible scan population (verified provenance, above the Sybil floor,
 * deduped by content_hash — see migration 00006_genome.sql). No UI reads
 * this yet; it's the data substrate for future model-signature inference.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from("check_genome_rows")
    .select("check_id, passed, scan_id, platform, model");

  if (error) {
    return NextResponse.json(
      { error: "Genome data temporarily unavailable." },
      { status: 500 },
    );
  }

  const rows: GenomeRow[] = ((data ?? []) as Array<{
    check_id: string;
    passed: boolean;
    scan_id: string;
    platform: string;
    model: string;
  }>).map((r) => ({
    checkId: r.check_id,
    passed: r.passed,
    scanId: r.scan_id,
    platform: r.platform,
    model: r.model,
  }));

  const matrix = buildGenomeMatrix(rows);

  return NextResponse.json(matrix, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
