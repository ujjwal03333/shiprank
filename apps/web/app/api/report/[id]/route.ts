import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const db = getServiceClient();

  // Public report: scan + stations + top remediations. No check-level evidence.
  const { data: scan, error } = await db
    .from("scans")
    .select(`
      id, score, grade, scan_mode, completed_at,
      projects ( name, framework, platform, url ),
      station_results ( station, score, grade ),
      fingerprints ( platform, confidence )
    `)
    .eq("id", id)
    .eq("status", "completed")
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(scan, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
