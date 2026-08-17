export interface ClaimCheck {
  checkId: string;
}

export interface LieClaim {
  claim: string;
  checkIds: string[];
}

export interface LieClaimResult extends LieClaim {
  verified: boolean;
  failedIds: string[];
}

export const LIE_CLAIMS: LieClaim[] = [
  { claim: "Authentication added", checkIds: ["SEC-004", "SEC-011"] },
  { claim: "Database secured", checkIds: ["SEC-003", "SEC-002"] },
  { claim: "Payments integrated", checkIds: ["SEC-001", "SEC-012"] },
  { claim: "Tests written", checkIds: ["QUAL-001", "QUAL-012"] },
];

export interface LieDetectorResult {
  claims: LieClaimResult[];
  verifiedCount: number;
  total: number;
}

/**
 * A claim is contradicted when any mapped check that actually ran has failed.
 * Checks that are not in `ran` (stubs / not present in this scan) are ignored
 * so we never invent a contradiction from a check that did not execute.
 */
export function evaluateLieDetector(
  failingCheckIds: Iterable<string>,
  ranCheckIds: Iterable<string>,
  claims: LieClaim[] = LIE_CLAIMS,
): LieDetectorResult {
  const failing = new Set(failingCheckIds);
  const ran = new Set(ranCheckIds);

  const results: LieClaimResult[] = claims.map((claim) => {
    const applicable = claim.checkIds.filter((id) => ran.has(id));
    const failedIds = applicable.filter((id) => failing.has(id));
    return {
      ...claim,
      failedIds,
      verified: applicable.length > 0 && failedIds.length === 0,
    };
  }).filter((c) => c.checkIds.some((id) => ran.has(id)));

  const verifiedCount = results.filter((c) => c.verified).length;
  return {
    claims: results,
    verifiedCount,
    total: results.length,
  };
}
