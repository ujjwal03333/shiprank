/**
 * Asked vs shipped chips. Pure. No LLM.
 *
 * "Asked" is a stack-implied constraint already evidenced in the scanned
 * tree (supabase → RLS, stripe → webhooks, auth → auth, …). Never invent
 * asked from a universal pass. Vacuous / skipped / N/A / stub → omit.
 */

export type ShippedState = "present" | "missing";

export interface AskedChip {
  id: string;
  label: string;
  state: ShippedState;
}

export interface ChipEvidence {
  checkId: string;
  passed: boolean;
  title: string;
  applicable?: boolean;
  confidence?: number;
}

const MAX_CHIPS = 5;

function lookup(rows: readonly ChipEvidence[], checkId: string): ChipEvidence | undefined {
  return rows.find((r) => r.checkId === checkId);
}

function isVacuous(row: ChipEvidence): boolean {
  if (row.applicable === false) return true;
  if (row.confidence === 0) return true;
  const title = row.title.toLowerCase();
  if (title.includes("skipped")) return true;
  if (title.includes("not required")) return true;
  if (/\bn\/a\b/.test(title)) return true;
  if (row.passed && /no supabase migrations found/i.test(row.title)) return true;
  return false;
}

function shippedFromCheck(row: ChipEvidence | undefined): ShippedState | null {
  if (!row || isVacuous(row)) return null;
  return row.passed ? "present" : "missing";
}

function webhooksState(row: ChipEvidence | undefined): ShippedState | null {
  if (!row || isVacuous(row)) return null;
  // Payment stack was detected (otherwise the check is skipped). No
  // webhook route means the implied constraint is not in the tree.
  if (/no webhook routes found/i.test(row.title)) return "missing";
  return row.passed ? "present" : "missing";
}

/**
 * Deterministic. Same evidence rows (same repo + same check version) → same chips.
 * Order is fixed. At most 5. Unknown / vacuous rows are omitted.
 */
export function askedChipsFromEvidence(rows: readonly ChipEvidence[]): AskedChip[] {
  const auth = shippedFromCheck(lookup(rows, "SEC-004"));
  const rls = shippedFromCheck(lookup(rows, "SEC-003"));
  const webhooks = webhooksState(lookup(rows, "SEC-012"));
  const deleteMyData = shippedFromCheck(lookup(rows, "COMP-004"));

  const stackAsked = auth != null || rls != null || webhooks != null || deleteMyData != null;
  const secretsRow = lookup(rows, "SEC-001");
  let secrets: ShippedState | null = null;
  if (secretsRow && !isVacuous(secretsRow)) {
    if (!secretsRow.passed) {
      // A failing secrets check is evidence the tree had secrets to get wrong.
      secrets = "missing";
    } else if (stackAsked) {
      secrets = "present";
    }
  }

  const chips: AskedChip[] = [];
  if (auth != null) chips.push({ id: "auth", label: "Auth", state: auth });
  if (rls != null) chips.push({ id: "rls", label: "RLS", state: rls });
  if (webhooks != null) chips.push({ id: "webhooks", label: "Webhooks", state: webhooks });
  if (deleteMyData != null) {
    chips.push({ id: "delete-my-data", label: "Delete-my-data", state: deleteMyData });
  }
  if (secrets != null) {
    chips.push({ id: "public-secrets", label: "Public secrets", state: secrets });
  }
  return chips.slice(0, MAX_CHIPS);
}
