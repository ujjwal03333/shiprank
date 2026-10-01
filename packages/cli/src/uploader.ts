import type { ScanResult } from "./scanner.js";

/** Host we control. shiprank.dev is a different product. */
export const DEFAULT_API_URL = "https://shiprank-web-cqm7.vercel.app/api/scan";

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

export interface UploadOk {
  scanId: string;
}

const UPLOAD_TIMEOUT_MS = 20_000;

export function cardUrlFromScanId(
  scanId: string,
  apiUrl: string = process.env["SHIPRANK_API_URL"] ?? DEFAULT_API_URL,
): string {
  const origin = apiUrl.replace(/\/api\/scan\/?$/, "");
  return `${origin}/s/${encodeURIComponent(scanId)}`;
}

/** One-line reason for a failed Check when the hosted API is unreachable. */
export function describeUploadFailure(err: unknown, apiUrl: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    /aborted|timeout/i.test(raw)
  ) {
    return `Cannot reach the ShipRank API at ${apiUrl}: the request timed out. The Ship License Check did not get a Card.`;
  }
  if (
    err instanceof TypeError ||
    /fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|network/i.test(raw)
  ) {
    return `Cannot reach the ShipRank API at ${apiUrl}: ${raw}. The Ship License Check did not get a Card.`;
  }
  if (/did not get a Card|did not return a scan id/i.test(raw)) {
    return raw;
  }
  return `ShipRank API upload failed (${apiUrl}): ${raw}. The Ship License Check did not get a Card.`;
}

export async function uploadResult(
  result: ScanResult,
  apiUrl: string = process.env["SHIPRANK_API_URL"] ?? DEFAULT_API_URL,
): Promise<UploadOk> {
  const payload = buildUploadPayload(result);
  let resp: Response;
  try {
    resp = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(describeUploadFailure(err, apiUrl));
  }

  if (!resp.ok) {
    let detail = `${resp.status} ${resp.statusText}`.trim();
    try {
      const body: unknown = await resp.json();
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
      ) {
        detail += `: ${(body as { error: string }).error}`;
      }
    } catch {
      // body is not JSON — status is enough
    }
    throw new Error(
      `ShipRank API returned ${detail}. The Ship License Check did not get a Card.`,
    );
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    throw new Error(
      `ShipRank API at ${apiUrl} returned a non-JSON response (${resp.status}). The Ship License Check did not get a Card.`,
    );
  }

  const scanId =
    data && typeof data === "object" && "scanId" in data
      ? (data as { scanId: unknown }).scanId
      : undefined;
  if (typeof scanId !== "string" || scanId.length === 0) {
    throw new Error(
      `ShipRank API at ${apiUrl} did not return a scan id (${resp.status}). The Ship License Check did not get a Card.`,
    );
  }

  return { scanId };
}
