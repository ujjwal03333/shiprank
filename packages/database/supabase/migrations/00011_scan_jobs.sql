-- ShipRank migration 00011 — Dare Board scan jobs
-- Public GitHub URL → clone → scan → leaderboard. Status is the job
-- lifecycle; progress_stage is the user-facing step string.

create type scan_job_status as enum (
  'queued',
  'cloning',
  'scanning',
  'complete',
  'failed'
);

create table scan_jobs (
  id              uuid primary key default gen_random_uuid(),
  repo_url        text not null,
  status          scan_job_status not null default 'queued',
  progress_stage  text,
  progress        jsonb not null default '{}',
  scan_id         uuid references scans(id) on delete set null,
  error_message   text,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index idx_scan_jobs_status on scan_jobs(status);
create index idx_scan_jobs_created on scan_jobs(created_at desc);

alter table scan_jobs enable row level security;

-- Public can read a job they have the id for (progress page). Writes are
-- service-role only.
create policy scan_jobs_public_read on scan_jobs
  for select using (true);

comment on table scan_jobs is
  'Dare Board jobs: clone a public GitHub repo, run the engine, never execute cloned code.';
