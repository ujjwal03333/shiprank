"use client";

import { StationRadar } from "@/app/components/station-radar-lazy";
import type { ModelRanking } from "@/lib/model-rankings";
import { STATION_LABEL } from "@/lib/grade";

export function ModelDrilldown({ ranking }: { ranking: ModelRanking }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-4">
      {Object.keys(ranking.stationAverages).length >= 3 && (
        <StationRadar
          current={ranking.stationAverages}
          siteAverage={null}
          siteAverageN={0}
        />
      )}
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-subtle">
          Signature
        </p>
        <p className="font-body text-xs text-ink-muted">
          Strongest: {ranking.bestStation ? (STATION_LABEL[ranking.bestStation] ?? ranking.bestStation) : "—"}
          {" · "}
          Weakest: {ranking.worstStation ? (STATION_LABEL[ranking.worstStation] ?? ranking.worstStation) : "—"}
        </p>
      </div>
      {ranking.topFailingChecks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {ranking.topFailingChecks.map((c) => (
            <li key={c.checkId} className="font-mono text-xs text-ink-muted">
              {c.checkId} — fails {Math.round(c.failRate * 100)}% (n={c.sample})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
