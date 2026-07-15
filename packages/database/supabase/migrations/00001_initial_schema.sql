-- ShipRank initial schema
-- Every table has RLS enabled. Public read for leaderboard;
-- service-role write for scan ingestion.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "moddatetime"; -- auto-update updated_at

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type scan_status as enum ('pending', 'running', 'completed', 'failed');
create type severity as enum ('critical', 'high', 'medium', 'low', 'info');
create type grade as enum ('A+', 'A', 'B', 'C', 'D', 'F');
create type station_name as enum (
  'security',
  'accessibility',
  'performance',
  'growth',
  'code_quality',
  'architecture',
  'data',
  'compliance',
  'infra'
);

-- ============================================================
-- 1. PROJECTS
-- ============================================================
create table projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  url           text,                     -- deployed URL (nullable for local-only scans)
  repo_url      text,                     -- git remote
  framework     text,                     -- detected: "nextjs", "remix", "vite", etc.
  platform      text,                     -- detected AI platform: "lovable", "bolt", "cursor", etc.
  owner_id      uuid,                     -- FK to auth.users (nullable for anonymous scans)
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_projects_owner on projects(owner_id);
create index idx_projects_platform on projects(platform);

-- ============================================================
-- 2. SCANS
-- ============================================================
create table scans (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects(id) on delete cascade,
  status        scan_status not null default 'pending',
  score         smallint check (score >= 0 and score <= 100),
  grade         grade,
  station_count smallint not null default 0,
  check_count   smallint not null default 0,
  issue_count   smallint not null default 0,
  duration_ms   integer,
  scan_mode     text not null default 'full',  -- 'full' | 'quick' | 'ci'
  metadata      jsonb not null default '{}',
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_scans_project on scans(project_id);
create index idx_scans_status on scans(status);
create index idx_scans_score on scans(score desc nulls last);

-- ============================================================
-- 3. STATION RESULTS
-- ============================================================
create table station_results (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid not null references scans(id) on delete cascade,
  station       station_name not null,
  score         smallint not null check (score >= 0 and score <= 100),
  grade         grade not null,
  pass_count    smallint not null default 0,
  warn_count    smallint not null default 0,
  fail_count    smallint not null default 0,
  skip_count    smallint not null default 0,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),

  unique (scan_id, station)
);

create index idx_station_results_scan on station_results(scan_id);

-- ============================================================
-- 4. CHECK RESULTS
-- ============================================================
create table check_results (
  id              uuid primary key default gen_random_uuid(),
  station_result_id uuid not null references station_results(id) on delete cascade,
  check_id        text not null,              -- e.g. "SEC-001"
  title           text not null,
  description     text,
  severity        severity not null,
  passed          boolean not null,
  score_impact    smallint not null default 0, -- how much this check affected station score
  file_path       text,
  line_number     integer,
  snippet         text,
  fix_suggestion  text,
  docs_url        text,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index idx_check_results_station on check_results(station_result_id);
create index idx_check_results_severity on check_results(severity) where not passed;

-- ============================================================
-- 5. REMEDIATIONS
-- ============================================================
create table remediations (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  check_result_id uuid references check_results(id) on delete set null,
  title           text not null,
  description     text not null,
  effort          text not null,              -- "trivial" | "small" | "medium" | "large"
  impact          text not null,              -- "critical" | "high" | "medium" | "low"
  roi_score       smallint not null check (roi_score >= 0 and roi_score <= 100),
  category        text not null,              -- "security", "a11y", "perf", etc.
  auto_fixable    boolean not null default false,
  fix_diff        text,                       -- unified diff if auto-fixable
  applied         boolean not null default false,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index idx_remediations_scan on remediations(scan_id);
create index idx_remediations_roi on remediations(roi_score desc);

-- ============================================================
-- 6. FINGERPRINTS
-- ============================================================
create table fingerprints (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  platform        text not null,              -- "lovable", "bolt", "cursor", "v0", "replit", etc.
  confidence      real not null check (confidence >= 0 and confidence <= 1),
  signals         jsonb not null default '[]', -- array of matched signals
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),

  unique (scan_id, platform)
);

create index idx_fingerprints_scan on fingerprints(scan_id);
create index idx_fingerprints_platform on fingerprints(platform);

-- ============================================================
-- 7. LEADERBOARD ENTRIES (denormalized for fast reads)
-- ============================================================
create table leaderboard_entries (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  scan_id         uuid not null references scans(id) on delete cascade,
  project_name    text not null,
  platform        text,
  framework       text,
  score           smallint not null check (score >= 0 and score <= 100),
  grade           grade not null,
  url             text,
  station_scores  jsonb not null default '{}', -- { security: 80, accessibility: 90, ... }
  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),

  unique (project_id)  -- one leaderboard entry per project (latest scan wins)
);

create index idx_leaderboard_score on leaderboard_entries(score desc);
create index idx_leaderboard_platform on leaderboard_entries(platform);
create index idx_leaderboard_framework on leaderboard_entries(framework);

-- ============================================================
-- 8. AGENTS.MD OUTPUTS
-- ============================================================
create table agents_md_outputs (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references scans(id) on delete cascade,
  content         text not null,              -- the generated AGENTS.md / CLAUDE.md content
  rule_count      smallint not null default 0,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),

  unique (scan_id)
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGERS
-- ============================================================
create trigger projects_updated_at
  before update on projects
  for each row execute function moddatetime(updated_at);

create trigger scans_updated_at
  before update on scans
  for each row execute function moddatetime(updated_at);

-- ============================================================
-- TRIGGER: auto-update leaderboard when scan completes
-- ============================================================
create or replace function upsert_leaderboard_on_scan_complete()
returns trigger as $$
begin
  if NEW.status = 'completed' and NEW.score is not null then
    insert into leaderboard_entries (
      project_id, scan_id, project_name, platform, framework,
      score, grade, url, station_scores, scanned_at
    )
    select
      p.id,
      NEW.id,
      p.name,
      p.platform,
      p.framework,
      NEW.score,
      NEW.grade,
      p.url,
      coalesce(
        (select jsonb_object_agg(sr.station, sr.score)
         from station_results sr where sr.scan_id = NEW.id),
        '{}'::jsonb
      ),
      coalesce(NEW.completed_at, now())
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
      created_at     = now();
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_leaderboard_upsert
  after update on scans
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function upsert_leaderboard_on_scan_complete();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROJECTS: anyone can read, only service role / owner can write
alter table projects enable row level security;
create policy "projects_public_read" on projects
  for select using (true);
create policy "projects_owner_write" on projects
  for all using (
    auth.uid() = owner_id
    or auth.role() = 'service_role'
  );

-- SCANS: anyone can read, service role writes
alter table scans enable row level security;
create policy "scans_public_read" on scans
  for select using (true);
create policy "scans_service_write" on scans
  for all using (auth.role() = 'service_role');

-- STATION RESULTS: anyone can read, service role writes
alter table station_results enable row level security;
create policy "station_results_public_read" on station_results
  for select using (true);
create policy "station_results_service_write" on station_results
  for all using (auth.role() = 'service_role');

-- CHECK RESULTS: anyone can read, service role writes
alter table check_results enable row level security;
create policy "check_results_public_read" on check_results
  for select using (true);
create policy "check_results_service_write" on check_results
  for all using (auth.role() = 'service_role');

-- REMEDIATIONS: anyone can read, service role writes
alter table remediations enable row level security;
create policy "remediations_public_read" on remediations
  for select using (true);
create policy "remediations_service_write" on remediations
  for all using (auth.role() = 'service_role');

-- FINGERPRINTS: anyone can read, service role writes
alter table fingerprints enable row level security;
create policy "fingerprints_public_read" on fingerprints
  for select using (true);
create policy "fingerprints_service_write" on fingerprints
  for all using (auth.role() = 'service_role');

-- LEADERBOARD: anyone can read, trigger (security definer) writes
alter table leaderboard_entries enable row level security;
create policy "leaderboard_public_read" on leaderboard_entries
  for select using (true);
create policy "leaderboard_service_write" on leaderboard_entries
  for all using (auth.role() = 'service_role');

-- AGENTS.MD OUTPUTS: anyone can read, service role writes
alter table agents_md_outputs enable row level security;
create policy "agents_md_public_read" on agents_md_outputs
  for select using (true);
create policy "agents_md_service_write" on agents_md_outputs
  for all using (auth.role() = 'service_role');
