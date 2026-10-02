import type { CodeProfile, CheckResult, StationScore, Station } from "./types";
import { laneChecks, annotateLaneCaps, LANE_WEIGHTS } from "./lanes";
import { heldoutChecks } from "./heldout";
import { decisionContextFor } from "../decision-context";
import { attachEvidenceLoc } from "../evidence";

export const LICENSE_FLOOR_CHECKS = 12;
export const VACUOUS_SCORE_CAP = 69;

/** Scored checks only: stubs (confidence 0) and N/A do not count. */
export function isActiveCheck(check: CheckResult): boolean {
  return check.confidence > 0 && check.applicable !== false;
}

function isActive(check: CheckResult): boolean {
  return isActiveCheck(check);
}

const STATION_NAMES: Record<Station, string> = {
  security: "Security",
  accessibility: "Human",
  performance: "Performance",
  growth: "Growth",
  quality: "Healthy",
  architecture: "Architecture",
  data: "Data Integrity",
  compliance: "Compliance",
  infrastructure: "Infrastructure",
};

const ALL_CHECKS = [...laneChecks];

function severityMultiplier(profile: CodeProfile, check: CheckResult): number {
  if (check.severity !== "critical" && check.severity !== "warning") return 1;
  let m = 1.0;
  if (profile.hasPayments) {
    m *= check.severity === "critical" ? 1.5 : 1.2;
  }
  if (profile.hasUserData) {
    m *= check.severity === "critical" ? 1.3 : 1.1;
  }
  if (profile.hasAuth) {
    m *= check.severity === "critical" ? 1.2 : 1.0;
  }
  return m;
}

function scoreStation(checks: CheckResult[], profile: CodeProfile): number {
  const active = checks.filter(isActive);
  // No implemented checks: this station is omitted from overallScore.
  // Returning 100 here was a lie — an empty suite is not a perfect score.
  if (active.length === 0) return 0;

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of active) {
    const weight = check.scoreWeight * severityMultiplier(profile, check);
    totalWeight += weight;
    if (check.passed) earnedWeight += weight;
  }

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}

export function runChecks(profile: CodeProfile): StationScore[] {
  // ALL_CHECKS are public. Held-out checks live in a separate registry and are
  // never included here, so they can never influence a station or overall score.
  const results = ALL_CHECKS.map(fn => {
    const result = fn(profile);
    return attachEvidenceLoc({
      ...result,
      visibility: "public" as const,
      decisionContext: result.decisionContext ?? decisionContextFor(result.id),
    });
  });

  const byStation = new Map<Station, CheckResult[]>();
  for (const result of results) {
    const list = byStation.get(result.station) ?? [];
    list.push(result);
    byStation.set(result.station, list);
  }

  const stations: Station[] = [
    "security", "accessibility", "performance", "growth",
    "quality", "architecture", "data", "compliance", "infrastructure",
  ];

  const scored = stations.map(station => {
    const checks = byStation.get(station) ?? [];
    const implemented = checks.filter(isActive).length;
    return {
      station,
      name: STATION_NAMES[station],
      score: implemented === 0 ? 0 : scoreStation(checks, profile),
      checks,
      implemented,
      total: checks.length,
    };
  });
  return annotateLaneCaps(profile, scored);
}

/**
 * Runs the held-out checks. Their results are meant to be stored (with
 * visibility 'heldout') for divergence analysis, NOT scored or displayed.
 * Kept entirely separate from runChecks so scoring can never see them.
 */
export function runHeldoutChecks(profile: CodeProfile): CheckResult[] {
  return heldoutChecks.map(fn => ({
    ...fn(profile),
    visibility: "heldout" as const,
  }));
}

export function applicableCheckCount(stationScores: StationScore[]): number {
  return stationScores.reduce((n, s) => n + s.implemented, 0);
}

export function overallScore(stationScores: StationScore[]): number {
  const lanes = stationScores.filter(
    (s) => s.station in LANE_WEIGHTS && s.implemented > 0,
  );
  if (lanes.length === 0) return 0;
  let weight = 0;
  let acc = 0;
  for (const s of lanes) {
    const w = LANE_WEIGHTS[s.station as keyof typeof LANE_WEIGHTS];
    weight += w;
    acc += s.score * w;
  }
  let raw = weight > 0 ? Math.round(acc / weight) : 0;
  if (applicableCheckCount(stationScores) < LICENSE_FLOOR_CHECKS) {
    raw = Math.min(raw, VACUOUS_SCORE_CAP);
  }
  let cap = 100;
  for (const s of stationScores) {
    if (s.capGrade === "D") cap = Math.min(cap, 54);
    else if (s.capGrade === "C") cap = Math.min(cap, 69);
  }
  return Math.min(raw, cap);
}
