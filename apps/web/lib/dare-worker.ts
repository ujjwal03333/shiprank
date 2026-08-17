import { mkdir, mkdtemp, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { x as tarExtract } from "tar";
import {
  buildCodeProfile,
  runChecks,
  overallScore,
  runHeldoutChecks,
  buildFingerprint,
  computeContentHash,
} from "@shiprank/engine";
import { scoreToGrade } from "@shiprank/database";
import { ingestUpload } from "./scan-ingester";
import { claimDareJob, updateDareJob } from "./dare-store";
import { getServiceClient, isSupabaseConfigured } from "./supabase";
import {
  DARE_MAX_FILES,
  DARE_MAX_SIZE_KB,
  DARE_TIMEOUT_MS,
  fetchGithubRepoMeta,
  parseGithubRepoUrl,
} from "./github-repo";

export type DareJobStatus = "queued" | "cloning" | "scanning" | "complete" | "failed";

export interface DareProgress {
  fileCount?: number;
  framework?: string;
  findingCount?: number;
  projectName?: string;
  score?: number;
  grade?: string;
}

async function countFiles(dir: string, depth = 0): Promise<number> {
  if (depth > 8) return 0;
  let count = 0;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    if (entry.isDirectory()) count += await countFiles(join(dir, entry.name), depth + 1);
    else count += 1;
  }
  return count;
}

async function downloadAndExtract(
  owner: string,
  repo: string,
  branch: string,
  dest: string,
  signal: AbortSignal,
): Promise<void> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(branch)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "shiprank-dare" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Could not download repository archive (${res.status}).`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const archive = join(dest, "repo.tar.gz");
  const extractDir = join(dest, "src");
  await writeFile(archive, buf);
  await mkdir(extractDir, { recursive: true });
  // Pure JS extract — Vercel serverless has no `tar` binary (spawn ENOENT).
  await tarExtract({
    file: archive,
    cwd: extractDir,
    strip: 1,
  });
}

/**
 * Runs a Dare job. Never executes cloned application code — the engine only
 * reads files. Caller should have already created the row as `queued`.
 */
export async function processDareJob(jobId: string): Promise<void> {
  const claimed = await claimDareJob(jobId);
  if (!claimed) return;

  const parsed = parseGithubRepoUrl(claimed.repo_url);
  if (!parsed) {
    await updateDareJob(jobId, {
      status: "failed",
      error_message: "Invalid GitHub URL.",
      completed_at: new Date().toISOString(),
    });
    return;
  }

  const workRoot = await mkdtemp(join(tmpdir(), "shiprank-dare-"));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DARE_TIMEOUT_MS);

  try {
    const meta = await fetchGithubRepoMeta(parsed.owner, parsed.repo, controller.signal);
    if (!meta.ok) {
      throw new Error(
        meta.status === 404
          ? "Repository not found or private."
          : `GitHub returned ${meta.status}.`,
      );
    }
    if (meta.meta.private) {
      throw new Error("Private repositories cannot be dared.");
    }
    if (meta.meta.sizeKb > DARE_MAX_SIZE_KB) {
      throw new Error(
        `Repository is too large (${Math.round(meta.meta.sizeKb / 1024)} MB). Cap is 50 MB.`,
      );
    }

    await downloadAndExtract(
      parsed.owner,
      parsed.repo,
      meta.meta.defaultBranch,
      workRoot,
      controller.signal,
    );

    const src = join(workRoot, "src");
    const fileCount = await countFiles(src);
    if (fileCount > DARE_MAX_FILES) {
      throw new Error(
        `Repository has ${fileCount} files. Cap is ${DARE_MAX_FILES} so we stay inside the scan window.`,
      );
    }

    await updateDareJob(jobId, {
      status: "scanning",
      progress_stage: "Profiling codebase...",
      progress: { fileCount, projectName: parsed.repo },
    });

    if (controller.signal.aborted) throw new Error("Timed out after 120 seconds.");

    await updateDareJob(jobId, { progress_stage: "Running checks..." });
    const profile = await buildCodeProfile(src);
    const stations = runChecks(profile);
    const heldout = runHeldoutChecks(profile);
    const score = overallScore(stations);
    const grade = scoreToGrade(score);
    const fingerprint = buildFingerprint(profile);
    const lineCount = profile.files.reduce((s, f) => s + f.lines, 0);
    const depCount = Object.keys(profile.dependencies).length;
    const contentHash = computeContentHash(
      profile.files.map((f) => ({ path: f.path, content: f.content })),
    );
    const findingCount = stations.reduce(
      (n, s) => n + s.checks.filter((c) => c.confidence > 0 && !c.passed).length,
      0,
    );

    const projectName = `${parsed.owner}/${parsed.repo}`;
    await updateDareJob(jobId, {
      progress_stage: "Computing score...",
      progress: {
        fileCount: profile.files.length,
        framework: profile.framework,
        findingCount,
        projectName,
        score,
        grade,
      },
    });

    const stationScores: Record<string, number> = {};
    const checkResults: Array<{
      checkId: string;
      station: string;
      title: string;
      severity: string;
      passed: boolean;
      visibility: "public" | "heldout";
    }> = [];
    for (const s of stations) {
      if (s.implemented === 0) continue;
      stationScores[s.station] = s.score;
      for (const c of s.checks) {
        if (c.confidence <= 0) continue;
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
    for (const c of heldout) {
      checkResults.push({
        checkId: c.id,
        station: c.station,
        title: c.title,
        severity: c.severity,
        passed: c.passed,
        visibility: "heldout",
      });
    }

    let scanId: string | null = null;
    if (isSupabaseConfigured()) {
      try {
        const ingested = await ingestUpload(
          getServiceClient(),
          {
            projectName,
            contentHash,
            checkVersion: "1.0.0",
            score,
            grade,
            framework: profile.framework,
            fileCount: profile.files.length,
            lineCount,
            depCount,
            platform: fingerprint.platform.platform,
            model: fingerprint.model.model,
            aiRatio: fingerprint.aiRatio?.aiRatio ?? null,
            stationScores,
            checkResults,
          },
          { forceNew: true, source: "dare" },
        );
        scanId = ingested.scanId;
      } catch {
        // Local / invalid service-role: still finish the dare with a live score.
      }
    }

    await updateDareJob(jobId, {
      status: "complete",
      progress_stage: "Done",
      scan_id: scanId,
      completed_at: new Date().toISOString(),
      progress: {
        fileCount: profile.files.length,
        framework: profile.framework,
        findingCount,
        projectName,
        score,
        grade,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timed out after 120 seconds."
          : err.message
        : "Scan failed.";
    await updateDareJob(jobId, {
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    });
  } finally {
    clearTimeout(timer);
    await rm(workRoot, { recursive: true, force: true });
  }
}
