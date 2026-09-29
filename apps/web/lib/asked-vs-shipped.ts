import {
  askedChipsFromEvidence,
  type AskedChip,
  type ChipEvidence,
} from "@shiprank/engine";
import type { FindingRow } from "./plan-gating";

export type { AskedChip } from "@shiprank/engine";

export function chipsFromFindings(findings: readonly FindingRow[]): AskedChip[] {
  return askedChipsFromEvidence(
    findings.map((f) => {
      const row: ChipEvidence = {
        checkId: f.checkId,
        passed: f.passed,
        title: f.title,
      };
      return row;
    }),
  );
}
