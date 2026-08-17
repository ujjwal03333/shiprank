# SHIPRANK-UX-EXCELLENCE-PROMPT.md
## Every page · every state · one motion language

Hand this to an agent doing UI only. Do not invent new product surfaces here.

**Theme:** `@shiprank/ui/tokens.css` only. No hardcoded hex in components.  
**Motion:** `cubic-bezier(0.4, 0, 0.2, 1)` · 150ms micro · 300ms reveal.  
**Respect** `prefers-reduced-motion`.  
**Copy buttons:** click → checkmark → “Copied!” → revert 2s (see `CopyButton`).  
**Buttons:** hover + active + disabled + loading (spinner in the button, ≤100ms).  
**Loading:** skeleton matching final layout. Never spinner-on-blank.  
**Errors:** human sentence + retry. Never a stack trace.  
**Empty:** personality, one next action. Never “No data.”

### Honest baseline

Built: marketing, legal, scan, leaderboard, methodology, pricing, dashboard, history, dare, models, 404, error, Cmd+K, skeletons on several routes.  
Not click-verified at 375px / dark mode / console. Do that before calling UX “10/10”.

---

## Global chrome

| Surface | Must |
|---|---|
| Skip link | Visible on focus; Tailwind v4 reset `clip-path` |
| Nav | Home, Dare, Leaderboard, Models, Methodology, Pricing, theme, CLI |
| Footer every page | Mission, Dare, Leaderboard, Models, Methodology, Pricing, About, Privacy, Terms |
| Cmd+K | Search those routes + `/dare` + home compile |
| Theme | light / dark / system; no hydration flash |
| Route change | existing top bar; no white flash |

---

## Pages and four states

For each: **loading · empty · error · success**. Plus **375px** and **dark**.

### `/` Home
- Loading: hero skeleton, not blank.
- Success: compile card, proof stats (ISR 60s, never fabricated), stations, CTA to Dare + `npx shiprank`.
- Error: compile 503 if no Anthropic key — say so, don’t crash.

### `/dare`
- Empty field centered, mono, placeholder `github.com/user/repo`.
- Line under: “Results appear on the public leaderboard.”
- Validate before POST. Button loading: “Checking repository…”
- Errors inline: invalid URL, 404/private, too big, 429 (3/IP/hour).

### `/dare/[jobId]`
Stages in order, real data chips (files, stack, findings):

1. Cloning repository…  
2. Profiling codebase…  
3. Running checks…  
4. Computing score…  
5. Reveal: score/grade, Open report (if `scan_id`), Share on X, Dare someone back  

Tweet:

```
[Project] scored [score]/[grade] on ShipRank 🎯
Dare your app → https://shiprank.dev/dare
```

Poll 2s. Failed: human error + try another repo.

### `/scan/[id]`
- Loading: `scan/[id]/loading.tsx` (exists).
- Not found: custom, CLI + leaderboard.
- Success: gauge tween, narrative (90/80/70/60), stations, radar only if real site average, attribution, findings, archaeology, lie detector, share, badge.
- Free: title+severity; fix + “Why did this happen?” locked (“Unlock with Pro →”).
- Pro/Monitor: file:line, fix, expandable decision record. Frequency only if n≥10.
- 100/100: subtle gold shimmer on gauge.

### `/leaderboard`
- Loading skeleton exists.
- Empty: “The leaderboard is empty. Be the first to dare a repo →”
- Success: by platform, by framework, table. No fake ranks.

### `/models`
- Banner if n<20: “Rankings stabilize with more data. Currently based on N scans. Contribute →”
- `<5` scans: grey, “Not enough data”
- `5–19`: score + Low confidence
- `≥20`: full
- Drill-down: station radar + best/worst. Never invent fail rates.

### `/methodology`
- Grade table visually distinct.
- Honest n= (“Based on N scans”).
- Per-station checks expandable. IDs/titles **match the engine**. No held-out.

### `/pricing`
- Three columns. No countdown, no fake urgency.
- Free CTA → npm. Pro/Monitor → checkout or “Stripe isn’t configured yet.”

### `/dashboard`
- Free: useful (CLI + Dare), not a blank lock.
- Monitor: project, score, trend, last scan.

### `/project/[id]/history`
- 0 scans: empty.
- 1 scan: the score, “A trend appears after the second scan.”
- 2+: chart.

### `/about` `/privacy` `/terms`
- Short, honest, match real behavior (static analysis, no source upload, placeholder email until replaced).

### `/verify/[scanId]`
- Attestation recompute. Fail soft if secret missing.

### 404 / error
- 404: Dare + leaderboard + CLI.
- error.tsx: “Something on this page broke” + Try again + digest. No `error.message` dump.

---

## Micro-interaction checklist (GATE)

Navigate the whole product and confirm:

- [ ] No blank flash between routes  
- [ ] No dead buttons  
- [ ] Every copy control uses the checkmark pattern  
- [ ] Every async submit shows in-button feedback immediately  
- [ ] Skeletons on dare/scan/leaderboard/models/pricing/dashboard  
- [ ] 375px: no horizontal scroll, tap targets usable  
- [ ] Dark: every page tokens, not leftover cream-on-cream  
- [ ] Console: zero errors on each route  

If a box is unchecked, UX is not done. Do not add new pages until it is.

Related: `SHIPRANK-GATE-MASTER-PROMPT.md` (what a finding is), `SHIPRANK-UNICORN-PROMPT.md` (Dare/Canvas).
