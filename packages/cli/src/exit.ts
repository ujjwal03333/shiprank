import type { License } from "@shiprank/engine";

export interface ScanExitInput {
  license: License;
  uploadFailed: boolean;
  ci: boolean;
  score: number;
  threshold: number;
}

/**
 * 0  Licensed. --help and --rules also exit 0 (handled before this).
 * 1  Hold (criticalCount > 0), --upload could not reach the API,
 *    or --ci score is below --threshold.
 */
export function scanExitCode(input: ScanExitInput): number {
  if (input.uploadFailed) return 1;
  if (input.license === "Hold") return 1;
  if (input.ci && input.score < input.threshold) return 1;
  return 0;
}
