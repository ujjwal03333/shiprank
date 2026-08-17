# ShipRank

The finishing service for AI-built software. Compile a loose prompt into a ship-ready spec, scan the resulting codebase across 9 stations, and rank it on a public leaderboard.

Positioning: *Give me what your AI built. I'll give it back finished.*

Live CLI homepage currently points at `https://shiprank-web-cqm7.vercel.app`. Uploads target `https://shiprank.dev/api/scan`.

## Product loop

1. **Compile** — `npx shiprank compile "<prompt>"` or `POST /api/compile`. Claude rewrites a vibe prompt into STACK / BUILD / CONSTRAINTS / OUTPUT. Constraints are injected from a stack-aware catalog in `@shiprank/compile`, not trusted from the model.
2. **Scan** — `npx shiprank [dir]` profiles the tree, runs the check suite, fingerprints the AI platform, and builds a remediation plan. Same engine powers the CLI, the MCP server, and web ingestion.
3. **Rank** — `--upload` posts a compact payload to `/api/scan`. The web app stores the scan, signs an attestation, and updates the leaderboard.

Paid plans: **free** (titles + pass/fail only), **pro** (file/line, snippet, fix prompt), **monitor** (hourly rescans + regression email). Gating is a pure function in `apps/web/lib/plan-gating.ts`.

## Monorepo

pnpm workspaces + Turborepo. Node `>=20`. Package manager is pinned to `pnpm@9.15.0`.

```
apps/web                 @shiprank/web     Next.js App Router (marketing, reports, APIs)
packages/engine          @shiprank/engine  profiler, checks, fingerprint, remediation, AGENTS.md
packages/cli             shiprank          published CLI (`npx shiprank`)
packages/compile         @shiprank/compile prompt compiler + stack constraints
packages/database        @shiprank/database Supabase SQL + shared TS types
packages/mcp             @shiprank/mcp     MCP tools wrapping the engine
packages/ui              @shiprank/ui      design tokens (only color/type/space source)
packages/config-typescript @shiprank/tsconfig  strict tsconfig bases
```

There is **one** implementation of “what counts as a finding”: `@shiprank/engine`. CLI, MCP, and web must not reimplement checks.

## Commands

```sh
pnpm install
pnpm dev                          # turbo: web on :3000
pnpm test                         # all packages
pnpm typecheck
pnpm lint
pnpm --filter @shiprank/engine test
pnpm --filter @shiprank/web test
pnpm --filter shiprank test       # CLI
pnpm --filter @shiprank/mcp test
pnpm --filter @shiprank/compile test
```

Filter a single package with `pnpm --filter <name> <script>`. Web package name is `@shiprank/web`, CLI package name is `shiprank`.

Copy `.env.example` → `apps/web/.env.local`. Never commit real secrets. `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public by design — do not treat them as leaks (this is also SEC-001 policy).

## Scan pipeline

`packages/cli/src/scanner.ts` is the reference orchestration:

1. `buildCodeProfile(root)` — walk the tree (skip `node_modules`, `.next`, `dist`, `.git`, …; first 500 lines of each text file).
2. `runChecks(profile)` — public checks only.
3. `runHeldoutChecks(profile)` — stored, never scored, never shown on `/methodology`.
4. `overallScore(stations)` — unweighted mean of the 9 station scores.
5. `scoreToGrade(score)` from `@shiprank/database` — A+ ≥97, A ≥85, B ≥70, C ≥55, D ≥40, else F.
6. `buildFingerprint(profile)` — platform (`cursor` | `bolt` | `lovable` | `replit` | `v0` | `base44` | `claude-code` | `unknown`), model inference, AI-commit ratio (null if no git history — never fabricate).
7. `buildRemediationPlan(stations)` + `generateAgentsMd(...)`.
8. `computeContentHash(files)` — deterministic sha-256 of the scanned tree.

`--ci --threshold <n>` exits 1 if score < n (default 60). `--rules` prints AGENTS.md / `.cursorrules`. `--json` dumps the full report.

## Check engine

Checks are **pure functions** `(profile: CodeProfile) => CheckResult`. No filesystem or network I/O inside a check. Tests construct a `CodeProfile` inline.

| Station (engine) | DB enum          | ID prefix | File |
|---|---|---|---|
| security | security | SEC- | `checks/security.ts` |
| accessibility | accessibility | A11Y- | `checks/accessibility.ts` |
| performance | performance | PERF- | `checks/performance.ts` |
| growth | growth | SEO- | `checks/growth.ts` |
| quality | **code_quality** | QUAL- | `checks/quality.ts` |
| architecture | architecture | ARCH- | `checks/architecture.ts` |
| data | data | DATA- | `checks/data.ts` |
| compliance | compliance | COMP- | `checks/compliance.ts` |
| infrastructure | **infra** | INFRA- | `checks/infrastructure.ts` |

The engine ↔ DB rename (`quality` → `code_quality`, `infrastructure` → `infra`) lives in `apps/web/lib/scan-ingester.ts` (`STATION_MAP`). Engine severity is `critical | warning | info`; DB severity is `critical | high | medium | low | info` (`warning` → `medium`).

Scoring (`checks/engine.ts`):

- `confidence === 0` means stub — excluded from scoring (treated as not implemented).
- Held-out checks are a separate registry and cannot enter `runChecks`.
- Station score = weighted share of passing implemented checks. Critical/warning weights scale up when the profile has payments, user data, or auth.
- Overall score = mean of station scores.

When adding a public check:

1. Implement it in the station file with the next ID in that prefix.
2. `confidence > 0` only when the heuristic is real. Keep stubs at 0.
3. Add a pure-function test in `packages/engine/src/__tests__/`.
4. Update the matching list on `apps/web/app/methodology/page.tsx`. That page is the public contract — it must not drift from the check IDs/titles.
5. Do **not** put held-out patterns on `/methodology` or any user-facing surface. Held-out checks exist to measure gaming of the public suite.

`SUPABASE_ANON_KEY` must never be flagged as a secret.

## Web app (`apps/web`)

Next.js App Router, Tailwind v4, React 19. Theme tokens come from `@shiprank/ui/tokens.css` — do not hardcode hex in components (`bg-brand`, `text-ink`, `bg-canvas`, …).

Notable routes:

- `/` marketing (ISR `revalidate = 60` so hero proof stats stay live)
- `/scan/[id]` report
- `/leaderboard` `/pricing` `/methodology` `/dashboard`
- `/verify/[scanId]` public attestation
- `/project/[id]/history` score history (Monitor)

API:

- `POST /api/scan` CLI upload (Zod, IP rate limit, ingest)
- `GET /api/scan/[id]` report payload
- `POST /api/compile` + `POST /api/compile/risk`
- `POST /api/checkout` Stripe
- `POST /api/webhook` Stripe webhooks
- `GET /api/badge/[scanId]` embeddable badge
- `GET /api/verify/[scanId]` recompute HMAC
- `GET /api/leaderboard` `/api/genome` `/api/monitor` `/api/account` `/api/attribute` `/api/report/[id]`
- `GET /api/cron/rescan` hourly Vercel cron (`CRON_SECRET`)

Supabase is used with the **service role** from the server (`apps/web/lib/supabase.ts`). RLS is on; public reads are for leaderboard-shaped data. Findings are plan-gated before they leave the API.

Vercel config lives in `apps/web/vercel.json` (monorepo: build/install `cd ../..`). Root directory on Vercel is `apps/web`. Cron: `0 * * * *` → `/api/cron/rescan`.

## Database

Migrations in `packages/database/supabase/migrations/` (ordered `00001`–`00010`). Apply with `pnpm --filter @shiprank/database migrate`. Shared types and `scoreToGrade()` are the public surface of `@shiprank/database`.

Core tables: `projects`, `scans`, `station_results`, `check_results`, `remediations`, `fingerprints`, `leaderboard_entries` (one row per project, latest scan wins), `agents_md_outputs`, plus later: attestations, provenance, genome rows, subscriptions, monitoring, visibility.

Ingestion is idempotent on `(project_name, scanned_at within 24h)`.

## Compile

`@shiprank/compile` calls Anthropic, then **replaces** the model’s CONSTRAINTS section with `renderConstraintBlock(...)` from `stack.ts` (universal + stack-specific + focus mode: `security` | `speed` | `scale`). Rate limit: 5/day per identifier (memory locally, Upstash in prod).

## MCP

`@shiprank/mcp` stdio server, no API key:

- `shiprank_scan(path)`
- `shiprank_check_diff(path, files)`
- `shiprank_get_rules(path)`

## TypeScript / tests

Strict TS everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Vitest for unit tests. Engine check tests must stay pure (no disk). Profiler tests use temp fixtures from `packages/engine/src/__tests__/setup-fixtures.ts`.

Prefer extending existing helpers (`pass` / `fail` / `stub` in check files, `makeProfile` in tests) over new abstractions.

## Do not

- Reimplement checks outside `@shiprank/engine`.
- Let held-out checks influence scoring or appear on `/methodology`.
- Hardcode design-token colors in components.
- Commit `.env`, `.env.local`, or real API keys.
- Flag `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as secrets.
- Invent an AI-commit ratio when `gitCommits` is null.
- Document or “fix” held-out patterns on public pages so models can train against them.
