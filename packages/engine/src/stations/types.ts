export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface CheckResult {
  id: string;
  title: string;
  severity: Severity;
  passed: boolean;
  detail: string;
  remediation: string;
}

export interface StationResult {
  stationId: string;
  stationName: string;
  score: number;
  maxScore: number;
  checks: CheckResult[];
}
