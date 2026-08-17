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

/**
 * 'public'  — scored, shown on the report + /methodology page.
 * 'heldout' — runs on every scan and its result is stored, but it is excluded
 *             from scoring and from the public methodology. Held-out checks let
 *             us measure public-score vs heldout-score divergence per platform
 *             without teaching AI tools to game them. Omitted ⇒ 'public'.
 */
export type CheckVisibility = "public" | "heldout";

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
  /** Defaults to 'public' when omitted. Held-out checks never affect scoring. */
  visibility?: CheckVisibility;
  /** Deterministic archaeology record. Frequency is filled by the web layer. */
  decisionContext?: DecisionContext;
}

export interface DecisionContext {
  aiPattern: string;
  probableCause: string;
  whatShouldBe: string;
  impactChain: string;
  frequencyPct?: number | undefined;
  sampleSize?: number | undefined;
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
