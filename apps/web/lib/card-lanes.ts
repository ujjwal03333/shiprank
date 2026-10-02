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

/**
 * A null lane did not run. That is "n/a", never 100 and never a bare dash.
 * Human with no UI is the phrase "n/a — not a web UI".
 */
export function formatCardLanes(lanes: CardLanes): string {
  const part = (label: string, score: number | null, blank: string) =>
    score == null ? `${label} ${blank}` : `${label} ${score}`;
  return `${part("Security", lanes.security, "n/a")} · ${part("Healthy", lanes.healthy, "n/a")} · ${part("Human", lanes.human, "n/a — not a web UI")}`;
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

/**
 * Lane-only score maps (the current suite). A nine-station map returns null.
 * An empty map is three unscored lanes, not a missing card.
 */
export function cardLanesFromScoreMap(scores: Record<string, number>): CardLanes | null {
  const keys = Object.keys(scores);
  if (keys.length === 0) {
    return { security: null, healthy: null, human: null };
  }
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
  if (!("security" in row) && !("healthy" in row) && !("human" in row)) return null;
  return {
    security: roundScore(row["security"]),
    healthy: roundScore(row["healthy"]),
    human: roundScore(row["human"]),
  };
}
