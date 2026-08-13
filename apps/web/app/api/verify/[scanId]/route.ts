import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  verifyAttestation,
  normalizeTimestamp,
} from "@/lib/attestation";

/**
 * GET /api/verify/[scanId]
 *
 * Recomputes the attestation HMAC from the stored columns and compares it
 * against the stored signature. Returns a public, tamper-evident summary.
 * The secret and the raw signature are NEVER included in the response.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const { scanId } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  const db = getServiceClient();
  const { data: scan, error } = await db
    .from("scans")
    .select(
      "id, content_hash, score, grade, attestation_signature, metadata, created_at, completed_at",
    )
    .eq("id", scanId)
    .maybeSingle();

  if (error || !scan) {
    return NextResponse.json(
      {
        error: "Scan not found",
        message:
          "No scan matches that id. Double-check the URL, or run a new scan with `npx shiprank ./your-project --upload`.",
      },
      { status: 404 },
    );
  }

  const metadata = (scan.metadata ?? {}) as Record<string, unknown>;
  const checkVersion = (metadata["checkVersion"] as string) ?? "1.0.0";
  const contentHash = scan.content_hash as string | null;
  const overall = scan.score as number | null;
  const createdAt = scan.created_at as string;
  const signature = scan.attestation_signature as string | null;

  const verified =
    contentHash != null &&
    overall != null &&
    verifyAttestation(
      {
        scanId: scan.id as string,
        contentHash,
        overall,
        checkVersion,
        createdAtIso: normalizeTimestamp(createdAt),
      },
      signature,
    );

  return NextResponse.json({
    scan_id: scan.id,
    content_hash: contentHash,
    overall,
    grade: scan.grade,
    check_version: checkVersion,
    scanned_at: scan.completed_at ?? scan.created_at,
    verified,
  });
}
