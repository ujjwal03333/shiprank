import { ImageResponse } from "next/og";
import { cardLine } from "./grade";
import { visiblePlatform } from "./format-names";
import {
  CARD_SIZES,
  NIGHT,
  gradeHex,
  type CardExportSize,
} from "./night-court";

export interface CardImageInput {
  score: number;
  grade: string;
  projectName: string;
  platform?: string | null;
  verdict?: string;
  size?: CardExportSize;
}

export function cardImageResponse(input: CardImageInput): ImageResponse {
  const size = CARD_SIZES[input.size ?? "og"];
  return new ImageResponse(renderCardMarkup(input, size), {
    width: size.width,
    height: size.height,
  });
}

export function renderCardMarkup(
  input: CardImageInput,
  size: { width: number; height: number },
) {
  const color = gradeHex(input.grade);
  const verdict = input.verdict ?? cardLine(input.score);
  const platform = visiblePlatform(input.platform);
  const isStory = size.height > size.width;
  const letterPx = isStory ? 280 : Math.round(size.height * 0.42);
  const namePx = isStory ? 28 : 22;
  const verdictPx = isStory ? 32 : 26;
  const padY = isStory ? 80 : 48;

  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: NIGHT.canvas,
        color: NIGHT.ink,
        padding: `${padY}px 64px`,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: isStory ? 28 : 18,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: letterPx,
            fontWeight: 500,
            color,
            lineHeight: 0.85,
            letterSpacing: "-0.04em",
          }}
        >
          {input.grade}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: namePx,
            color: NIGHT.muted,
            letterSpacing: "0.02em",
          }}
        >
          <span style={{ color: NIGHT.ink }}>{input.score}</span>
          <span style={{ color: NIGHT.subtle }}>
            {`  ·  ${input.projectName}`}
          </span>
        </div>
        {platform ? (
          <div
            style={{
              display: "flex",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 14,
              color: NIGHT.muted,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {platform}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: 8,
            fontSize: verdictPx,
            color: NIGHT.ink,
            letterSpacing: "-0.02em",
          }}
        >
          {verdict}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 12,
          letterSpacing: "0.32em",
          color: NIGHT.muted,
          textTransform: "uppercase",
        }}
      >
        SHIPRANK
      </div>
    </div>
  );
}
