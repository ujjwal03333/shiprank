/**
 * Night Court — the only palette the Card, OG images, and badges share.
 * CSS tokens in @shiprank/ui must stay in lockstep with these hex values.
 * ImageResponse cannot read CSS variables, so this file is the OG source.
 */

export const NIGHT = {
  canvas: "#070708",
  surface: "#101012",
  raised: "#18181B",
  ink: "#F3EFE6",
  muted: "#9A958A",
  subtle: "#6F6B64",
  hairline: "#2A2A2E",
} as const;

/** Grade IS the color system. C and F are lifted so they survive X compression. */
export const GRADE_HEX = {
  "A+": "#E8C547",
  A: "#E8C547",
  B: "#8FBFCC",
  C: "#F0A03A",
  D: "#E06040",
  F: "#FF4D4D",
} as const;

export type GradeLetter = keyof typeof GRADE_HEX;

export function gradeHex(grade: string): string {
  const key = grade.toUpperCase() as GradeLetter;
  return GRADE_HEX[key] ?? GRADE_HEX.F;
}

export const CARD_SIZES = {
  og: { width: 1200, height: 630 },
  landscape: { width: 1600, height: 900 },
  story: { width: 1080, height: 1350 },
} as const;

export type CardExportSize = keyof typeof CARD_SIZES;
