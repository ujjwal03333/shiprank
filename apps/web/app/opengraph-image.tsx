import { ImageResponse } from "next/og";
import { NIGHT } from "@/lib/night-court";

export const alt = "Don't ship AI-built software without a ShipRank";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: NIGHT.canvas,
          padding: "0 80px",
          gap: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 500,
            color: NIGHT.ink,
            fontFamily: "Georgia, 'Times New Roman', serif",
            letterSpacing: "-0.03em",
            textAlign: "center",
            lineHeight: 1.05,
          }}
        >
          Don&apos;t ship AI-built software without a ShipRank.
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 14,
            letterSpacing: "0.32em",
            color: NIGHT.subtle,
            textTransform: "uppercase",
          }}
        >
          SHIPRANK
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
