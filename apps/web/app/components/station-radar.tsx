"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { STATION_LABEL } from "@/lib/grade";

interface StationRadarProps {
  current: Record<string, number>;
  siteAverage?: Record<string, number> | null;
  siteAverageN?: number;
}

export function StationRadar({ current, siteAverage, siteAverageN }: StationRadarProps) {
  const stationKeys = Object.keys(current);
  const data = stationKeys.map((key) => ({
    station: STATION_LABEL[key] ?? key,
    "This scan": current[key],
    ...(siteAverage && siteAverage[key] != null
      ? { "Site average": Math.round(siteAverage[key]!) }
      : {}),
  }));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
          Station comparison
        </h2>
        {siteAverage && siteAverageN ? (
          <span className="font-mono text-[11px] text-ink-subtle">
            vs. site average (n={siteAverageN})
          </span>
        ) : null}
      </div>
      <div
        role="img"
        aria-label={`Station comparison radar chart. ${stationKeys
          .map((key) => `${STATION_LABEL[key] ?? key}: ${current[key]}`)
          .join(", ")}. The same figures are listed in the Station Scores panel above.`}
      >
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="station"
            tick={{ fontSize: 11, fill: "var(--color-ink-subtle)" }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--color-ink-subtle)" }}
            axisLine={false}
          />
          <Radar
            name="This scan"
            dataKey="This scan"
            stroke="var(--color-brand)"
            fill="var(--color-brand)"
            fillOpacity={0.28}
          />
          {siteAverage && (
            <Radar
              name="Site average"
              dataKey="Site average"
              stroke="var(--color-ink-subtle)"
              fill="var(--color-ink-subtle)"
              fillOpacity={0.08}
              strokeDasharray="4 3"
            />
          )}
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
