-- ShipRank migration 00003 — signed scan attestations
-- Adds a deterministic content hash of the scanned file tree and an
-- HMAC-SHA256 attestation signature computed server-side at ingestion.

alter table scans
  add column if not exists content_hash          text,
  add column if not exists attestation_signature text;

comment on column scans.content_hash is
  'Deterministic sha-256 over the scanned file tree (see engine computeContentHash).';
comment on column scans.attestation_signature is
  'HMAC-SHA256 over scan_id|content_hash|overall|check_version|created_at_iso, keyed by ATTESTATION_SECRET. Recomputed by /api/verify.';
