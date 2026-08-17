export interface ScoreNarrative {
  min: number;
  text: string;
}

const NARRATIVES: ScoreNarrative[] = [
  { min: 90, text: "Production-ready. Solid engineering across the board." },
  { min: 80, text: "Strong foundation. A few fixes from excellent." },
  { min: 70, text: "Good bones. Address critical findings before shipping." },
  { min: 60, text: "Needs work. Several important issues to resolve." },
  { min: 0, text: "Major concerns. Needs attention before touching real users." },
];

export function scoreNarrative(score: number): string {
  for (const row of NARRATIVES) {
    if (score >= row.min) return row.text;
  }
  return NARRATIVES[NARRATIVES.length - 1]!.text;
}
