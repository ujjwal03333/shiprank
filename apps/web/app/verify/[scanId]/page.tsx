import type { Metadata } from "next";
import Link from "next/link";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { verifyAttestation, normalizeTimestamp } from "@/lib/attestation";

export const metadata: Metadata = {
  title: "Verify scan",
  description: "Verify the authenticity of a ShipRank scan attestation.",
};

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <p className="font-body text-ink-muted">
          Verification unavailable — database not configured.
        </p>
      </Shell>
    );
  }

  const db = getServiceClient();
  const { data: scan } = await db
    .from("scans")
    .select(
      "id, content_hash, score, grade, attestation_signature, metadata, created_at, completed_at, projects(name)",
    )
    .eq("id", scanId)
    .maybeSingle();

  if (!scan) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <StatusDot ok={false} />
          <h1 className="font-display text-2xl text-ink">Scan not found</h1>
          <p className="max-w-sm font-body text-sm text-ink-muted">
            No scan matches that id. It may have been removed, or the link is wrong.
          </p>
        </div>
      </Shell>
    );
  }

  const metadata = (scan.metadata ?? {}) as Record<string, unknown>;
  const checkVersion = (metadata["checkVersion"] as string) ?? "1.0.0";
  const contentHash = scan.content_hash as string | null;
  const overall = scan.score as number | null;

  const verified =
    contentHash != null &&
    overall != null &&
    verifyAttestation(
      {
        scanId: scan.id as string,
        contentHash,
        overall,
        checkVersion,
        createdAtIso: normalizeTimestamp(scan.created_at as string),
      },
      scan.attestation_signature as string | null,
    );

  const project = scan.projects as { name?: string } | null;
  const scannedAt = (scan.completed_at as string | null) ?? (scan.created_at as string);

  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 text-center">
        <StatusDot ok={verified} />
        <h1 className="font-display text-3xl text-ink">
          {verified ? "Attestation verified" : "Not verified"}
        </h1>
        <p className="max-w-md font-body text-sm text-ink-muted">
          {verified
            ? "This scan's score and file-tree hash match a signature issued by ShipRank. It has not been altered since it was recorded."
            : "The stored signature does not match this scan's recorded values, or the scan was recorded before attestations were enabled."}
        </p>
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
        <Row label="Project" value={project?.name ?? "—"} />
        <Row label="Score" value={overall != null ? `${overall} (${scan.grade})` : "—"} />
        <Row
          label="Content hash"
          value={contentHash ? `${contentHash.slice(0, 20)}…` : "—"}
          mono
        />
        <Row label="Check version" value={checkVersion} mono />
        <Row label="Scanned" value={new Date(scannedAt).toLocaleString()} />
      </dl>

      <div className="mt-6 flex justify-center">
        <Link
          href={`/scan/${scan.id}`}
          className="font-body text-sm text-brand transition-colors hover:text-brand-hover"
        >
          View the full report →
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-6 py-20">{children}</div>;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`grid size-14 place-items-center rounded-full ${
        ok ? "bg-success-soft" : "bg-danger-soft"
      }`}
    >
      <span
        className={`font-mono text-2xl ${ok ? "text-success-ink" : "text-danger-ink"}`}
      >
        {ok ? "✓" : "✕"}
      </span>
    </span>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-surface px-4 py-3">
      <dt className="font-body text-sm text-ink-muted">{label}</dt>
      <dd className={`text-sm text-ink ${mono ? "font-mono text-xs" : "font-body"}`}>
        {value}
      </dd>
    </div>
  );
}
