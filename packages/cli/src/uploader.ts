import type { ScanResult } from "./scanner.js";

const DEFAULT_API_URL = "https://shiprank.dev/api/scan";

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

export function buildUploadPayload(result: ScanResult): UploadPayload {
  const stationScores: Record<string, number> = {};
  for (const s of result.stations) {
    stationScores[s.station] = s.score;
  }
  return {
    projectName: result.projectName,
    score: result.score,
    grade: result.grade,
    framework: result.framework,
    fileCount: result.fileCount,
    lineCount: result.lineCount,
    depCount: result.depCount,
    platform: result.fingerprint.platform.platform,
    model: result.fingerprint.model.model,
    aiRatio: result.fingerprint.aiRatio?.aiRatio ?? null,
    stationScores,
  };
}

export async function uploadResult(
  result: ScanResult,
  apiUrl: string = process.env["SHIPRANK_API_URL"] ?? DEFAULT_API_URL,
): Promise<void> {
  const payload = buildUploadPayload(result);
  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error(`Upload failed: ${resp.status} ${resp.statusText}`);
  }
}
