"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartPoint } from "@/lib/history-chart";
import { STATION_COLOR, STATION_LABEL } from "@/lib/grade";

export function ScoreHistoryChart({
  data,
  stations = [],
}: {
  data: ChartPoint[];
  stations?: string[];
}) {
  const first = data[0];
  const last = data[data.length - 1];
  const summary =
    first && last
      ? `Score history chart, ${data.length} scans from ${first.date} to ${last.date}. Started at ${first.score}, now at ${last.score}.`
      : "Score history chart.";

  return (
    <div role="img" aria-label={summary}>
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-ink-subtle)" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--color-ink-subtle)" }} />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="score"
          name="ShipScore"
          stroke="#c1653d"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
        {stations.map((station) => (
          <Line
            key={station}
            type="monotone"
            dataKey={station}
            name={STATION_LABEL[station] ?? station}
            stroke={STATION_COLOR[station] ?? "#8f8676"}
            strokeWidth={1.5}
            dot={{ r: 2 }}
            strokeOpacity={0.7}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
