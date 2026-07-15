export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Grade = "A+" | "A" | "B" | "C" | "D" | "F";
export type StationName =
  | "security"
  | "accessibility"
  | "performance"
  | "growth"
  | "code_quality"
  | "architecture"
  | "data"
  | "compliance"
  | "infra";

export interface Project {
  id: string;
  name: string;
  url: string | null;
  repo_url: string | null;
  framework: string | null;
  platform: string | null;
  owner_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  project_id: string;
  status: ScanStatus;
  score: number | null;
  grade: Grade | null;
  station_count: number;
  check_count: number;
  issue_count: number;
  duration_ms: number | null;
  scan_mode: string;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StationResult {
  id: string;
  scan_id: string;
  station: StationName;
  score: number;
  grade: Grade;
  pass_count: number;
  warn_count: number;
  fail_count: number;
  skip_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CheckResult {
  id: string;
  station_result_id: string;
  check_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  passed: boolean;
  score_impact: number;
  file_path: string | null;
  line_number: number | null;
  snippet: string | null;
  fix_suggestion: string | null;
  docs_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Remediation {
  id: string;
  scan_id: string;
  check_result_id: string | null;
  title: string;
  description: string;
  effort: "trivial" | "small" | "medium" | "large";
  impact: "critical" | "high" | "medium" | "low";
  roi_score: number;
  category: string;
  auto_fixable: boolean;
  fix_diff: string | null;
  applied: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Fingerprint {
  id: string;
  scan_id: string;
  platform: string;
  confidence: number;
  signals: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  project_id: string;
  scan_id: string;
  project_name: string;
  platform: string | null;
  framework: string | null;
  score: number;
  grade: Grade;
  url: string | null;
  station_scores: Record<StationName, number>;
  scanned_at: string;
  created_at: string;
}

export interface AgentsMdOutput {
  id: string;
  scan_id: string;
  content: string;
  rule_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function scoreToGrade(score: number): Grade {
  if (score >= 97) return "A+";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}
