import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolvePlan } from "@/lib/subscription";
import { computeNextScanAt } from "@/lib/monitoring";

const BodySchema = z.object({
  repoUrl: z.string().url(),
  projectId: z.string().uuid().optional(),
  scanFrequency: z.enum(["daily", "weekly"]).default("weekly"),
});

/** POST /api/monitor — "Enable monitoring" toggle. Monitor tier only. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = getServiceClient();
  const resolved = await resolvePlan(db, request);

  if (resolved.plan !== "monitor" || !resolved.subscriptionId) {
    return NextResponse.json(
      {
        error: "Monitor plan required",
        message: "Continuous re-scanning is a Monitor-tier feature.",
        upgrade_required: true,
      },
      { status: 403 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = new Date();
  const { data, error } = await db
    .from("monitored_projects")
    .insert({
      subscription_id: resolved.subscriptionId,
      project_id: parsed.data.projectId ?? null,
      repo_url: parsed.data.repoUrl,
      scan_frequency: parsed.data.scanFrequency,
      next_scan_at: computeNextScanAt(parsed.data.scanFrequency, now),
    })
    .select("id, next_scan_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to enable monitoring" }, { status: 500 });
  }

  return NextResponse.json({ id: data["id"], next_scan_at: data["next_scan_at"] });
}
