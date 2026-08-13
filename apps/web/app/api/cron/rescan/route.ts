import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { rescanMonitoredProject } from "@/lib/rescan";

/**
 * GET /api/cron/rescan — polled by Vercel Cron (see vercel.json) or a
 * manual trigger. Re-scans every monitored project whose next_scan_at has
 * passed. Each project is isolated in its own try/catch so one bad repo
 * doesn't block the rest of the run.
 *
 * If CRON_SECRET is set, requests must carry it as a Bearer token — Vercel
 * Cron sends this automatically when the env var is configured.
 */
export async function GET(request: Request) {
  const cronSecret = process.env["CRON_SECRET"];
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = getServiceClient();
  const now = new Date().toISOString();

  const { data: due, error } = await db
    .from("monitored_projects")
    .select("id, project_id, repo_url, scan_frequency, last_scanned_at, next_scan_at, subscriptions ( user_email )")
    .lte("next_scan_at", now);

  if (error) {
    return NextResponse.json({ error: "Failed to load monitored projects" }, { status: 500 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const row of (due ?? []) as unknown as Array<{
    id: string;
    project_id: string | null;
    repo_url: string;
    scan_frequency: string;
    last_scanned_at: string | null;
    next_scan_at: string;
    subscriptions: { user_email: string } | null;
  }>) {
    try {
      await rescanMonitoredProject(db, {
        id: row.id,
        repoUrl: row.repo_url,
        scanFrequency: row.scan_frequency,
        lastScannedAt: row.last_scanned_at,
        nextScanAt: row.next_scan_at,
        projectId: row.project_id,
        subscriptionEmail: row.subscriptions?.user_email ?? null,
      });
      results.push({ id: row.id, ok: true });
    } catch (err) {
      console.error(`Rescan failed for monitored project ${row.id}:`, err);
      results.push({ id: row.id, ok: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ scanned: results.length, results });
}
