/**
 * shields.io-style SVG badge, Night Court palette.
 * Pure + deterministic so it can be unit-tested and cached hard.
 *
 *   [ ShipRank | 86 A ]
 */

import { NIGHT, gradeHex } from "./night-court";

function gradeColor(grade: string): string {
  return gradeHex(grade);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ~6.2px per char at 11px monospace-ish; good enough for layout.
function textWidth(s: string): number {
  return Math.ceil(s.length * 6.5) + 12;
}

export interface BadgeOptions {
  label?: string;
  score: number | null;
  grade: string | null;
}

export function renderBadgeSvg({
  label = "ShipRank",
  score,
  grade,
}: BadgeOptions): string {
  const value =
    score != null && grade != null ? `${score} ${grade}` : "unknown";
  const color = grade != null ? gradeColor(grade) : NIGHT.subtle;

  const labelText = escapeXml(label);
  const valueText = escapeXml(value);

  const leftW = textWidth(labelText);
  const rightW = textWidth(valueText);
  const total = leftW + rightW;
  const height = 20;

  const labelBg = NIGHT.canvas;
  const labelMid = leftW / 2;
  const valueMid = leftW + rightW / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${height}" role="img" aria-label="${labelText}: ${valueText}">
  <title>${labelText}: ${valueText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".08"/>
    <stop offset="1" stop-opacity=".08"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="${height}" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="${height}" fill="${labelBg}"/>
    <rect x="${leftW}" width="${rightW}" height="${height}" fill="${color}"/>
    <rect width="${total}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="${NIGHT.ink}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="11" text-anchor="middle">
    <text x="${labelMid}" y="14">${labelText}</text>
    <text x="${valueMid}" y="14" font-weight="600">${valueText}</text>
  </g>
</svg>`;
}
