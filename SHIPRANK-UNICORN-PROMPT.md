# SHIPRANK-UNICORN-PROMPT.md
## Dare · Archaeology · Canvas · Model Rankings

Growth surfaces only. They do not replace a wedge.  
Read `CLAUDE.md`. If Phase 4–6 in `SHIPRANK-EVERYTHING-PROMPT.md` are not live, **stop**.

### Market constraint (do not ignore)

Lovable (~$13B, ~$500M ARR) owns creation. CodeRabbit ($1.5B) owns the PR.  
ShipRank only becomes large if it is the **verifier in the agent loop** or a **gate a third party requires**. These four surfaces are distribution and trust — not the company.

### Honest baseline

| Surface | Code | Live |
|---|---|---|
| Dare Board | `/dare`, `/api/dare`, worker, local job store | Local yes. Vercel 404 until deploy + `00011` |
| AI Archaeology | `decisionContext` on engine `CheckResult`; scan page | Local yes. Free locked |
| Model Rankings | `/models` | Local yes. Low-n banner |
| Canvas | **Not built** | — |

---

## 1. Dare Board (shipped — harden)

**Job:** Paste public GitHub URL → clone (read-only, never execute) → score → leaderboard in ~60s.

Already specified and coded: validation, 50MB / 5000 files / 120s, 3/IP/hour, stages, share tweet, `scan_jobs`.

**Harden before bragging:**

- Production **must** use Postgres `scan_jobs` (file store is single-instance).  
- Own the URL in the tweet (do not send people to a competitor’s `shiprank.dev` if you do not own it).  
- Reject private/404 before clone (done).  
- Show score even if ingest fails (done).  
- GATE: live host, real repo, stages, leaderboard row, 429 on 4th, share card.

**Do not add private GitHub OAuth until public Dare has 100 completed jobs.**

---

## 2. AI Archaeology (shipped — deepen)

**Job:** “Why did the AI make this choice?” Deterministic. No LLM.

- Catalog lives in `packages/engine/src/decision-context.ts`.  
- Field: `CheckResult.decisionContext`.  
- Frequency only from `check_genome_rows` when n≥10.  
- Free: toggle visible, locked. Pro: full.

**Lie Detector** (scan page): claims → existing check IDs only.

| Claim | Checks |
|---|---|
| Authentication added | SEC-004, SEC-011 |
| Database secured | SEC-003, SEC-002 |
| Payments integrated | SEC-001, SEC-012 |
| Tests written | QUAL-001, QUAL-012 |

Ignore IDs that did not run. Never fabricate contradiction.

GATE: one real scan, ≥3 expanded Pro records, ≥2 contradicted claims, no fake %.

---

## 3. Model Rankings (shipped — keep honest)

`/models`: avg score, n, best/worst station.  
`<5` / `5–19` / `≥20` confidence gates. Banner under 20 scans.

Do not rank “Claude vs GPT” as science until n is large and provenance is verified. A wrong ranking will be screenshotted forever.

GATE: page renders on live; unknown models labelled; drill-down works.

---

## 4. Canvas (not built — spec only)

**Job:** One screen that is the finishing surface — not another report.

```
/canvas/[scanId]
```

- Left: station map (only scored stations). Click station → failing checks.  
- Center: current check evidence + fix prompt.  
- Right: “Send to agent” — copies `--rules` snippet or opens MCP.  
- Bottom: score delta if this check flipped (estimated from weight, labelled estimate).  
- No auto-apply to their GitHub until they connect a repo (Phase 9).

**Out of scope for v1:** Figma, drag-drop architecture, generative UI.

GATE: a user can go from dare complete → canvas → copy a fix → re-scan without reading the marketing site.

---

## Kill list (if you want a company)

- Do not add more stations for the homepage.  
- Do not build Canvas before Dare is live and stubs no longer score 100.  
- Do not spend a month on model rankings.  
- Do not compete with Lovable on generation or CodeRabbit on PR comments until MCP is the default path.

**The unicorn move is Phase 8–9 in EVERYTHING (MCP + one blocking gate), not a fourth marketing page.**
