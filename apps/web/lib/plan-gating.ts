/**
 * Free vs. paid gating for scan findings. Pure — no I/O — so the redaction
 * rule is unit-testable independent of Stripe, Supabase, or auth headers.
 */
export type Plan = "free" | "pro" | "monitor";

export interface FindingRow {
  id: string;
  checkId: string;
  title: string;
  severity: string;
  passed: boolean;
  filePath: string | null;
  lineNumber: number | null;
  snippet: string | null;
  fixSuggestion: string | null;
  docsUrl: string | null;
}

export interface GatedFinding {
  id: string;
  checkId: string;
  title: string;
  severity: string;
  passed: boolean;
  filePath: string | null;
  lineNumber: number | null;
  snippet: string | null;
  fixSuggestion: string | null;
  docsUrl: string | null;
  upgradeRequired: boolean;
}

const FULL_ACCESS_PLANS: ReadonlySet<Plan> = new Set(["pro", "monitor"]);

/**
 * Free tier keeps title + severity + pass/fail (enough to know something is
 * wrong) but redacts the fields that would let a free user fix it without
 * paying: file:line evidence, code snippet, the fix prompt, and docs link.
 */
export function gateFindingsForPlan(
  findings: FindingRow[],
  plan: Plan,
): GatedFinding[] {
  const fullAccess = FULL_ACCESS_PLANS.has(plan);

  return findings.map((f) => {
    if (fullAccess) {
      return { ...f, upgradeRequired: false };
    }

    const hadRedactableContent =
      f.filePath != null ||
      f.lineNumber != null ||
      f.snippet != null ||
      f.fixSuggestion != null ||
      f.docsUrl != null;

    return {
      ...f,
      filePath: null,
      lineNumber: null,
      snippet: null,
      fixSuggestion: null,
      docsUrl: null,
      upgradeRequired: hadRedactableContent,
    };
  });
}
