/**
 * The three lanes on a Card. Missing means that lane did not score.
 * Never filled in from an older nine-station scan.
 */

export interface CardLanes {
  security: number | null;
  healthy: number | null;
  human: number | null;
}

const LANE_STATIONS = new Set(["security", "quality", "accessibility"]);

function roundScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value);
}

export function formatCardLanes(lanes: CardLanes): string | null {
  if (lanes.security == null && lanes.healthy == null && lanes.human == null) return null;
  const part = (label: string, score: number | null) =>
    score == null ? `${label} —` : `${label} ${score}`;
  return `${part("Security", lanes.security)} · ${part("Healthy", lanes.healthy)} · ${part("Human", lanes.human)}`;
}

export function cardLanesFromStations(
  stations: readonly { station: string; score: number; implemented: number }[],
): CardLanes {
  const pick = (station: string): number | null => {
    const row = stations.find((s) => s.station === station);
    if (!row || row.implemented <= 0) return null;
    return Math.round(row.score);
  };
  return {
    security: pick("security"),
    healthy: pick("quality"),
    human: pick("accessibility"),
  };
}

/** Lane-only score maps (the current suite). A nine-station map returns null. */
export function cardLanesFromScoreMap(scores: Record<string, number>): CardLanes | null {
  const keys = Object.keys(scores);
  if (keys.length === 0) return null;
  if (!keys.every((key) => LANE_STATIONS.has(key))) return null;
  return {
    security: "security" in scores ? roundScore(scores["security"]) : null,
    healthy: "quality" in scores ? roundScore(scores["quality"]) : null,
    human: "accessibility" in scores ? roundScore(scores["accessibility"]) : null,
  };
}

export function lanesFromMetadata(metadata: unknown): CardLanes | null {
  if (!metadata || typeof metadata !== "object") return null;
  const lanes = (metadata as { lanes?: unknown }).lanes;
  if (!lanes || typeof lanes !== "object") return null;
  const row = lanes as Record<string, unknown>;
  const parsed: CardLanes = {
    security: roundScore(row["security"]),
    healthy: roundScore(row["healthy"]),
    human: roundScore(row["human"]),
  };
  if (parsed.security == null && parsed.healthy == null && parsed.human == null) return null;
  return parsed;
}
