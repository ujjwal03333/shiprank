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

export interface ShipContract {
  checkId: string;
  title: string;
  why: string;
  filePath: string | null;
  lineNumber: number | null;
  snippet: string | null;
  prompt: string;
  estimatedDelta: number;
  severity: string;
}

export function estimateDelta(severity: string): number {
  if (severity === "critical") return 8;
  if (severity === "high") return 5;
  if (severity === "warning" || severity === "medium") return 3;
  return 2;
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
  const how =
    finding.how?.trim() ||
    "Make the smallest change that makes this check pass.";

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

/**
 * One contract. Highest-leverage unfinished thing.
 * Findings are evidence — this is the only case the product issues.
 */
export function pickContract(findings: FindingRow[]): ShipContract | null {
  const failing = findings.filter((f) => !f.passed);
  if (failing.length === 0) return null;

  const sorted = [...failing].sort((a, b) => {
    const da = SEVERITY_RANK[a.severity] ?? 9;
    const db = SEVERITY_RANK[b.severity] ?? 9;
    if (da !== db) return da - db;
    return a.checkId.localeCompare(b.checkId);
  });
  const f = sorted[0]!;
  const ctx = decisionContextFor(f.checkId);
  const why =
    ctx?.probableCause ??
    ctx?.aiPattern ??
    "The agent optimized for a demo, not for shipping.";
  const how = f.fixSuggestion ?? ctx?.whatShouldBe ?? null;

  return {
    checkId: f.checkId,
    title: f.title,
    why,
    filePath: f.filePath,
    lineNumber: f.lineNumber,
    snippet: f.snippet,
    prompt: defaultAgentPrompt({
      checkId: f.checkId,
      title: f.title,
      filePath: f.filePath,
      lineNumber: f.lineNumber,
      why,
      how,
    }),
    estimatedDelta: estimateDelta(f.severity),
    severity: f.severity,
  };
}
