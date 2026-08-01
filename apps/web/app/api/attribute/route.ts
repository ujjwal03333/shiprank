import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { checkRateLimit, ipFromRequest } from "@/lib/rate-limit";

const AttributeSchema = z.object({
  scanId: z.string().uuid(),
  platform: z.string().min(1).max(50),
  model: z.string().max(100).nullable().optional(),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const ip = ipFromRequest(request);
  const rl = await checkRateLimit(`attribute:${ip}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AttributeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const db = getServiceClient();
  const { scanId, platform, model } = parsed.data;

  // Verify scan exists
  const { data: scan } = await db.from("scans").select("id").eq("id", scanId).single();
  if (!scan) {
    return NextResponse.json({ error: "Scan not found" }, { status: 404 });
  }

  // Upsert fingerprint
  const { error } = await db
    .from("fingerprints")
    .upsert(
      {
        scan_id: scanId,
        platform,
        confidence: 1.0, // user-reported = full confidence
        signals: ["user-attributed"],
        metadata: { model: model ?? null, source: "user-attribution" },
      },
      { onConflict: "scan_id,platform" },
    );

  if (error) {
    console.error("Attribution upsert error:", error);
    return NextResponse.json({ error: "Attribution update failed." }, { status: 500 });
  }

  // Update project platform
  await db
    .from("projects")
    .update({ platform })
    .eq(
      "id",
      db.from("scans").select("project_id").eq("id", scanId),
    );

  return NextResponse.json({ ok: true, scanId, platform });
}
