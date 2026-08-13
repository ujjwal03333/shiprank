-- ShipRank migration 00009 — project history visibility
-- Governs /project/[id]/history (Part 10). Applied at the project level
-- (not per-scan) so a history timeline is never a patchwork of visible and
-- hidden points for the same project — the whole history is public or not.

alter table projects
  add column if not exists is_public boolean not null default false;

create index if not exists idx_projects_is_public on projects(is_public) where is_public;

comment on column projects.is_public is
  'When true, /project/[id]/history is visible to anyone. Otherwise only the Monitor-tier subscription that owns the monitored_projects row for this project can view it.';
