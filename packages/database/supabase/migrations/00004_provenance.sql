-- ShipRank migration 00004 — provenance tiers + Sybil-resistance fields
-- provenance: how much we trust a scan's origin.
-- The leaderboard trigger is extended to carry the fields the aggregate
-- (averages) needs: provenance, content_hash, file_count, line_count.

-- ── 1. provenance on scans ────────────────────────────────────────────────
create type provenance_tier as enum ('seed', 'self-reported', 'verified');

alter table scans
  add column if not exists provenance provenance_tier not null default 'self-reported';

-- Backfill: CLI uploads are verified; all other pre-existing rows are seed data.
update scans set provenance = 'verified'
  where scan_mode = 'cli-upload' or metadata->>'source' = 'cli-upload';
update scans set provenance = 'seed'
  where scan_mode <> 'cli-upload'
    and coalesce(metadata->>'source', '') <> 'cli-upload';

create index if not exists idx_scans_provenance on scans(provenance);

-- ── 2. denormalized Sybil fields on leaderboard_entries ───────────────────
alter table leaderboard_entries
  add column if not exists provenance   provenance_tier not null default 'self-reported',
  add column if not exists content_hash text,
  add column if not exists file_count   integer not null default 0,
  add column if not exists line_count   integer not null default 0;

-- ── 3. extend the leaderboard upsert trigger to carry the new fields ──────
create or replace function upsert_leaderboard_on_scan_complete()
returns trigger as $$
begin
  if NEW.status = 'completed' and NEW.score is not null then
    insert into leaderboard_entries (
      project_id, scan_id, project_name, platform, framework,
      score, grade, url, station_scores, scanned_at,
      provenance, content_hash, file_count, line_count
    )
    select
      p.id, NEW.id, p.name, p.platform, p.framework,
      NEW.score, NEW.grade, p.url,
      coalesce(
        (select jsonb_object_agg(sr.station, sr.score)
         from station_results sr where sr.scan_id = NEW.id),
        '{}'::jsonb
      ),
      coalesce(NEW.completed_at, now()),
      NEW.provenance,
      NEW.content_hash,
      coalesce((NEW.metadata->>'fileCount')::int, 0),
      coalesce((NEW.metadata->>'lineCount')::int, 0)
    from projects p
    where p.id = NEW.project_id
    on conflict (project_id) do update set
      scan_id        = excluded.scan_id,
      project_name   = excluded.project_name,
      platform       = excluded.platform,
      framework      = excluded.framework,
      score          = excluded.score,
      grade          = excluded.grade,
      url            = excluded.url,
      station_scores = excluded.station_scores,
      scanned_at     = excluded.scanned_at,
      provenance     = excluded.provenance,
      content_hash   = excluded.content_hash,
      file_count     = excluded.file_count,
      line_count     = excluded.line_count,
      created_at     = now();
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- ── 4. backfill leaderboard_entries from the scans they point at ──────────
update leaderboard_entries le set
  provenance   = s.provenance,
  content_hash = s.content_hash,
  file_count   = coalesce((s.metadata->>'fileCount')::int, 0),
  line_count   = coalesce((s.metadata->>'lineCount')::int, 0)
from scans s
where le.scan_id = s.id;
