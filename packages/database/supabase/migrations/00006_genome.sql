-- ShipRank migration 00006 — vulnerability genome (schema + query substrate)
-- Fail-frequency per check_id, grouped by detected platform and by detected
-- model. Feeds future model-signature inference and monthly report-card
-- posts. No UI reads this yet — /api/genome is the only consumer.

-- ── 1. eligible scans ──────────────────────────────────────────────────────
-- Same eligibility rule as the leaderboard aggregate (Part 2): verified
-- provenance, above the Sybil floor (5 files / 200 lines), and deduped by
-- content_hash (first occurrence, by created_at, wins).
create or replace view eligible_scans_for_genome as
select distinct on (s.content_hash)
  s.id as scan_id,
  s.content_hash,
  s.provenance,
  coalesce((s.metadata->>'fileCount')::int, 0) as file_count,
  coalesce((s.metadata->>'lineCount')::int, 0) as line_count,
  s.created_at
from scans s
where s.provenance = 'verified'
  and s.content_hash is not null
  and coalesce((s.metadata->>'fileCount')::int, 0) >= 5
  and coalesce((s.metadata->>'lineCount')::int, 0) >= 200
order by s.content_hash, s.created_at asc;

-- ── 2. one row per (eligible scan x public check_result), platform/model attached ──
-- Deliberately unaggregated — the /api/genome route groups this both by
-- platform and by model in application code (mirrors how leaderboard-agg.ts
-- and velocity.ts keep aggregation in tested, pure TypeScript rather than
-- duplicating grouping logic across near-identical SQL views).
create or replace view check_genome_rows as
select
  cr.check_id,
  cr.passed,
  es.scan_id,
  coalesce(f.platform, 'unknown') as platform,
  coalesce(f.metadata->>'model', 'unknown') as model
from check_results cr
join station_results sr on sr.id = cr.station_result_id
join eligible_scans_for_genome es on es.scan_id = sr.scan_id
left join fingerprints f on f.scan_id = es.scan_id
where cr.visibility = 'public';

comment on view eligible_scans_for_genome is
  'Scans eligible for genome/aggregate analysis: verified provenance, above the Sybil floor, deduped by content_hash.';
comment on view check_genome_rows is
  'One row per eligible scan x public check result, with platform/model attached. Grouped by /api/genome, not here — keeps grouping logic in one tested place.';
