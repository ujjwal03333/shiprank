import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scanProject, buildUploadPayload } from "shiprank";
import { ingestUpload } from "./scan-ingester";
import {
  computeNextScanAt,
  detectRegression,
  newFindingTitles,
  type MonitoredProjectRow,
} from "./monitoring";
import { renderRegressionEmail } from "./regression-email";
import { getResendClient, isResendConfigured, ALERT_FROM_ADDRESS } from "./resend";

const execFileAsync = promisify(execFile);

export interface RescanOutcome {
  monitoredProjectId: string;
  scanId: string;
  score: number;
  regression: ReturnType<typeof detectRegression>;
  emailSent: boolean;
}

async function cloneRepo(repoUrl: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "shiprank-monitor-"));
  await execFileAsync("git", ["clone", "--depth", "1", repoUrl, dir]);
  return dir;
}

async function fetchPreviousState(
  db: SupabaseClient,
  projectId: string | null,
): Promise<{ score: number | null; criticalTitles: string[] }> {
  if (!projectId) return { score: null, criticalTitles: [] };

  const { data: lastScan } = await db
    .from("scans")
    .select("id, score")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastScan) return { score: null, criticalTitles: [] };

  const { data: stationResults } = await db
    .from("station_results")
    .select("id")
    .eq("scan_id", lastScan["id"] as string);

  const stationResultIds = (stationResults ?? []).map(
    (s: { id: string }) => s.id,
  );
  if (stationResultIds.length === 0) {
    return { score: lastScan["score"] as number, criticalTitles: [] };
  }

  const { data: criticalChecks } = await db
    .from("check_results")
    .select("title")
    .in("station_result_id", stationResultIds)
    .eq("severity", "critical")
    .eq("passed", false);

  return {
    score: lastScan["score"] as number,
    criticalTitles: (criticalChecks ?? []).map((c: { title: string }) => c.title),
  };
}

/**
 * Full re-scan of one monitored project: clone → scan (reusing the CLI's
 * scanProject/buildUploadPayload — no duplicated scan logic) → ingest
 * (reusing scan-ingester's ingestUpload) → compare to the previous scan →
 * email on regression → advance the schedule.
 */
export async function rescanMonitoredProject(
  db: SupabaseClient,
  monitored: MonitoredProjectRow & { projectId: string | null; subscriptionEmail: string | null },
): Promise<RescanOutcome> {
  const tmpDir = await cloneRepo(monitored.repoUrl);

  try {
    const previous = await fetchPreviousState(db, monitored.projectId);

    const result = await scanProject(tmpDir);
    const payload = buildUploadPayload(result);
    const { scanId, projectId } = await ingestUpload(db, payload);

    const newCriticalTitles = result.stations
      .flatMap((s) => s.checks)
      .filter((c) => c.severity === "critical" && !c.passed)
      .map((c) => c.title);

    const regression =
      previous.score != null
        ? detectRegression({
            previousScore: previous.score,
            newScore: result.score,
            newCriticalFindings: newFindingTitles(previous.criticalTitles, newCriticalTitles),
          })
        : { isRegression: false, scoreDelta: 0, reasons: [] };

    let emailSent = false;
    if (regression.isRegression && monitored.subscriptionEmail && isResendConfigured()) {
      const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://shiprank-web-cqm7.vercel.app";
      const email = renderRegressionEmail({
        projectName: result.projectName,
        previousScore: previous.score ?? result.score,
        newScore: result.score,
        newFindings: regression.reasons,
        scanUrl: `${appUrl}/scan/${scanId}`,
      });
      const resend = getResendClient();
      await resend.emails.send({
        from: ALERT_FROM_ADDRESS,
        to: monitored.subscriptionEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      emailSent = true;
    }

    const now = new Date();
    await db
      .from("monitored_projects")
      .update({
        project_id: projectId,
        last_scanned_at: now.toISOString(),
        next_scan_at: computeNextScanAt(monitored.scanFrequency, now),
      })
      .eq("id", monitored.id);

    return { monitoredProjectId: monitored.id, scanId, score: result.score, regression, emailSent };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}
