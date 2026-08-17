# SHIPRANK-GATE-MASTER-PROMPT.md
## 15 stations · 253 checks · one implementation

Hand this file to any coding agent. It is the **check catalog**, not a status report.

**Repo:** https://github.com/ujjwal03333/shiprank  
**Read first:** `CLAUDE.md` then this file.  
**Do not reimplement checks outside `@shiprank/engine`.**

### Honest baseline (2026-08-18)

| State | What |
|---|---|
| Implemented (`confidence > 0`) | SEC-001–012, A11Y-001–006, PERF-001–006, SEO-001–008, QUAL-001–013 (~45) |
| Stubs (`confidence = 0`, currently score as 100 — **lie, turn them off until real**) | ARCH-*, DATA-*, COMP-*, INFRA-* |
| Held-out (never score, never put on `/methodology`) | HELD-001 |
| Not in engine yet | Intent, Design, Payments, Auth, Observability, Agent stations below |

**Rule:** A missing station is honest. A stub that reports 100 is product fraud. New checks ship with tests. `/methodology` updates in the same PR. `SUPABASE_ANON_KEY` is never a secret.

### Scoring (already in `checks/engine.ts`)

- Station score = weighted share of **implemented** checks (`confidence > 0`).
- Critical/warning weights scale up if profile has payments, user data, or auth.
- Overall = unweighted mean of stations that have ≥1 implemented check. **Exclude empty/stub stations from the mean.**
- Grade: A+ ≥97, A ≥85, B ≥70, C ≥55, D ≥40, else F.
- Engine station `quality` → DB `code_quality`; `infrastructure` → `infra`.
- Engine severity `warning` → DB `medium`.

### Fix safety (every check)

`SAFE-AUTO` | `REVIEW` | `HUMAN-ONLY`

---

## Station map (15)

| # | Station | Prefix | Count | Engine file |
|---|---|---|---|---|
| 1 | Intent | INT | 12 | *new* `checks/intent.ts` |
| 2 | Security | SEC | 32 | `checks/security.ts` (12 live) |
| 3 | Design integrity | DES | 16 | *new* `checks/design.ts` |
| 4 | Accessibility | A11Y | 20 | `checks/accessibility.ts` (6 live) |
| 5 | Performance | PERF | 20 | `checks/performance.ts` (6 live) |
| 6 | Data | DATA | 18 | `checks/data.ts` (stubs) |
| 7 | Infrastructure | INFRA | 16 | `checks/infrastructure.ts` (stubs) |
| 8 | Compliance | COMP | 16 | `checks/compliance.ts` (stubs) |
| 9 | Growth | SEO | 20 | `checks/growth.ts` (8 live) |
| 10 | Quality | QUAL | 20 | `checks/quality.ts` (13 live) |
| 11 | Architecture | ARCH | 16 | `checks/architecture.ts` (stubs) |
| 12 | Payments | PAY | 14 | *new* `checks/payments.ts` |
| 13 | Auth | AUTH | 16 | *new* `checks/auth.ts` |
| 14 | Observability | OBS | 12 | *new* `checks/observability.ts` |
| 15 | Agent finish | AGENT | 5 | `agents-md.ts` + MCP |
| | | | **253** | |

IDs below that already exist keep their meaning. New IDs continue the prefix.

---

## 1 · Intent (INT-001–012) — “did the app do what they asked?”

Parse a plain-language goal into capabilities. Classify each: implemented / stubbed / missing / broken.

| ID | Check | Sev | Detect | Fix |
|---|---|---|---|---|
| INT-001 | Goal text captured | crit | no intent string on scan | REVIEW |
| INT-002 | Capabilities extracted (≥1) | crit | empty parse | REVIEW |
| INT-003 | UI evidence per capability | warn | no matching page/component | REVIEW |
| INT-004 | Data evidence per capability | warn | no table/schema | REVIEW |
| INT-005 | Logic evidence per capability | warn | no route/fn | REVIEW |
| INT-006 | Integration evidence (Stripe etc.) | crit | claimed pay, no SDK | REVIEW |
| INT-007 | Stub/TODO detection | warn | TODO/FIXME on capability path | REVIEW |
| INT-008 | Phantom import / undefined call | crit | reference with no def | REVIEW |
| INT-009 | Mock data in “done” capability | warn | faker/hardcoded lists | REVIEW |
| INT-010 | Capability coverage % reported | info | always | — |
| INT-011 | Next prompt generated per gap | info | always | SAFE-AUTO |
| INT-012 | Intent vs score divergence flag | info | high score, low coverage | — |

---

## 2 · Security (SEC-001–032)

**Live:** 001 secrets (never flag anon key) · 002 .env gitignore · 003 RLS · 004 session on protected routes · 005 input validation · 006 no eval · 007–011 (see source) · 012 webhook signatures.

**Add:**

| ID | Check | Sev | Fix |
|---|---|---|---|
| SEC-013 | CORS not `*` in prod | crit | REVIEW |
| SEC-014 | JWT not in localStorage | crit | REVIEW |
| SEC-015 | Auth rate limit on login | warn | REVIEW |
| SEC-016 | No SQL string concat | crit | REVIEW |
| SEC-017 | Secrets rotated after git hit | human | HUMAN-ONLY |
| SEC-018 | File upload type/size cap | warn | REVIEW |
| SEC-019 | CSP / security headers | warn | SAFE-AUTO |
| SEC-020 | Cookies HttpOnly+Secure+SameSite | warn | REVIEW |
| SEC-021 | No service_role in client bundles | crit | REVIEW |
| SEC-022 | SSRF-safe fetch allowlist | crit | REVIEW |
| SEC-023 | Path traversal on uploads | crit | REVIEW |
| SEC-024 | CSRF on mutating form posts | warn | REVIEW |
| SEC-025 | Open redirect allowlist | warn | REVIEW |
| SEC-026 | Dependency CVE (osv/npm audit) | crit | REVIEW |
| SEC-027 | Lockfile committed | warn | SAFE-AUTO |
| SEC-028 | No `dangerouslySetInnerHTML` + user data | crit | REVIEW |
| SEC-029 | Webhook secret not logged | warn | REVIEW |
| SEC-030 | Admin routes isolated | crit | REVIEW |
| SEC-031 | Debug/stack traces off in prod | warn | REVIEW |
| SEC-032 | Least-privilege DB role | warn | HUMAN-ONLY |

---

## 3 · Design integrity (DES-001–016)

Objective only. Never score taste.

| ID | Check | Sev | Fix |
|---|---|---|---|
| DES-001 | Tokens file exists | warn | REVIEW |
| DES-002 | No hardcoded hex outside tokens | warn | REVIEW |
| DES-003 | Spacing on a scale | info | REVIEW |
| DES-004 | Hover state on clickables | warn | REVIEW |
| DES-005 | Focus-visible not removed | warn | SAFE-AUTO |
| DES-006 | Disabled + loading button states | warn | REVIEW |
| DES-007 | Empty / error / success states | warn | REVIEW |
| DES-008 | Not default Inter+shadcn fingerprint only | info | HUMAN-ONLY |
| DES-009 | No lorem / “Revolutionize your workflow” | info | HUMAN-ONLY |
| DES-010 | Type scale consistent | info | REVIEW |
| DES-011 | Dark mode pair if toggle exists | warn | REVIEW |
| DES-012 | Motion respects `prefers-reduced-motion` | warn | SAFE-AUTO |
| DES-013 | 375px no overflow | warn | REVIEW |
| DES-014 | Figma parity (connector, skip if none) | info | REVIEW |
| DES-015 | One radius/shadow language | info | REVIEW |
| DES-016 | Images not stretched / broken | warn | REVIEW |

---

## 4 · Accessibility (A11Y-001–020)

**Live:** 001 alt · 002 labels · 003 headings · 004 focus · 005 skip link · 006 (+source).

**Add:** 007 contrast AA · 008 modal focus trap · 009 Esc closes dialog · 010 `html lang` · 011 form errors tied to inputs · 012 live regions for async · 013 icon buttons named · 014 reduced motion · 015 tap target ≥44px · 016 no keyboard trap · 017 `prefers-contrast` · 018 captions if video · 019 table headers · 020 axe-core orchestrated (not rebuilt).

---

## 5 · Performance (PERF-001–020)

**Live:** 001 images · 002 no barrel lodash · 003 cache headers · 004 blocking scripts · 005 font swap / useEffect deps · 006 (+source).

**Add:** 007 dynamic import below fold · 008 pagination / no unbounded list · 009 no N+1 query loop · 010 next/image or equiv · 011 bundle budget · 012 unused deps (knip) · 013 no moment.js · 014 LCP image priority · 015 no layout shift fonts · 016 ISR/revalidate if marketing · 017 no 5MB originals in `public/` · 018 waterfalls flagged · 019 third-party script count · 020 `loading=lazy` below fold.

---

## 6 · Data (DATA-001–018)

Implement stubs; do not leave confidence 0.

001 FK indexes · 002 NOT NULL · 003 no float money · 004 migrations in repo · 005 soft delete · 006 no N+1 · 007 timestamps · 008 unique email · 009 schema via migrations only · 010 enums · 011 RLS+policy pair · 012 backup story documented · 013 connection pooling · 014 no SELECT * in hot path · 015 pagination on list APIs · 016 idempotent webhooks table · 017 migration down or expand-contract note · 018 PII columns identified.

---

## 7 · Infrastructure (INFRA-001–016)

001 CI · 002 error tracker · 003 analytics (optional) · 004 `/api/health` · 005 no hardcoded localhost · 006 env separation · 007 preview deploys · 008 dependabot · 009 `engines` in package.json · 010 Dockerfile or platform config · 011 secrets not in Vercel logs · 012 cron auth (`CRON_SECRET`) · 013 status page or uptime · 014 staging URL · 015 rollback path · 016 node LTS.

---

## 8 · Compliance (COMP-001–016)

001 privacy page · 002 terms · 003 cookie consent if non-essential · 004 account deletion · 005 no PII in logs · 006 retention · 007 cookie flags · 008 third-party disclosure · 009 contact email · 010 data export · 011 age/region if needed · 012 subprocessors listed · 013 breach contact · 014 analytics after consent · 015 generated policy says “not legal advice” · 016 DPDP/GDPR/CCPA trigger matrix.

---

## 9 · Growth (SEO-001–020)

**Live:** 001 favicon · 002 OG · 003 robots · 004 sitemap · 005 Twitter cards · 006 canonical · 007–008 (source).

**Add:** 009 JSON-LD · 010 title+description every indexable route · 011 404 useful · 012 OG image exists · 013 share card 1200×630 · 014 sitemap includes new routes · 015 no index on app internals · 016 href lang if i18n · 017 RSS if blog · 018 plausible/posthog optional · 019 empty share preview test · 020 AEO/JSON-LD Organization.

---

## 10 · Quality (QUAL-001–020)

**Live:** 001 tests · 002 strict TS (monorepo-aware) · 003 lint · 004 no console in prod · 005–013 (source; 009 treats Supabase `{ error }` as handling).

**Add:** 014 no `any` in app code · 015 no empty catch · 016 dead exports · 017 max file 500 loc warn · 018 snapshot tests not only · 019 typecheck in CI · 020 format config.

---

## 11 · Architecture (ARCH-001–016)

Implement stubs: logic not in components · no god files · no 3-level prop drill · service layer · no cycles · env split · feature folders · ui package · API client · plus: 010 server/client boundary · 011 one auth helper · 012 no circular workspace deps · 013 public API versioned · 014 feature flags for paid · 015 idempotent ingest · 016 single check engine.

---

## 12 · Payments (PAY-001–014)

001 Stripe/sdk present if claimed · 002 webhook route · 003 signature verify (=SEC-012) · 004 no card data stored · 005 test vs live keys split · 006 idempotency keys · 007 success/cancel URLs · 008 plan metadata on session · 009 webhook handler fail-soft · 010 dunning/cancel copy · 011 tax not silently wrong · 012 amount in cents integer · 013 no client-side price trust · 014 refund path documented.

---

## 13 · Auth (AUTH-001–016)

001 real provider or session · 002 server check not only UI · 003 logout clears session · 004 password reset if passwords · 005 OAuth state param · 006 session expiry · 007 role checks · 008 no user id in client-writable field · 009 email verify if required · 010 rate limit login · 011 lockout or backoff · 012 invite flow if multi-tenant · 013 org isolation · 014 session cookie flags · 015 CSRF · 016 account deletion respects auth.

---

## 14 · Observability (OBS-001–012)

001 error tracker · 002 request id · 003 structured logs · 004 no PII logs · 005 uptime · 006 alert on 5xx · 007 traces optional · 008 product analytics after consent · 009 deploy marker · 010 cron last-success · 011 queue depth if any · 012 status for dare jobs.

---

## 15 · Agent finish (AGENT-001–005)

001 `npx shiprank --rules` writes AGENTS.md · 002 MCP `shiprank_scan` · 003 MCP `shiprank_check_diff` · 004 MCP `shiprank_get_rules` · 005 failing checks become next-agent prompts (not a new score).

---

## Implementation contract

```
For each new check:
1. Pure (profile) => CheckResult in the station file
2. confidence > 0 only if heuristic is real
3. Test in packages/engine/src/__tests__/  (inline CodeProfile)
4. Methodology page list updated
5. Never document held-out patterns publicly
```

**Do not start 253 at once.** Next build wave: turn **off** stub scoring, then implement DATA + COMP + INFRA + ARCH for real (stations 6–8, 11) before adding INT/DES/PAY.

Related: `SHIPRANK-EVERYTHING-PROMPT.md` (order), `SHIPRANK-UX-EXCELLENCE-PROMPT.md` (UI), `SHIPRANK-UNICORN-PROMPT.md` (growth surfaces).
