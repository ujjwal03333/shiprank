import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-side scan attestation.
 *
 * The signature is an HMAC-SHA256 over a fixed canonical string, keyed by the
 * server-only ATTESTATION_SECRET. It proves the server processed exactly these
 * values (scan id, content hash, score, check version, timestamp) and that they
 * have not been altered in storage since. The verify endpoint recomputes the
 * HMAC from the stored columns and compares — no secret or raw signature is
 * ever returned to a client.
 *
 * The secret is NEVER read or logged here beyond being passed to the HMAC.
 */
export interface AttestationInput {
  scanId: string;
  contentHash: string;
  overall: number;
  checkVersion: string;
  createdAtIso: string;
}

function canonicalString(input: AttestationInput): string {
  return [
    input.scanId,
    input.contentHash,
    input.overall,
    input.checkVersion,
    input.createdAtIso,
  ].join("|");
}

/** Normalize a stored timestamp so sign and verify always agree on its form. */
export function normalizeTimestamp(value: string): string {
  return new Date(value).toISOString();
}

export function attestationSecretConfigured(): boolean {
  return !!process.env["ATTESTATION_SECRET"];
}

export function signAttestation(
  input: AttestationInput,
  secret: string | undefined = process.env["ATTESTATION_SECRET"],
): string {
  if (!secret) throw new Error("ATTESTATION_SECRET not configured");
  return createHmac("sha256", secret).update(canonicalString(input)).digest("hex");
}

export function verifyAttestation(
  input: AttestationInput,
  signature: string | null | undefined,
  secret: string | undefined = process.env["ATTESTATION_SECRET"],
): boolean {
  if (!signature || !secret) return false;
  let expected: string;
  try {
    expected = signAttestation(input, secret);
  } catch {
    return false;
  }
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== actualBuf.length || expectedBuf.length === 0) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}
