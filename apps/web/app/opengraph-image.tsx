import { ImageResponse } from "next/og";

export const alt = "ShipRank — The finishing service for AI-built software";
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
          backgroundColor: "#fbf7f1",
          padding: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Terracotta accent stripe */}
        <div
          style={{
            width: "100%",
            height: 6,
            backgroundColor: "#c4622d",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "0 80px",
            gap: 32,
          }}
        >
          {/* Title */}
          <span
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#2b2419",
              letterSpacing: "-0.03em",
              fontFamily: "Georgia, 'Times New Roman', serif",
              lineHeight: 1,
            }}
          >
            ShipRank
          </span>

          {/* Terracotta divider */}
          <div
            style={{
              width: 80,
              height: 4,
              backgroundColor: "#c4622d",
              borderRadius: 2,
              display: "flex",
            }}
          />

          {/* Subtitle */}
          <span
            style={{
              fontSize: 28,
              color: "#6b5e4f",
              textAlign: "center",
              lineHeight: 1.4,
              maxWidth: 700,
            }}
          >
            The finishing service for AI-built software
          </span>
        </div>

        {/* Bottom accent stripe */}
        <div
          style={{
            width: "100%",
            height: 6,
            backgroundColor: "#c4622d",
            display: "flex",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
