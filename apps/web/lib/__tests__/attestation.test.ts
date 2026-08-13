import { describe, it, expect } from "vitest";
import {
  signAttestation,
  verifyAttestation,
  normalizeTimestamp,
  type AttestationInput,
} from "../attestation";

const SECRET = "test_secret_0123456789abcdef0123456789abcdef";

// A realistic scan attestation input.
const realScan: AttestationInput = {
  scanId: "8f2e1c4a-0000-4000-8000-00000000c41a",
  contentHash:
    "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
  overall: 86,
  checkVersion: "1.0.0",
  createdAtIso: normalizeTimestamp("2026-08-06T12:34:56.000Z"),
};

describe("attestation signature", () => {
  it("verifies for a genuine, untampered scan", () => {
    const sig = signAttestation(realScan, SECRET);
    expect(verifyAttestation(realScan, sig, SECRET)).toBe(true);
  });

  it("FAILS when the score is tampered", () => {
    const sig = signAttestation(realScan, SECRET);
    const tampered: AttestationInput = { ...realScan, overall: 99 };
    expect(verifyAttestation(tampered, sig, SECRET)).toBe(false);
  });

  it("FAILS when the content hash is tampered", () => {
    const sig = signAttestation(realScan, SECRET);
    const tampered: AttestationInput = {
      ...realScan,
      contentHash: "0".repeat(64),
    };
    expect(verifyAttestation(tampered, sig, SECRET)).toBe(false);
  });

  it("FAILS under a different secret", () => {
    const sig = signAttestation(realScan, SECRET);
    expect(verifyAttestation(realScan, sig, "some_other_secret")).toBe(false);
  });

  it("FAILS for a missing/empty signature", () => {
    expect(verifyAttestation(realScan, "", SECRET)).toBe(false);
    expect(verifyAttestation(realScan, null, SECRET)).toBe(false);
  });

  it("is deterministic (same input → same signature)", () => {
    expect(signAttestation(realScan, SECRET)).toBe(
      signAttestation(realScan, SECRET),
    );
  });

  it("normalizeTimestamp makes sign and verify agree regardless of PG format", () => {
    const stored = "2026-08-06 12:34:56+00"; // Postgres-style timestamptz
    const input = { ...realScan, createdAtIso: normalizeTimestamp(stored) };
    const sig = signAttestation(input, SECRET);
    // A reader re-normalizing the same stored value must verify.
    const reread = { ...realScan, createdAtIso: normalizeTimestamp(stored) };
    expect(verifyAttestation(reread, sig, SECRET)).toBe(true);
  });
});
