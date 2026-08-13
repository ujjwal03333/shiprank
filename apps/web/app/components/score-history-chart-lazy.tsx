"use client";

import dynamic from "next/dynamic";

const ScoreHistoryChartInner = dynamic(
  () => import("./score-history-chart").then((m) => m.ScoreHistoryChart),
  {
    ssr: false,
    loading: () => <div className="skeleton h-[320px] w-full rounded-lg" />,
  },
);

export { ScoreHistoryChartInner as ScoreHistoryChart };
