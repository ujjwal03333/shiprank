import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { fetchProjectScanPoints } from "@/lib/scan-history";
import { computeVelocity } from "@/lib/velocity";
import { resolvePlan } from "@/lib/subscription";
import { gateFindingsForPlan } from "@/lib/plan-gating";
import { fetchScanFindings } from "@/lib/scan-findings";

export async function GET(
  request: Request,
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
      station_results ( id, station, score, grade, pass_count, warn_count, fail_count ),
      fingerprints ( platform, confidence, signals, metadata )
    `)
    .eq("id", id)
    .single();

  if (scanErr || !scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Velocity: only surfaced when this project has >=2 completed scans.
  const project = scan.projects as { id?: string } | null;
  let velocity = null;
  if (project?.id) {
    const points = await fetchProjectScanPoints(db, project.id);
    velocity = computeVelocity(points).latest;
  }

  // Findings: public check_results for this scan, gated by the caller's
  // plan. Held-out results are excluded by fetchScanFindings, independent
  // of plan gating.
  const stationResultIds = (
    (scan.station_results as Array<{ id: string }> | null) ?? []
  ).map((s) => s.id);
  const rawFindings = await fetchScanFindings(db, stationResultIds);

  // Plan resolution failing shouldn't take down the whole scan result —
  // fall back to the most conservative (free-tier) gating so the response
  // still succeeds with fully-redacted findings.
  let resolvedPlan: Awaited<ReturnType<typeof resolvePlan>>["plan"] = "free";
  try {
    resolvedPlan = (await resolvePlan(db, request)).plan;
  } catch {
    /* keep the free-tier default */
  }
  const findings = gateFindingsForPlan(rawFindings, resolvedPlan);
  const upgradeRequired = findings.some((f) => f.upgradeRequired);

  return NextResponse.json({
    ...scan,
    velocity,
    plan: resolvedPlan,
    findings,
    upgrade_required: upgradeRequired,
  });
}
