import type { StationScore, Severity, AutoFixSafety, FixDifficulty } from "./checks/types";
import { overallScore } from "./checks/engine";

export type AutoFixClass = "SAFE-AUTO" | "REVIEW" | "HUMAN-ONLY";

export interface RemediationItem {
  checkId: string;
  station: string;
  title: string;
  severity: Severity;
  /** Improvement to the 0-100 overall score if this single check passes. */
  scoreGain: number;
  effortMinutes: number;
  /** scoreGain / effortMinutes — higher = do this first. */
  roi: number;
  fixDifficulty: FixDifficulty;
  fixPrompt: string;
  autoFixSafety: AutoFixSafety;
  autoFixClass: AutoFixClass;
}

export interface RemediationPlan {
  currentScore: number;
  /** Projected overall score after all top-3 fixes are applied (capped at 100). */
  projectedScore: number;
  top3: RemediationItem[];
  /** Every failed active check, sorted by ROI descending. */
  all: RemediationItem[];
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function parseMinutes(fixTime: string): number {
  const hrMatch = fixTime.match(/(\d+(?:\.\d+)?)\s*hrs?/i);
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]!) * 60);
  const minMatch = fixTime.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]!, 10);
  return 60; // safe fallback
}

function toAutoFixClass(safety: AutoFixSafety): AutoFixClass {
  if (safety === "safe") return "SAFE-AUTO";
  if (safety === "human-only") return "HUMAN-ONLY";
  return "REVIEW";
}

// ── main ──────────────────────────────────────────────────────────────────────

export function buildRemediationPlan(stationScores: StationScore[]): RemediationPlan {
  const current = overallScore(stationScores);
  const stationCount = stationScores.length;

  const items: RemediationItem[] = [];

  for (const station of stationScores) {
    // Only implemented checks (confidence > 0) matter for scoring.
    const active = station.checks.filter(c => c.confidence > 0);
    const totalWeight = active.reduce((s, c) => s + c.scoreWeight, 0);
    if (totalWeight === 0) continue;

    for (const check of active) {
      if (check.passed) continue;

      // How many station-score points this check is worth.
      const stationGain = (check.scoreWeight / totalWeight) * 100;
      // Station scores are averaged equally across all stations for overall.
      const overallGain = stationGain / stationCount;

      const effortMinutes = parseMinutes(check.fixTime);
      const roi = effortMinutes > 0 ? overallGain / effortMinutes : 0;

      items.push({
        checkId: check.id,
        station: station.station,
        title: check.title,
        severity: check.severity,
        scoreGain: Math.round(overallGain * 10) / 10,
        effortMinutes,
        roi: Math.round(roi * 100_000) / 100_000,
        fixDifficulty: check.fixDifficulty,
        fixPrompt: check.fixPrompt,
        autoFixSafety: check.autoFixSafety,
        autoFixClass: toAutoFixClass(check.autoFixSafety),
      });
    }
  }

  // Best ROI first.
  items.sort((a, b) => b.roi - a.roi);

  const top3 = items.slice(0, 3);
  const gainSum = top3.reduce((s, i) => s + i.scoreGain, 0);
  const projectedScore = Math.min(100, Math.round((current + gainSum) * 10) / 10);

  return { currentScore: current, projectedScore, top3, all: items };
}
