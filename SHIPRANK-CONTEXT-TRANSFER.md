# SHIPRANK-CONTEXT-TRANSFER.md
Compressed brain for the next AI. Read this first, then `CLAUDE.md`, then one spec.

```
Repo:     https://github.com/ujjwal03333/shiprank
Local:    ~/Desktop/shiprank
Branch:   main
Commits:  9b37287 (pushed) — Dare, legal, archaeology, models
          465ef41 (may still be local) — decisionContext field, lie-detector IDs, share tweet
```

# The CLAUDE.md in the repo root already has project context
# Any AI tool that reads repo files will pick this up

---

## What this product is

ShipRank is a **finishing service for AI-built software**: compile a loose prompt, scan the tree with a deterministic check engine, rank on a leaderboard.

Positioning: *Give me what your AI built. I'll give it back finished.*

It is **not** Lovable (create the app) and **not** CodeRabbit (review the PR). It is a post-hoc judge + optional MCP verifier. That is a weaker default wedge than sitting in the editor or the PR. See competitive notes below.

---

## What's built (evidence, not vibes)

**Monorepo:** pnpm + Turborepo. `apps/web` (Next 16), `packages/engine`, `packages/cli` (`npx shiprank` npm v1.0.2), `packages/compile`, `packages/database`, `packages/mcp`, `packages/ui`.

**Engine (one implementation of “what is a finding”):**
- Implemented (`confidence > 0`): SEC-001–012, A11Y-001–006, PERF-001–006, SEO-001–008, QUAL-001–013.
- Stubs (`confidence = 0`, still listed; they must **not** count as 100): ARCH, DATA, COMP, INFRA.
- Held-out: `heldout.ts` (never score, never `/methodology`).
- `CheckResult.decisionContext` attached in `runChecks` (`packages/engine/src/decision-context.ts`).
- Self-scan of this repo: **99 / A+** (QUAL-009 still fails on CLI scanner/uploader awaits).

**Web:** `/` `/dare` `/dare/[jobId]` `/scan/[id]` `/leaderboard` `/models` `/methodology` `/pricing` `/dashboard` `/project/[id]/history` `/about` `/privacy` `/terms` `/verify/[scanId]` + 404/error. Cmd+K. Footer legal. Plan gating free/pro/monitor.

**Dare (local, proven):**
- `POST /api/dare` · `GET/POST /api/dare/[jobId]`
- Worker: GitHub zipball → `/tmp` → engine **read-only** → ingest. Caps 50MB / 5000 files / 120s. Rate 3/IP/hour.
- Job store: Postgres `scan_jobs` if migration applied, else `/tmp/shiprank-dare-jobs.json`.
- Real run: `github.com/octocat/Hello-World` → **83/B**, landed on leaderboard, 4th request **429**.

**Archaeology / Lie Detector:** scan page. Free locked. Claims map only to existing IDs (SEC-004/011, SEC-003/002, SEC-001/012, QUAL-001/012). Frequency only if genome n≥10.

**Tests (last run):** engine 276 · web 149 · CLI 40 · compile 23 · MCP 5. Web typecheck clean.

**Not built:** Intent station, Design station, Canvas (`/canvas/[scanId]`), 253-check catalog, live Vercel of this work, axe-core/Lighthouse orchestration.

---

## What's pending (manual — the door)

These are **human** actions. Code cannot finish them:

1. **`git push`** if `465ef41` is not on `origin/main`.
2. **Connect GitHub `ujjwal03333/shiprank` to Vercel and deploy.** Last production deploy observed was ~13 days old. `https://shiprank-web-cqm7.vercel.app/dare` was **404**. A Redeploy without a new deployment of this repo does nothing.
3. **Apply `00011_scan_jobs.sql`** in the ShipRank Supabase SQL editor (safe IF NOT EXISTS version is in the chat / migration file). Required on Vercel (multi-instance). File-backed jobs will not survive.
4. **`SUPABASE_SERVICE_ROLE_KEY` = JWT only** (no trailing comment). User said local is fine; confirm Vercel env.
5. Optional: `GITHUB_TOKEN`, real inbox instead of `hello@shiprank.dev`, Stripe keys or remove Pro CTA.
6. **`shiprank.dev` is a different product** (“lines shipped”). Do not treat it as this app. CLI homepage still points at `shiprank-web-cqm7.vercel.app`; uploader default is `https://shiprank.dev/api/scan` — that mismatch is a landmine.

Until 1–3 are done, only `localhost:3000` has Dare / Models / new legal pages.

---

## What's specified (files, do not re-invent)

| File | Use when |
|---|---|
| `CLAUDE.md` | Any session — architecture, scoring, invariants |
| `SHIPRANK-GATE-MASTER-PROMPT.md` | 15 stations, 253 checks, implement contract |
| `SHIPRANK-UX-EXCELLENCE-PROMPT.md` | Every page, 4 states, motion, UX GATE |
| `SHIPRANK-EVERYTHING-PROMPT.md` | 12 phases. Next code: Phase 5 (stop stub 100s) then 6 (real COMP/INFRA/DATA/ARCH) |
| `SHIPRANK-UNICORN-PROMPT.md` | Dare harden, Archaeology, Models, Canvas spec |

**Do not start 253 checks or Canvas before Phase 4–6.** Stubs scoring 100 is product fraud.

---

## Critical rules (break these and the product is fake)

- One check suite: `@shiprank/engine`. CLI / MCP / web wrap it.
- Checks are pure `(profile) => CheckResult`. Tests construct `CodeProfile` inline.
- `confidence === 0` must not affect station or overall score.
- Held-out checks never enter `runChecks`, never appear on `/methodology`.
- Never flag `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Never invent AI-commit ratio or fail% without data.
- Tokens only from `@shiprank/ui/tokens.css`.
- Engine `quality` → DB `code_quality`; `infrastructure` → `infra`; `warning` → `medium`.
- Show real command output. Do not call a GATE done from a summary.
- Methodology IDs/titles must match the engine in the same PR.

---

## Competitive landscape (compressed)

- **Lovable** ~$13.3B / ~$500M ARR — owns *create the app*. Can add “finish” as a feature.
- **Cursor** — daily driver; habit + seats.
- **CodeRabbit** $1.5B (Aug 2026) — owns *the PR*. $12–24/dev. 2M+ repos.
- **Snyk / Semgrep** — CI budget already exists.
- Also: Vibe App Scanner, agency “vibe audits.” Category is not empty.

**Implication:** ShipRank does not become a unicorn by adding stations. It becomes useful if it is the **verifier in the agent loop** (MCP — already exists, underused) or a **gate a third party requires**. Dare/leaderboard is distribution after you have users, not before.

---

## How to resume (any tool)

```
cd ~/Desktop/shiprank
Read CLAUDE.md
Read SHIPRANK-CONTEXT-TRANSFER.md
Then ONLY the spec for the job (table below).
pnpm --filter @shiprank/engine test && pnpm --filter @shiprank/web test
```

| Job | File |
|---|---|
| Viral surfaces (Dare, Canvas, Archaeology) | `SHIPRANK-UNICORN-PROMPT.md` |
| 253-check engine | `SHIPRANK-GATE-MASTER-PROMPT.md` |
| UX 10/10 | `SHIPRANK-UX-EXCELLENCE-PROMPT.md` |
| Full 12-phase build | `SHIPRANK-EVERYTHING-PROMPT.md` (start Phase 5 if door is open, else Phase 4) |

**Claude Code:** open a session in `~/Desktop/shiprank`. `CLAUDE.md` loads automatically.

**Verification standard:** run the command, paste the output. A spec without tests produces code that looks right and fails in production.

---

## First message to paste into the next tool

```
Continue ShipRank from ~/Desktop/shiprank
(repo https://github.com/ujjwal03333/shiprank).

Read CLAUDE.md, then SHIPRANK-CONTEXT-TRANSFER.md.
Do not rebuild Wave 1. Do not score stub stations as 100.
If production isn't deployed, say so — don't pretend shiprank.dev is this app.

Ask which spec to execute, or start EVERYTHING Phase 4/5.
Show real test/scan/HTTP output at every gate.
```
