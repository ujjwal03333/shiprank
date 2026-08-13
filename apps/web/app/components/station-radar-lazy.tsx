"use client";

import dynamic from "next/dynamic";

const StationRadarInner = dynamic(
  () => import("./station-radar").then((m) => m.StationRadar),
  {
    ssr: false,
    loading: () => <div className="skeleton h-[280px] w-full rounded-lg" />,
  },
);

export { StationRadarInner as StationRadar };
