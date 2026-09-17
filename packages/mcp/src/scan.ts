import { resolve, basename } from "node:path";
import {
  buildCodeProfile,
  runChecks,
  runHeldoutChecks,
  overallScore,
  buildFingerprint,
  buildRemediationPlan,
  generateAgentsMd,
  computeContentHash,
} from "@shiprank/engine";
import type {
  StationScore,
  CodeProfile,
  CheckResult,
  Fingerprint,
  RemediationPlan,
} from "@shiprank/engine";
import { scoreToGrade } from "@shiprank/database";

/**
 * Same composition as @shiprank/cli's scanProject() — every step is a pure
 * function imported from @shiprank/engine, so the MCP server never
 * re-implements checking or scoring logic, only orchestrates it.
 */
export interface McpScanResult {
  version: string;
  checkSuiteVersion: string;
  projectName: string;
  root: string;
  contentHash: string;
  fileCount: number;
  lineCount: number;
  depCount: number;
  score: number;
  grade: string;
  framework: string;
  fingerprint: Fingerprint;
  stations: StationScore[];
  heldout: CheckResult[];
  remediation: RemediationPlan;
  profile: CodeProfile;
}

export async function runFullScan(dir: string): Promise<McpScanResult> {
  const root = resolve(dir);

  const profile = await buildCodeProfile(root);
  const stations = runChecks(profile);
  const heldout = runHeldoutChecks(profile);
  const score = overallScore(stations);
  const grade = scoreToGrade(score);
  const fingerprint = buildFingerprint(profile);
  const remediation = buildRemediationPlan(stations);

  const pkg = profile.packageJson;
  const projectName = (pkg?.["name"] as string | undefined) ?? basename(root);
  const lineCount = profile.files.reduce((s, f) => s + f.lines, 0);
  const depCount = Object.keys(profile.dependencies).length;
  const contentHash = computeContentHash(
    profile.files.map((f) => ({ path: f.path, content: f.content })),
  );

  return {
    version: "1.0.0",
    checkSuiteVersion: "1.0.0",
    projectName,
    root,
    contentHash,
    fileCount: profile.files.length,
    lineCount,
    depCount,
    score,
    grade,
    framework: profile.framework,
    fingerprint,
    stations,
    heldout,
    remediation,
    profile,
  };
}

/**
 * Runs the check suite once on `dir` and returns only the findings whose
 * evidence or fail message touches one of `files` — the substring match
 * mirrors the "<file.path>: ..." convention every check writes evidence in.
 */
export async function checkDiff(
  dir: string,
  files: string[],
): Promise<CheckResult[]> {
  const root = resolve(dir);
  const profile = await buildCodeProfile(root);
  const stations = runChecks(profile);
  const all = stations.flatMap((s) => s.checks);

  if (files.length === 0) return [];

  return all.filter((check) =>
    files.some(
      (f) => check.evidence.includes(f) || check.failMessage.includes(f),
    ),
  );
}

export async function getContract(dir: string): Promise<{
  checkId: string;
  title: string;
  filePath: string | null;
  lineNumber: number | null;
  prompt: string;
  remainingAfter: number;
} | null> {
  const root = resolve(dir);
  const profile = await buildCodeProfile(root);
  const stations = runChecks(profile);
  const failing = stations
    .flatMap((s) => s.checks)
    .filter((c) => c.confidence > 0 && c.applicable !== false && !c.passed);
  if (failing.length === 0) return null;
  const ranked = [...failing].sort((a, b) => {
    const ea = a.filePath ? 0 : 1;
    const eb = b.filePath ? 0 : 1;
    if (ea !== eb) return ea - eb;
    const rank = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });
  const c = ranked[0]!;
  const loc =
    c.filePath != null
      ? `${c.filePath}${c.lineNumber != null ? `:${c.lineNumber}` : ""}`
      : null;
  const prompt = [
    "Close this ShipRank contract. Do not start other work.",
    "",
    `Contract: ${c.id} — ${c.title}`,
    loc ? `Where: ${loc}` : "Where: search the repo for this failure.",
    "",
    "Do this:",
    c.fixPrompt || "Make the smallest change that makes this check pass.",
    "",
    "Rules:",
    `- Smallest change that makes ${c.id} pass.`,
    "- Do not refactor unrelated files.",
    "",
    "Verify:",
    "npx shiprank",
    `This check must pass: ${c.id}`,
  ].join("\n");
  return {
    checkId: c.id,
    title: c.title,
    filePath: c.filePath ?? null,
    lineNumber: c.lineNumber ?? null,
    prompt,
    remainingAfter: Math.max(0, failing.length - 1),
  };
}

/** AGENTS.md content for `dir`, generated from the current check findings. */
export async function getRules(dir: string): Promise<string> {
  const root = resolve(dir);
  const profile = await buildCodeProfile(root);
  const stations = runChecks(profile);
  const fingerprint = buildFingerprint(profile);
  return generateAgentsMd(profile, stations, fingerprint);
}
