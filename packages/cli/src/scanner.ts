import { resolve, basename } from "node:path";
import {
  buildCodeProfile,
  runChecks,
  overallScore,
  buildFingerprint,
  buildRemediationPlan,
  generateAgentsMd,
} from "@shiprank/engine";
import type { StationScore, CodeProfile } from "@shiprank/engine";
import type { Fingerprint, RemediationPlan } from "@shiprank/engine";
import { scoreToGrade as gradeFromScore } from "@shiprank/database";

export interface ScanResult {
  version: string;
  checkSuiteVersion: string;
  projectName: string;
  root: string;
  fileCount: number;
  lineCount: number;
  depCount: number;
  score: number;
  grade: string;
  framework: string;
  fingerprint: Fingerprint;
  stations: StationScore[];
  remediation: RemediationPlan;
  profile: CodeProfile;
}

export async function scanProject(dir: string): Promise<ScanResult> {
  const root = resolve(dir);

  const profile = await buildCodeProfile(root);
  const stations = runChecks(profile);
  const score = overallScore(stations);
  const grade = gradeFromScore(score);
  const fingerprint = buildFingerprint(profile);
  const remediation = buildRemediationPlan(stations);

  const pkg = profile.packageJson;
  const projectName =
    (pkg?.name as string | undefined) ?? basename(root);

  const lineCount = profile.files.reduce((s, f) => s + f.lines, 0);
  const depCount = Object.keys(profile.dependencies).length;

  return {
    version: "1.0.0",
    checkSuiteVersion: "1.0.0",
    projectName,
    root,
    fileCount: profile.files.length,
    lineCount,
    depCount,
    score,
    grade,
    framework: profile.framework,
    fingerprint,
    stations,
    remediation,
    profile,
  };
}

export function getAgentsMd(result: ScanResult): string {
  return generateAgentsMd(result.profile, result.stations, result.fingerprint);
}
