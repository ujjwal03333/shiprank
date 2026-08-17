# SHIPRANK-EVERYTHING-PROMPT.md
## 12 phases · dependency order · do not skip ahead

One agent, one phase, real output at each gate.  
Repo: https://github.com/ujjwal03333/shiprank · `CLAUDE.md` first.

### Already landed (do not rebuild)

| Phase | What | Evidence |
|---|---|---|
| 0 | Monorepo, tokens, schema 00001–00010 | `main` |
| 1 | Engine + CLI + compile + MCP | tests green |
| 2 | Web app, Stripe/cron/badge/genome | Wave 1 + 12.8 |
| 3 | Legal + UX pass + Dare + Archaeology + Models | `9b37287` + `465ef41` (push 465ef41) |
| — | Local Dare Hello-World **83/B**, self-scan **99/A+** | laptop only |

### Blocked until you do this by hand

1. `git push` (if `465ef41` still local)  
2. Connect GitHub → Vercel (last prod deploy was stale; `/dare` 404s live)  
3. Apply `00011_scan_jobs.sql` in Supabase  
4. Clean `SUPABASE_SERVICE_ROLE_KEY` (JWT only)

---

## Phase 4 — Production door (do this next)

- Push, deploy, SQL, env.  
- Smoke: `/dare` + `github.com/octocat/Hello-World` on the **live** host.  
- GATE: scan on leaderboard, 4th dare 429, no 500s.

## Phase 5 — Stop lying with stubs

- Exclude `confidence === 0` stations from overall score (if not already after filter).  
- Hide stub stations from report or label “not scored.”  
- GATE: a project without CI does **not** get Infra 100.

## Phase 6 — Implement stub stations for real

Order: **COMP → INFRA → DATA → ARCH** (user-visible, then ops, then schema, then structure).  
Follow `SHIPRANK-GATE-MASTER-PROMPT.md`. Tests + methodology in the same PR.  
GATE: each station has ≥3 `confidence > 0` checks.

## Phase 7 — Intent station (the actual differentiator)

- INT-001–012. User pastes “what I asked for.” Report implemented/stub/missing/broken + next prompts.  
- GATE: one real Lovable-style repo, 4 capabilities classified with evidence.

## Phase 8 — MCP as the product

- Publish `@shiprank/mcp`. Cursor + Claude Code install one-liners on homepage.  
- Default loop: scan → failing checks → `--rules` → agent fixes → `check_diff`.  
- GATE: a stranger finishes a finding without opening the website.

## Phase 9 — One blocking integration

Pick **one**: Vercel deploy check, GitHub App on PR, or Stripe “go live” checklist.  
GATE: a merge or deploy is blocked on a real failing SEC check.

## Phase 10 — UX excellence pass

Execute `SHIPRANK-UX-EXCELLENCE-PROMPT.md` gates (375px, dark, console, copy, skeletons).  
GATE: checklist all checked with evidence (screenshots or Playwright).

## Phase 11 — Unicorn surfaces (only if 4–9 are live)

Execute `SHIPRANK-UNICORN-PROMPT.md`: harden Dare, Archaeology, Models, then Canvas.  
Do not start Canvas before 100 unpaid scans.

## Phase 12 — Operate

- Self-scan on CI; fail deploy below A.  
- Replace `hello@shiprank.dev`.  
- Stripe live or remove Pro CTA.  
- Domain: stop linking `shiprank.dev` if you do not own it.  
- GATE: weekly scan volume + one returning user you did not beg.

---

## Hard stops

- Do not add stations 1/3/12/13/14 from the master catalog until Phase 6 is done.  
- Do not add 253 checks in one PR.  
- Do not call a phase done without the GATE output.  
- Do not rebuild Wave 1.

Related: `SHIPRANK-GATE-MASTER-PROMPT.md` · `SHIPRANK-UX-EXCELLENCE-PROMPT.md` · `SHIPRANK-UNICORN-PROMPT.md` · `SHIPRANK-CONTEXT-TRANSFER.md`
