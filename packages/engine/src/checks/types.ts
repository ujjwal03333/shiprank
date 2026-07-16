export type Station =
  | "security"
  | "accessibility"
  | "performance"
  | "growth"
  | "quality"
  | "architecture"
  | "data"
  | "compliance"
  | "infrastructure";

export type Severity = "critical" | "warning" | "info";
export type AutoFixSafety = "safe" | "review" | "human-only";
export type FixDifficulty = "copy-paste" | "moderate" | "architectural";
export type Framework = "nextjs" | "vite-react" | "vue" | "svelte" | "html" | "unknown";

export interface CheckResult {
  id: string;
  station: Station;
  passed: boolean;
  severity: Severity;
  /** 0 = stub (excluded from scoring), 1-100 = implemented check confidence */
  confidence: number;
  title: string;
  failMessage: string;
  evidence: string;
  fixPrompt: string;
  fixDifficulty: FixDifficulty;
  fixTime: string;
  autoFixSafety: AutoFixSafety;
  scoreWeight: number;
}

export interface FileInfo {
  path: string;   // relative to project root
  ext: string;
  size: number;   // bytes
  lines: number;
  content: string; // first 500 lines
}

export interface GitCommit {
  hash: string;
  message: string;
  diff: string;
}

export interface CodeProfile {
  root: string;
  files: FileInfo[];
  packageJson: Record<string, unknown> | null;
  dependencies: Record<string, string>;
  tsConfig: Record<string, unknown> | null;
  supabaseMigrations: string[];        // SQL file contents
  apiRoutes: string[];                 // relative file paths
  components: string[];                // relative file paths
  testFiles: string[];                 // relative file paths
  configFiles: Record<string, string>; // basename → content
  envExample: string | null;
  gitCommits: GitCommit[] | null;      // null if not a git repo

  framework: Framework;
  hasAuth: boolean;
  hasDatabase: boolean;
  hasPayments: boolean;
  hasUserData: boolean;
}

export interface StationScore {
  station: Station;
  name: string;
  score: number;    // 0-100, normalised over implemented checks only
  checks: CheckResult[];
  implemented: number;
  total: number;
}

export type CheckFn = (profile: CodeProfile) => CheckResult;
