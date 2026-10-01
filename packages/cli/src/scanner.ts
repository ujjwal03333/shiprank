import { resolve, basename } from "node:path";
import {
  buildCodeProfile,
  runChecks,
  overallScore,
  runHeldoutChecks,
  buildFingerprint,
  buildRemediationPlan,
  generateAgentsMd,
  computeContentHash,
  licenseFor,
  criticalCountOf,
  failingCountOf,
} from "@shiprank/engine";
import type { StationScore, CodeProfile, CheckResult, License } from "@shiprank/engine";
import type { Fingerprint, RemediationPlan } from "@shiprank/engine";
import { scoreToGrade as gradeFromScore } from "@shiprank/database";

export interface ScanResult {
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
  /** Hold if any scored critical failed. Stubs and N/A do not count. */
  license: License;
  criticalCount: number;
  failingCount: number;
  framework: string;
  fingerprint: Fingerprint;
  stations: StationScore[];
  heldout: CheckResult[];
  remediation: RemediationPlan;
  profile: CodeProfile;
}

export async function scanProject(dir: string): Promise<ScanResult> {
  const root = resolve(dir);

  const profile = await buildCodeProfile(root);
  const stations = runChecks(profile);
  const heldout = runHeldoutChecks(profile);
  const score = overallScore(stations);
  const grade = gradeFromScore(score);
  const criticalCount = criticalCountOf(stations);
  const failingCount = failingCountOf(stations);
  const license = licenseFor(criticalCount);
  const fingerprint = buildFingerprint(profile);
  const remediation = buildRemediationPlan(stations);

  const pkg = profile.packageJson;
  const projectName =
    (pkg?.name as string | undefined) ?? basename(root);

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
    license,
    criticalCount,
    failingCount,
    framework: profile.framework,
    fingerprint,
    stations,
    heldout,
    remediation,
    profile,
  };
}

export function getAgentsMd(result: ScanResult): string {
  return generateAgentsMd(result.profile, result.stations, result.fingerprint);
}
