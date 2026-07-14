/**
 * Typed handles for the 9 scan stations, kept in sync with the
 * `station.*` Tailwind colors in tailwind-preset.ts and the
 * `--sr-station-*` CSS variables in tokens.css.
 */
export const STATIONS = [
  "security",
  "accessibility",
  "performance",
  "growth",
  "codeQuality",
  "architecture",
  "data",
  "compliance",
  "infra",
] as const;

export type Station = (typeof STATIONS)[number];
