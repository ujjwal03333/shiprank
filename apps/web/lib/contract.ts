import { decisionContextFor } from "./decision-context";
import type { FindingRow } from "./plan-gating";

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  warning: 2,
  medium: 2,
  low: 3,
  info: 4,
};

const AGENT_PLATFORMS = new Set([
  "cursor",
  "bolt",
  "lovable",
  "replit",
  "v0",
  "base44",
  "claude-code",
  "claude code",
]);

export interface ShipContract {
  checkId: string;
  title: string;
  why: string | null;
  filePath: string | null;
  lineNumber: number | null;
  snippet: string | null;
  prompt: string;
  estimatedDelta: number;
  severity: string;
  remainingAfter: number;
  agentAttributed: boolean;
}

export interface PickContractOptions {
  platform?: string | null;
}

export function isAgentPlatform(platform: string | null | undefined): boolean {
  if (!platform) return false;
  return AGENT_PLATFORMS.has(platform.trim().toLowerCase());
}

export function estimateDelta(severity: string): number {
  if (severity === "critical") return 8;
  if (severity === "high") return 5;
  if (severity === "warning" || severity === "medium") return 3;
  return 2;
}

function locate(f: FindingRow): { filePath: string | null; lineNumber: number | null } {
  if (f.filePath) return { filePath: f.filePath, lineNumber: f.lineNumber };
  return { filePath: null, lineNumber: null };
}

export function defaultAgentPrompt(finding: {
  checkId: string;
  title: string;
  filePath: string | null;
  lineNumber: number | null;
  why?: string | null;
  how?: string | null;
}): string {
  const loc =
    finding.filePath != null
      ? `${finding.filePath}${finding.lineNumber != null ? `:${finding.lineNumber}` : ""}`
      : null;
  const how = finding.how?.trim() || "Make the smallest change that makes this check pass.";
  return [
    "Close this ShipRank contract. Do not start other work.",
    "",
    `Contract: ${finding.checkId} — ${finding.title}`,
    loc ? `Where: ${loc}` : "Where: search the repo for this failure.",
    finding.why ? `Why: ${finding.why}` : null,
    "",
    "Do this:",
    how,
    "",
    "Rules:",
    `- Smallest change that makes ${finding.checkId} pass.`,
    "- Do not refactor unrelated files.",
    "",
    "Verify:",
    "npx shiprank",
    `This check must pass: ${finding.checkId}`,
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

function closable(f: FindingRow): boolean {
  return locate(f).filePath != null;
}

export function pickContract(
  findings: FindingRow[],
  options: PickContractOptions = {},
): ShipContract | null {
  const failing = findings.filter((f) => !f.passed);
  if (failing.length === 0) return null;
  const sorted = [...failing].sort((a, b) => {
    const ea = closable(a) ? 0 : 1;
    const eb = closable(b) ? 0 : 1;
    if (ea !== eb) return ea - eb;
    const da = SEVERITY_RANK[a.severity] ?? 9;
    const db = SEVERITY_RANK[b.severity] ?? 9;
    if (da !== db) return da - db;
    return a.checkId.localeCompare(b.checkId);
  });
  const pointed = sorted.filter(closable);
  if (pointed.length === 0) return null; // UI: "Nothing we can point at"
  const f = pointed[0]!;
  const loc = locate(f);
  const ctx = decisionContextFor(f.checkId);
  const agentAttributed = isAgentPlatform(options.platform);
  const why = agentAttributed ? (ctx?.probableCause ?? ctx?.aiPattern ?? null) : null;
  const how = f.fixSuggestion ?? ctx?.whatShouldBe ?? null;
  return {
    checkId: f.checkId,
    title: f.title,
    why,
    filePath: loc.filePath,
    lineNumber: loc.lineNumber,
    snippet: f.snippet,
    prompt: defaultAgentPrompt({
      checkId: f.checkId,
      title: f.title,
      filePath: loc.filePath,
      lineNumber: loc.lineNumber,
      why,
      how,
    }),
    estimatedDelta: estimateDelta(f.severity),
    severity: f.severity,
    remainingAfter: Math.max(0, failing.length - 1),
    agentAttributed,
  };
}
