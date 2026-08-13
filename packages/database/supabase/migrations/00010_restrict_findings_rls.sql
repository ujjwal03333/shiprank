-- ShipRank migration 00010 — restrict public reads on findings tables
--
-- Problem: check_results, remediations, and fingerprints have
-- "for select using (true)" — anyone with the anon key can read every
-- row, including file paths, code snippets, and fix suggestions that
-- the API layer redacts for free-tier users. This bypasses the paywall.
--
-- Fix: restrict anon reads to only the columns/rows that are safe to
-- expose publicly. Rather than column-level security (Postgres doesn't
-- support it in RLS), we scope reads to rows belonging to scans whose
-- project is marked is_public=true. For all other rows, the service
-- role (used by API routes that apply plan gating) is still allowed.
--
-- This means:
--   - Leaderboard scans (public projects) remain queryable by the client
--   - Paywall-gated detail (file:line, snippets, fixes) for non-public
--     projects is only accessible through the API, which enforces plan gating

-- ── check_results ─────────────────────────────────────────────────────
drop policy if exists "check_results_public_read" on check_results;

create policy "check_results_public_read" on check_results
  for select using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from station_results sr
      join scans s on s.id = sr.scan_id
      join projects p on p.id = s.project_id
      where sr.id = check_results.station_result_id
        and p.is_public = true
    )
  );

-- ── remediations ──────────────────────────────────────────────────────
drop policy if exists "remediations_public_read" on remediations;

create policy "remediations_public_read" on remediations
  for select using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from scans s
      join projects p on p.id = s.project_id
      where s.id = remediations.scan_id
        and p.is_public = true
    )
  );

-- ── fingerprints ──────────────────────────────────────────────────────
drop policy if exists "fingerprints_public_read" on fingerprints;

create policy "fingerprints_public_read" on fingerprints
  for select using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from scans s
      join projects p on p.id = s.project_id
      where s.id = fingerprints.scan_id
        and p.is_public = true
    )
  );

-- ── projects_owner_write: add WITH CHECK to prevent owner_id spoofing ─
-- The original policy uses FOR ALL USING(...) without WITH CHECK, which
-- means an authenticated user can INSERT a row with any owner_id because
-- USING only checks the *resulting* row, not whether the caller is
-- allowed to claim that owner_id. Adding WITH CHECK ensures INSERTs and
-- UPDATEs can only set owner_id to the caller's own auth.uid().
drop policy if exists "projects_owner_write" on projects;

create policy "projects_owner_write" on projects
  for all
  using (
    auth.uid() = owner_id
    or auth.role() = 'service_role'
  )
  with check (
    auth.uid() = owner_id
    or auth.role() = 'service_role'
  );
