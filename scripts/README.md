# Production verify + seed prep

Do not auto-post. These scripts only hit the live host and print.

`CRON_SECRET` must match the Vercel env of that host. It bypasses the 3-dares-per-hour cap so a 10-repo seed can finish.

## 1. After deploy — verify the live host

```sh
cd ~/Desktop/shiprank

# Production (controlled Vercel host)
node scripts/verify-production.mjs --host https://shiprank-web-cqm7.vercel.app --secret "$CRON_SECRET"

# Local
node scripts/verify-production.mjs --host http://localhost:3000 --secret "$CRON_SECRET"
```

Exit 0 means:

- `NEXT_PUBLIC_APP_URL` is not shiprank.dev
- one Dare (`octocat/Hello-World`) completed
- `/s/[id]` has no header/footer
- OG PNG and `/api/card/[id]?size=og` are identical 1200×630

`--skip-dare` runs only the origin/health checks.

## 2. Seed prep (10 Cards, no posts)

```sh
cd ~/Desktop/shiprank
node scripts/seed-cards.mjs --host https://shiprank-web-cqm7.vercel.app --secret "$CRON_SECRET"

# Smoke one repo
node scripts/seed-cards.mjs --host https://shiprank-web-cqm7.vercel.app --secret "$CRON_SECRET" --limit 1
```

List lives in `scripts/seed-repos.json`. First entry is always `octocat/Hello-World`.

Stdout is copy-paste tweets plus `/s/[id]` Card URLs. Nothing is posted.

## Human blockers (scripts cannot fix)

1. Deploy this commit to Vercel (old deploy = `/dare` 404).
2. `NEXT_PUBLIC_APP_URL` on Vercel = host you control, never `https://shiprank.dev`.
3. Apply `packages/database/supabase/migrations/00011_scan_jobs.sql` in Supabase.
4. `SUPABASE_SERVICE_ROLE_KEY` is a JWT only (no trailing comment).
5. npm CLI `1.0.2` still uploads to the old host until you publish a new version. This repo’s CLI already points at the Vercel host.
