-- ShipRank migration 00008 — monitoring tier
-- monitored_projects: repos a Monitor-tier subscription has opted into
-- scheduled re-scanning for. Service-role only, same reasoning as
-- subscriptions (00007) — this table is billing-adjacent.

create table monitored_projects (
  id                uuid primary key default gen_random_uuid(),
  subscription_id   uuid not null references subscriptions(id) on delete cascade,
  project_id        uuid references projects(id) on delete set null,
  repo_url          text not null,
  scan_frequency    text not null default 'weekly',  -- 'daily' | 'weekly'
  last_scanned_at   timestamptz,
  next_scan_at      timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index idx_monitored_projects_next_scan on monitored_projects(next_scan_at);
create index idx_monitored_projects_subscription on monitored_projects(subscription_id);
create index idx_monitored_projects_project on monitored_projects(project_id);

alter table monitored_projects enable row level security;
create policy "monitored_projects_service_only" on monitored_projects
  for all using (auth.role() = 'service_role');

comment on table monitored_projects is
  'Repos a Monitor-tier subscription re-scans on a schedule. next_scan_at is polled by /api/cron/rescan (Vercel Cron).';
