import type { ScanResult } from "./scanner.js";

const DEFAULT_API_URL = "https://shiprank.dev/api/scan";

export interface CheckResultPayload {
  checkId: string;
  station: string;
  title: string;
  severity: string;
  passed: boolean;
  visibility: "public" | "heldout";
}

export interface UploadPayload {
  projectName: string;
  contentHash: string;
  checkVersion: string;
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
  checkResults: CheckResultPayload[];
}

export function buildUploadPayload(result: ScanResult): UploadPayload {
  const stationScores: Record<string, number> = {};
  for (const s of result.stations) {
    if (s.implemented === 0) continue;
    stationScores[s.station] = s.score;
  }

  const checkResults: CheckResultPayload[] = [];
  for (const s of result.stations) {
    for (const c of s.checks) {
      if (c.confidence <= 0) continue; // skip stubs
      checkResults.push({
        checkId: c.id,
        station: s.station,
        title: c.title,
        severity: c.severity,
        passed: c.passed,
        visibility: c.visibility ?? "public",
      });
    }
  }
  for (const c of result.heldout) {
    checkResults.push({
      checkId: c.id,
      station: c.station,
      title: c.title,
      severity: c.severity,
      passed: c.passed,
      visibility: "heldout",
    });
  }

  return {
    projectName: result.projectName,
    contentHash: result.contentHash,
    checkVersion: result.checkSuiteVersion,
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
    checkResults,
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
