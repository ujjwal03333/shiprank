-- ShipRank migration 00005 — per-check results with visibility
-- The CLI upload path now stores individual check results (public + held-out).
-- The visibility flag lets held-out checks be stored without being scored or
-- shown, and makes public-vs-heldout divergence analysis (genome) a SQL query.

create type check_visibility as enum ('public', 'heldout');

alter table check_results
  add column if not exists visibility check_visibility not null default 'public';

create index if not exists idx_check_results_visibility on check_results(visibility);
create index if not exists idx_check_results_check_id on check_results(check_id);

comment on column check_results.visibility is
  'public = scored + shown; heldout = stored only, never scored or shown (see engine heldout.ts).';
