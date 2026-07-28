import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { checkRateLimit, ipFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import { ingestUpload } from "@/lib/scan-ingester";

const UploadSchema = z.object({
  projectName: z.string().min(1).max(200),
  score: z.number().int().min(0).max(100),
  grade: z.string(),
  framework: z.string(),
  fileCount: z.number().int().min(0),
  lineCount: z.number().int().min(0),
  depCount: z.number().int().min(0),
  platform: z.string(),
  model: z.string().nullable(),
  aiRatio: z.number().min(0).max(1).nullable(),
  stationScores: z.record(z.string(), z.number().min(0).max(100)),
});

export async function POST(request: Request) {
  // Validate input first (cheap) before any external checks
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  const ip = ipFromRequest(request);
  const rl = await checkRateLimit(`scan:${ip}`, 5, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: rl.resetAt },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  try {
    const db = getServiceClient();
    const result = await ingestUpload(db, parsed.data);
    return NextResponse.json(
      { scanId: result.scanId, projectId: result.projectId, isNew: result.isNew },
      { status: result.isNew ? 201 : 200, headers: rateLimitHeaders(rl) },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingestion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
