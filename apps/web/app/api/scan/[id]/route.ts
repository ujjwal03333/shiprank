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

  const { data: scan, error: scanErr } = await db
    .from("scans")
    .select(`
      id, status, score, grade, station_count, check_count, issue_count,
      scan_mode, started_at, completed_at, created_at,
      projects ( id, name, framework, platform, url, metadata ),
      station_results ( station, score, grade, pass_count, warn_count, fail_count ),
      fingerprints ( platform, confidence, signals, metadata )
    `)
    .eq("id", id)
    .single();

  if (scanErr || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  return NextResponse.json(scan);
}
