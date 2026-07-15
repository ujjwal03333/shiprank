-- ShipRank seed data
-- Inserts 3 sample projects, 3 scans, station results, and check results.
-- The leaderboard trigger fires automatically when a scan status is set to 'completed'.

-- ============================================================
-- PROJECTS
-- ============================================================
insert into projects (id, name, url, framework, platform) values
  ('11111111-1111-1111-1111-111111111111',
   'SaaSly Landing Page',
   'https://saasly-demo.vercel.app',
   'nextjs', 'lovable'),

  ('22222222-2222-2222-2222-222222222222',
   'BudgetBro Finance App',
   'https://budgetbro.app',
   'vite', 'bolt'),

  ('33333333-3333-3333-3333-333333333333',
   'DevDash Internal Tool',
   null,
   'nextjs', 'cursor');

-- ============================================================
-- SCANS (insert as 'pending' first, then update to 'completed' to fire trigger)
-- ============================================================
insert into scans (id, project_id, status, score, grade, station_count, check_count, issue_count, duration_ms, scan_mode, started_at) values
  ('aaaa1111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   'pending', null, null, 4, 32, 0, null, 'full', now() - interval '1 hour'),

  ('aaaa2222-2222-2222-2222-222222222222',
   '22222222-2222-2222-2222-222222222222',
   'pending', null, null, 4, 32, 0, null, 'full', now() - interval '30 minutes'),

  ('aaaa3333-3333-3333-3333-333333333333',
   '33333333-3333-3333-3333-333333333333',
   'pending', null, null, 4, 32, 0, null, 'full', now() - interval '10 minutes');

-- ============================================================
-- STATION RESULTS
-- ============================================================

-- SaaSly (scan aaaa1111): decent overall, weak security
insert into station_results (id, scan_id, station, score, grade, pass_count, warn_count, fail_count) values
  ('bb110001-0001-0001-0001-000000000001', 'aaaa1111-1111-1111-1111-111111111111', 'security',      55, 'D', 6, 2, 4),
  ('bb110001-0001-0001-0001-000000000002', 'aaaa1111-1111-1111-1111-111111111111', 'accessibility',  82, 'B', 5, 1, 0),
  ('bb110001-0001-0001-0001-000000000003', 'aaaa1111-1111-1111-1111-111111111111', 'performance',    74, 'C', 4, 1, 1),
  ('bb110001-0001-0001-0001-000000000004', 'aaaa1111-1111-1111-1111-111111111111', 'growth',         90, 'A', 7, 1, 0);

-- BudgetBro (scan aaaa2222): strong security, weak a11y
insert into station_results (id, scan_id, station, score, grade, pass_count, warn_count, fail_count) values
  ('bb220001-0001-0001-0001-000000000001', 'aaaa2222-2222-2222-2222-222222222222', 'security',      88, 'A', 10, 1, 1),
  ('bb220001-0001-0001-0001-000000000002', 'aaaa2222-2222-2222-2222-222222222222', 'accessibility',  42, 'F', 2, 1, 3),
  ('bb220001-0001-0001-0001-000000000003', 'aaaa2222-2222-2222-2222-222222222222', 'performance',    65, 'C', 3, 2, 1),
  ('bb220001-0001-0001-0001-000000000004', 'aaaa2222-2222-2222-2222-222222222222', 'growth',         70, 'C', 5, 2, 1);

-- DevDash (scan aaaa3333): strong across the board
insert into station_results (id, scan_id, station, score, grade, pass_count, warn_count, fail_count) values
  ('bb330001-0001-0001-0001-000000000001', 'aaaa3333-3333-3333-3333-333333333333', 'security',      92, 'A', 11, 1, 0),
  ('bb330001-0001-0001-0001-000000000002', 'aaaa3333-3333-3333-3333-333333333333', 'accessibility',  88, 'A', 5, 1, 0),
  ('bb330001-0001-0001-0001-000000000003', 'aaaa3333-3333-3333-3333-333333333333', 'performance',    85, 'B', 5, 1, 0),
  ('bb330001-0001-0001-0001-000000000004', 'aaaa3333-3333-3333-3333-333333333333', 'growth',         78, 'B', 6, 1, 1);

-- ============================================================
-- CHECK RESULTS (sample — a few per station to show variety)
-- ============================================================

-- SaaSly security checks (station bb110001-...-0001)
insert into check_results (station_result_id, check_id, title, severity, passed, score_impact, fix_suggestion) values
  ('bb110001-0001-0001-0001-000000000001', 'SEC-001', 'Supabase anon key in client code', 'info', true, 0,
   'Anon keys are designed to be public — no action needed.'),
  ('bb110001-0001-0001-0001-000000000001', 'SEC-002', 'Supabase service_role key exposed', 'critical', false, -25,
   'Move the service_role key to a server-only environment variable. Never import it in client bundles.'),
  ('bb110001-0001-0001-0001-000000000001', 'SEC-003', 'No RLS policies on "profiles" table', 'high', false, -10,
   'Add a SELECT policy restricting reads to the row owner: auth.uid() = user_id'),
  ('bb110001-0001-0001-0001-000000000001', 'SEC-004', 'Missing Content-Security-Policy header', 'medium', false, -5,
   'Add a CSP header in next.config.ts or middleware.ts.'),
  ('bb110001-0001-0001-0001-000000000001', 'SEC-005', 'HTTPS enforced', 'high', true, 0, null);

-- SaaSly a11y checks (station bb110001-...-0002)
insert into check_results (station_result_id, check_id, title, severity, passed, score_impact, fix_suggestion) values
  ('bb110001-0001-0001-0001-000000000002', 'A11Y-001', 'Images have alt text', 'medium', true, 0, null),
  ('bb110001-0001-0001-0001-000000000002', 'A11Y-002', 'Color contrast ratio >= 4.5:1', 'high', true, 0, null),
  ('bb110001-0001-0001-0001-000000000002', 'A11Y-003', 'Form inputs have labels', 'high', true, 0, null),
  ('bb110001-0001-0001-0001-000000000002', 'A11Y-004', 'Skip-to-content link present', 'low', false, -8,
   'Add a visually-hidden skip link as the first focusable element in <body>.');

-- BudgetBro security check (station bb220001-...-0001)
insert into check_results (station_result_id, check_id, title, severity, passed, score_impact, fix_suggestion) values
  ('bb220001-0001-0001-0001-000000000001', 'SEC-001', 'Supabase anon key in client code', 'info', true, 0, null),
  ('bb220001-0001-0001-0001-000000000001', 'SEC-002', 'Supabase service_role key exposed', 'critical', true, 0, null),
  ('bb220001-0001-0001-0001-000000000001', 'SEC-006', 'API rate limiting configured', 'medium', false, -6,
   'Add rate limiting middleware using Upstash Redis or similar.');

-- ============================================================
-- REMEDIATIONS (auto-generated from failed checks)
-- ============================================================
insert into remediations (scan_id, title, description, effort, impact, roi_score, category, auto_fixable) values
  ('aaaa1111-1111-1111-1111-111111111111',
   'Remove exposed service_role key',
   'The Supabase service_role key is imported in client-side code. Move it to a server-only env var.',
   'trivial', 'critical', 98, 'security', false),

  ('aaaa1111-1111-1111-1111-111111111111',
   'Add RLS policy to profiles table',
   'The profiles table has no RLS policies. Add owner-based read/write policies.',
   'small', 'high', 85, 'security', true),

  ('aaaa1111-1111-1111-1111-111111111111',
   'Add Content-Security-Policy header',
   'No CSP header found. Add one to next.config.ts headers() or middleware.',
   'small', 'medium', 65, 'security', true),

  ('aaaa1111-1111-1111-1111-111111111111',
   'Add skip-to-content link',
   'Missing a skip navigation link for keyboard users.',
   'trivial', 'low', 50, 'accessibility', true);

-- ============================================================
-- FINGERPRINTS
-- ============================================================
insert into fingerprints (scan_id, platform, confidence, signals) values
  ('aaaa1111-1111-1111-1111-111111111111', 'lovable', 0.95,
   '["lovable.config.ts present", "lovable-tagger in package.json", "GPT-generated component comments"]'::jsonb),
  ('aaaa2222-2222-2222-2222-222222222222', 'bolt', 0.82,
   '["bolt.config.json present", ".bolt directory", "bolt CLI in devDependencies"]'::jsonb),
  ('aaaa3333-3333-3333-3333-333333333333', 'cursor', 0.70,
   '[".cursorrules file present", "cursor-specific .gitignore patterns"]'::jsonb);

-- ============================================================
-- AGENTS.MD OUTPUTS
-- ============================================================
insert into agents_md_outputs (scan_id, content, rule_count) values
  ('aaaa1111-1111-1111-1111-111111111111',
   E'# AGENTS.MD — ShipRank rules for SaaSly Landing Page\n\n## Security\n- NEVER import the Supabase service_role key in client code. Use server-only env vars.\n- ALWAYS add RLS policies when creating a new table.\n- ALWAYS set Content-Security-Policy headers.\n\n## Accessibility\n- ALWAYS include a skip-to-content link as the first focusable element.',
   4);

-- ============================================================
-- NOW UPDATE SCANS TO 'completed' → TRIGGERS LEADERBOARD UPSERT
-- ============================================================
update scans set status = 'completed', score = 75, grade = 'C',
  issue_count = 5, duration_ms = 3200, completed_at = now() - interval '59 minutes'
  where id = 'aaaa1111-1111-1111-1111-111111111111';

update scans set status = 'completed', score = 66, grade = 'C',
  issue_count = 4, duration_ms = 2800, completed_at = now() - interval '29 minutes'
  where id = 'aaaa2222-2222-2222-2222-222222222222';

update scans set status = 'completed', score = 86, grade = 'A',
  issue_count = 1, duration_ms = 4100, completed_at = now() - interval '9 minutes'
  where id = 'aaaa3333-3333-3333-3333-333333333333';
