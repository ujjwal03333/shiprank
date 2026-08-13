# @shiprank/mcp

An MCP (Model Context Protocol) server that exposes the ShipRank scan engine
directly to AI coding agents. It wraps `@shiprank/engine`'s pure functions —
the same check suite, scoring, and AGENTS.md generator the CLI and web app
use — so there is exactly one implementation of "what counts as a finding."

## Tools

### `shiprank_scan(path: string)`

Runs the full scan on a local project directory. Returns the same JSON shape
as the ShipRank CLI: overall score, grade, per-station breakdown with every
check's pass/fail + evidence, platform/model fingerprint, remediation plan,
and held-out check results.

### `shiprank_check_diff(path: string, files: string[])`

Runs the check suite once, then returns only the findings whose evidence
touches one of the given files. Use this right after editing a file to see
what ShipRank actually flags there, instead of reading the full report.

### `shiprank_get_rules(path: string)`

Generates AGENTS.md content from the project's current findings — the same
generator behind `npx shiprank --rules`.

## Install

From the built package:

```bash
npm install -g @shiprank/mcp
```

Or run it straight from the workspace during development:

```bash
pnpm --filter @shiprank/mcp build
node packages/mcp/dist/bin.js
```

## Configuration

### Claude Code

Add to your project's `.mcp.json` (or run `claude mcp add`):

```json
{
  "mcpServers": {
    "shiprank": {
      "command": "npx",
      "args": ["-y", "@shiprank/mcp"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shiprank": {
      "command": "npx",
      "args": ["-y", "@shiprank/mcp"]
    }
  }
}
```

Both clients spawn the server over stdio — no network access or API key
required. All three tools take a local filesystem `path`.

## Development

```bash
pnpm --filter @shiprank/mcp test        # unit tests against fixture projects
pnpm --filter @shiprank/mcp dev         # run the stdio server directly (tsx)
pnpm --filter @shiprank/mcp typecheck
```
