# ShipRank

The finishing service for AI-built software.

> Give me what your AI built. I'll give it back finished.

## Ship License on GitHub

Paste this as `.github/workflows/ship-license.yml`. Hold exits 1. Licensed is a notice with the grade. A printed Card URL is added to the job summary. Host is the CLI default, `https://shiprank-web-cqm7.vercel.app`.

```yaml
name: Ship License
on:
  pull_request:
  push:
jobs:
  ship-license:
    name: Ship License
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Ship License
        run: npx --yes shiprank
```

## Structure

- `apps/web` — Next.js 14+ App Router marketing/dashboard site (Tailwind v4, warm-light theme)
- `packages/ui` — shared design tokens (`@shiprank/ui/tokens.css`) and small utilities
- `packages/config-typescript` — shared strict `tsconfig.json` bases

## Develop

```sh
pnpm install
pnpm dev
```

## Deploy (Vercel)

Root Directory **must** be `apps/web`. The `vercel.json` there installs and builds from the monorepo root.

Required env (Project → Settings → Environment Variables), JWT only — no comments:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (the live `https://….vercel.app` or your domain)

Optional: `ANTHROPIC_API_KEY`, `UPSTASH_*`, `ATTESTATION_SECRET`, `STRIPE_*`, `RESEND_API_KEY`, `CRON_SECRET`, `GITHUB_TOKEN`.

Apply `packages/database/supabase/migrations/00011_scan_jobs.sql` in the Supabase SQL editor before using Dare in production.

```sh
cd ~/Desktop/shiprank
pnpm turbo run build --filter=@shiprank/web   # must pass locally
git push                                       # then Vercel deploys main
```
