import type { CodeProfile, CheckResult, StationScore, Station } from "./types";
import { securityChecks } from "./security";
import { accessibilityChecks } from "./accessibility";
import { performanceChecks } from "./performance";
import { growthChecks } from "./growth";
import { qualityChecks } from "./quality";
import { architectureChecks } from "./architecture";
import { dataChecks } from "./data";
import { complianceChecks } from "./compliance";
import { infrastructureChecks } from "./infrastructure";
import { heldoutChecks } from "./heldout";
import { decisionContextFor } from "../decision-context";

const STATION_NAMES: Record<Station, string> = {
  security: "Security",
  accessibility: "Accessibility",
  performance: "Performance",
  growth: "Growth",
  quality: "Code Quality",
  architecture: "Architecture",
  data: "Data Integrity",
  compliance: "Compliance",
  infrastructure: "Infrastructure",
};

const ALL_CHECKS = [
  ...securityChecks,
  ...accessibilityChecks,
  ...performanceChecks,
  ...growthChecks,
  ...qualityChecks,
  ...architectureChecks,
  ...dataChecks,
  ...complianceChecks,
  ...infrastructureChecks,
];

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
  const active = checks.filter(c => c.confidence > 0);
  if (active.length === 0) return 100;

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const check of active) {
    const weight = check.scoreWeight * severityMultiplier(profile, check);
    totalWeight += weight;
    if (check.passed) earnedWeight += weight;
  }

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;
}

export function runChecks(profile: CodeProfile): StationScore[] {
  // ALL_CHECKS are public. Held-out checks live in a separate registry and are
  // never included here, so they can never influence a station or overall score.
  const results = ALL_CHECKS.map(fn => {
    const result = fn(profile);
    return {
      ...result,
      visibility: "public" as const,
      decisionContext: result.decisionContext ?? decisionContextFor(result.id),
    };
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

  return stations.map(station => {
    const checks = byStation.get(station) ?? [];
    const implemented = checks.filter(c => c.confidence > 0).length;
    return {
      station,
      name: STATION_NAMES[station],
      score: scoreStation(checks, profile),
      checks,
      implemented,
      total: checks.length,
    };
  });
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

export function overallScore(stationScores: StationScore[]): number {
  // Stations weighted equally for the overall score
  if (stationScores.length === 0) return 100;
  const sum = stationScores.reduce((s, ss) => s + ss.score, 0);
  return Math.round(sum / stationScores.length);
}
