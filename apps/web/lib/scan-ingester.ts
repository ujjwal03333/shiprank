import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreToGrade } from "@shiprank/database";

// Mirrors uploader.ts in @shiprank/cli — validated by Zod in /api/scan/route.ts
export interface UploadPayload {
  projectName: string;
  score: number;
  grade: string;
  framework: string;
  fileCount: number;
  lineCount: number;
  depCount: number;
  platform: string;
  model: string | null;
  aiRatio: number | null;
  stationScores: Record<string, number>;
}

// Engine Station → DB station_name enum
const STATION_MAP: Record<string, string> = {
  security: "security",
  accessibility: "accessibility",
  performance: "performance",
  growth: "growth",
  quality: "code_quality",
  architecture: "architecture",
  data: "data",
  compliance: "compliance",
  infrastructure: "infra",
};

function toDbStation(engineStation: string): string {
  return STATION_MAP[engineStation] ?? engineStation;
}

function toDbGrade(score: number): string {
  return scoreToGrade(score);
}

export interface IngestResult {
  scanId: string;
  projectId: string;
  isNew: boolean;
}

export async function ingestUpload(
  db: SupabaseClient,
  payload: UploadPayload,
): Promise<IngestResult> {
  const startedAt = new Date().toISOString();

  // ── 1. Idempotency: check for a recent scan of this project ──────────────
  const { data: recent } = await db
    .from("leaderboard_entries")
    .select("scan_id, project_id")
    .eq("project_name", payload.projectName)
    .gte("scanned_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .maybeSingle();

  if (recent) {
    return { scanId: recent.scan_id as string, projectId: recent.project_id as string, isNew: false };
  }

  // ── 2. Upsert project ─────────────────────────────────────────────────────
  const { data: project, error: projectErr } = await db
    .from("projects")
    .upsert(
      {
        name: payload.projectName,
        framework: payload.framework,
        platform: payload.platform === "unknown" ? null : payload.platform,
        metadata: {
          fileCount: payload.fileCount,
          lineCount: payload.lineCount,
          depCount: payload.depCount,
          model: payload.model,
          aiRatio: payload.aiRatio,
          source: "cli-upload",
        },
      },
      { onConflict: "name", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (projectErr || !project) {
    throw new Error(`Failed to upsert project: ${projectErr?.message}`);
  }
  const projectId = project.id as string;

  // ── 3. Create scan record (status: running) ───────────────────────────────
  const stationCount = Object.keys(payload.stationScores).length;
  const { data: scan, error: scanErr } = await db
    .from("scans")
    .insert({
      project_id: projectId,
      status: "running",
      station_count: stationCount,
      scan_mode: "cli-upload",
      started_at: startedAt,
      metadata: { source: "cli-upload", version: "1.0.0" },
    })
    .select("id")
    .single();

  if (scanErr || !scan) {
    throw new Error(`Failed to create scan: ${scanErr?.message}`);
  }
  const scanId = scan.id as string;

  // ── 4. Insert station results ─────────────────────────────────────────────
  const stationRows = Object.entries(payload.stationScores).map(([station, score]) => ({
    scan_id: scanId,
    station: toDbStation(station),
    score,
    grade: toDbGrade(score),
  }));

  if (stationRows.length > 0) {
    const { error: stErr } = await db.from("station_results").insert(stationRows);
    if (stErr) throw new Error(`Failed to insert station results: ${stErr.message}`);
  }

  // ── 5. Insert fingerprint ─────────────────────────────────────────────────
  if (payload.platform !== "unknown") {
    await db.from("fingerprints").insert({
      scan_id: scanId,
      platform: payload.platform,
      // confidence stored as 0-1 real; CLI upload doesn't carry it so use 0.8
      confidence: 0.8,
      signals: [],
      metadata: { model: payload.model, aiRatio: payload.aiRatio },
    });
  }

  // ── 6. Complete scan → triggers leaderboard upsert ───────────────────────
  const completedAt = new Date().toISOString();
  const { error: completeErr } = await db
    .from("scans")
    .update({
      status: "completed",
      score: payload.score,
      grade: toDbGrade(payload.score),
      completed_at: completedAt,
    })
    .eq("id", scanId);

  if (completeErr) throw new Error(`Failed to complete scan: ${completeErr.message}`);

  return { scanId, projectId, isNew: true };
}
