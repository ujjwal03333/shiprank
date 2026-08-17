# Your repo
https://github.com/ujjwal03333/shiprank

# The CLAUDE.md in the repo root already has project context
# Any AI tool that reads repo files will pick this up

This file is the **session handoff**. `CLAUDE.md` is durable architecture and conventions. This file is current HEAD, uncommitted work, and what to do next. Do not treat this as a design spec — treat it as “where we left the tree.”

Local checkout: `/Users/ujjwalsingh/Desktop/shiprank`  
Branch: `main` tracking `origin/main`  
HEAD: `6a3b53f` — *Fix skip-link visibility: Tailwind v4 uses clip-path (not clip) for sr-only*  
Last product dump on main: `2556ba4` — *WIP: UX quality pass phase 12.8, skip-link focus bug found*  
Backup bundle (2026-08-14): `~/Desktop/shiprank-backups/shiprank-full-backup-20260814-163901.bundle`

`CLAUDE.md` and this file are both **untracked**. They have not been committed or pushed.

---

## How to resume (new AI)

1. `cd /Users/ujjwalsingh/Desktop/shiprank`
2. Read `CLAUDE.md` first (engine, scoring, station-name mapping, held-out rules).
3. Then read this file.
4. `git status` / `git diff` — everything below is still in the working tree.
5. Do **not** commit unless the user asks. The tree is one unfinished quality pass, not a clean PR.
6. Single check implementation lives in `@shiprank/engine`. Do not fork that logic into the web app or CLI.

Suggested first command after reading:

```sh
pnpm --filter @shiprank/engine test && pnpm --filter @shiprank/web test
```

The new engine/web tests in this working tree have not been confirmed green in this session.

---

## What is already on `main` (committed)

Wave 1 through phase 12.8 is on `origin/main`:

- Turborepo + warm-light tokens (`@shiprank/ui`)
- Engine: profiler, 9-station check suite, fingerprint, remediation, AGENTS.md generator, held-out registry
- CLI (`npx shiprank`), compile (`@shiprank/compile`), MCP (`@shiprank/mcp`)
- Next.js app: marketing, scan report, leaderboard, pricing, methodology, dashboard, verify, history
- APIs: scan upload, compile, Stripe checkout/webhook, badge, genome, monitor, cron rescan, account
- Supabase migrations `00001`–`00010` (attestations, provenance, genome, subscriptions, monitoring, visibility, findings RLS)
- Vercel config in `apps/web/vercel.json` (root directory = `apps/web`)
- Skip-link focus fix for Tailwind v4 `sr-only` (`clip-path`, not `clip`)

Implemented (confidence > 0) vs stub (confidence 0, excluded from scoring):

| Station | Status on disk |
|---|---|
| security (SEC-) | implemented |
| accessibility (A11Y-) | implemented |
| performance (PERF-) | implemented |
| growth (SEO-) | implemented |
| quality (QUAL-) | implemented |
| architecture (ARCH-) | **still stubs** |
| data (DATA-) | **still stubs** |
| compliance (COMP-) | **still stubs** |
| infrastructure (INFRA-) | **still stubs** (WIP only extracted magic strings) |

---

## Uncommitted working tree (this is the live work)

29 modified + 12 untracked. Theme: **false-positive reduction, fail-open APIs, loading UX, check prevalence.** Not a new feature wave.

### Engine — check accuracy

- `checks/security.ts` — SEC-001 skips `profile.testFiles` (fixtures with fake secrets are not leaks). Magic `fixTime` strings extracted.
- `checks/quality.ts`
  - QUAL-002: a missing *root* `tsconfig.json` is not a fail if a nested `tsconfig*.json` exists (monorepo).
  - QUAL-009: ignore Next.js `page`/`layout` Server Components; count Supabase `{ error } = await …` + `if (error)` as handling.
  - QUAL-010: magic numbers are per-file, not cross-repo; ignore Tailwind tokens, labeled object values, labeled strings; more HTTP status codes in the safe set.
  - QUAL-011: function-start regex now sees TS-typed arrows and object-method shorthand (was inflating branches/fn).
- `checks/growth.ts` — SEO-002 accepts Next.js `metadata` / `generateMetadata` + `openGraph: {…}` (title/description/images or `opengraph-image.*` file convention), not only raw `<meta property="og:…">`.
- `checks/performance.ts` — PERF-002/005 skip test files; PERF-005 uses balanced-paren matching instead of a 400-char window.
- `checks/profile.ts` — read known dotfiles (`.gitignore` etc.; `path.extname` is `""` for those). Concatenate duplicate config basenames instead of last-write-wins.
- `checks/data.ts` / `infrastructure.ts` — stub bodies unchanged; magic time strings extracted to constants.
- `fingerprint/model.ts` — `HIGH_CONFIDENCE_THRESHOLD = 80` named constant.

New tests (untracked or extended):

- `packages/engine/src/__tests__/checks-quality.test.ts` (extended)
- `packages/engine/src/__tests__/checks-security.test.ts` (extended)
- `packages/engine/src/__tests__/checks-growth.test.ts` **new**
- `packages/engine/src/__tests__/checks-performance.test.ts` **new**
- `packages/engine/src/__tests__/profile-builder.test.ts` **new**

### Web — report + resilience

- `lib/check-prevalence.ts` **new** — fail% per check_id from `check_genome_rows`, hidden until `n >= 10`.
- `app/scan/[id]/page.tsx` — each failing finding shows “Fails in X% of scanned projects (n=…)”; share card now previews `/scan/[id]/opengraph-image`; scan URL input has `aria-label`.
- `app/leaderboard/loading.tsx` + `app/scan/[id]/loading.tsx` **new** — skeleton screens.
- Fail-open:
  - `api/account` — DB errors return the free-plan shape, never 500.
  - `api/badge/[scanId]` — catch → grey unknown badge, 500 + short cache.
  - `api/scan/[id]` — plan resolution failure → gate as `free` (redacted findings), still 200.
- `lib/format-names.ts` — `timeAgo` uses named second/minute/hour constants.
- `lib/monitoring.ts` — `ONE_DAY_MS`.
- Small a11y / QUAL-010 cleanups: `command-card`, `hero-command`, `leaderboard-table`, `page-loading-bar`, `score-gauge`, `site-nav`, `theme-toggle`, `layout`, `pricing`, `terms`.

New web tests (untracked):

- `lib/__tests__/check-prevalence.test.ts`
- `lib/__tests__/format-names.test.ts`
- `lib/__tests__/grade.test.ts`
- `lib/__tests__/provenance.test.ts`
- `lib/__tests__/scan-findings.test.ts`

### CLI / compile

- `packages/cli/src/bin.ts` — `main` split into `runCompileCommand` / `runScanCommand` (complexity / QUAL-011).
- `packages/compile/src/rate-limiter.ts` — Upstash import or `limit()` failure **fails open** (allow the request) rather than taking down compile.
- `packages/compile/src/prompt-score.ts` — `MAX_POINTS_PER_DIMENSION = 20`.

---

## Known gaps / next work

Do these in order unless the user redirects:

1. **Verify the working tree.** Run engine + web tests. Fix anything the new QUAL/SEO/PERF/SEC cases broke. Do not “simplify” the new heuristics without re-reading the comments — each one is a documented false-positive fix.
2. **Commit the quality pass** (if the user wants it) as one or two commits: engine+tests, then web/CLI/compile. Include `CLAUDE.md` only if they want durable AI context on GitHub.
3. **Implement stub stations** (ARCH / DATA / COMP / INFRA). Follow the `pass`/`fail`/`stub` pattern in `security.ts` / `quality.ts`. `confidence > 0` only when the heuristic is real. Update `/methodology` in the same change — that page is the public contract and already drifts (e.g. methodology lists SEO-001 as “title + meta description”; the engine’s SEO-001 is “Favicon present”).
4. **Do not** document held-out patterns on `/methodology` or in user-facing copy. `packages/engine/src/checks/heldout.ts` is scored nowhere and must stay that way.
5. Product leftovers after stubs: methodology drift pass, confirm Vercel + Stripe + cron against `.env.example`, consider implementing remaining INFRA/DATA checks that would score this repo itself.

---

## Invariants (repeat from CLAUDE.md — do not violate)

- One check suite: `@shiprank/engine`. CLI / MCP / web only wrap it.
- Engine station `quality` → DB `code_quality`. Engine `infrastructure` → DB `infra`. Map is `apps/web/lib/scan-ingester.ts` `STATION_MAP`.
- Engine severity `warning` → DB `medium`.
- `confidence === 0` → stub, not scored.
- Held-out checks never enter `runChecks` and never appear on `/methodology`.
- `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public. Never flag them as secrets (SEC-001).
- Tokens only from `@shiprank/ui/tokens.css`. No hardcoded hex in components.
- Never invent an AI-commit ratio when `gitCommits` is null.
- No real secrets in git. `.env.example` is the template.

---

## Prompt to paste into the next tool

```
Continue ShipRank from the local checkout at /Users/ujjwalsingh/Desktop/shiprank
(repo: https://github.com/ujjwal03333/shiprank).

Read CLAUDE.md, then SHIPRANK-CONTEXT-TRANSFER.md. The working tree is an
uncommitted quality pass on top of 6a3b53f — do not discard it.

First run the engine and web test suites. Then either (a) finish/commit
that pass if I ask, or (b) start implementing the stub stations
(architecture, data, compliance, infrastructure) using the existing
pass/fail/stub pattern.
```
