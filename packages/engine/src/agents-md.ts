import type { CodeProfile, StationScore, Framework } from "./checks/types";
import type { Fingerprint } from "./fingerprint/types";
import { overallScore } from "./checks/engine";
import { buildRemediationPlan } from "./remediation";

// ── helpers ───────────────────────────────────────────────────────────────────

const FRAMEWORK_LABELS: Record<Framework, string> = {
  nextjs: "Next.js (App Router)",
  "vite-react": "Vite + React",
  vue: "Vue / Nuxt",
  svelte: "SvelteKit",
  html: "Static HTML",
  unknown: "Unknown",
};

function frameworkDevCommand(fw: Framework): string {
  if (fw === "nextjs") return "next dev";
  if (fw === "vite-react") return "vite";
  if (fw === "vue") return "nuxt dev";
  if (fw === "svelte") return "vite dev";
  return "npm start";
}

function topDeps(deps: Record<string, string>, max = 12): string {
  const entries = Object.entries(deps).slice(0, max);
  if (entries.length === 0) return "_none detected_";
  return entries.map(([pkg, ver]) => `- \`${pkg}\` ${ver}`).join("\n");
}

function scripts(packageJson: Record<string, unknown> | null): string {
  const s = packageJson?.scripts as Record<string, string> | undefined;
  if (!s || Object.keys(s).length === 0) return "_no scripts defined_";
  return Object.entries(s)
    .slice(0, 8)
    .map(([name, cmd]) => `- \`${name}\`: \`${cmd}\``)
    .join("\n");
}

function dirSummary(profile: CodeProfile): string {
  const lines: string[] = [];

  const hasSrc = profile.files.some(f => f.path.startsWith("src/"));
  const hasApp = profile.files.some(f => f.path.startsWith("app/"));
  const hasPages = profile.files.some(f => f.path.startsWith("pages/"));

  if (hasApp) lines.push("- `app/` — Next.js App Router pages and layouts");
  if (hasPages) lines.push("- `pages/` — Next.js Pages Router");
  if (hasSrc) lines.push("- `src/` — application source");
  if (profile.components.length > 0) {
    const dir = profile.components[0]?.split("/")[0] ?? "components";
    lines.push(`- \`${dir}/\` — UI components (${profile.components.length} detected)`);
  }
  if (profile.apiRoutes.length > 0) {
    lines.push(`- API routes: ${profile.apiRoutes.length} endpoint(s)`);
  }
  if (profile.supabaseMigrations.length > 0) {
    lines.push(`- \`supabase/migrations/\` — ${profile.supabaseMigrations.length} migration file(s)`);
  }
  if (profile.testFiles.length > 0) {
    lines.push(`- ${profile.testFiles.length} test file(s) detected`);
  }
  return lines.length > 0 ? lines.join("\n") : "_standard project layout_";
}

function contextFlags(profile: CodeProfile): string {
  const flags = [
    ["hasAuth", profile.hasAuth],
    ["hasDatabase", profile.hasDatabase],
    ["hasPayments", profile.hasPayments],
    ["hasUserData", profile.hasUserData],
  ] as const;
  return flags.map(([k, v]) => `- ${k}: \`${v}\``).join("\n");
}

function fingerprintSection(fp: Fingerprint): string {
  const lines: string[] = [];
  const { platform, model, aiRatio } = fp;

  if (platform.platform !== "unknown") {
    lines.push(`- **AI Platform**: ${platform.platform} (${platform.confidence}% confidence)`);
    lines.push(`  - Signals: ${platform.signals.join(", ")}`);
  } else {
    lines.push("- **AI Platform**: unknown — not detected");
  }

  if (model.model) {
    lines.push(`- **Likely Model**: \`${model.model}\` (${model.confidence}% confidence)`);
    lines.push(`  - ${model.reasoning}`);
  } else {
    lines.push("- **Likely Model**: unknown — correct us on the next scan");
  }

  if (aiRatio) {
    const pct = Math.round(aiRatio.aiRatio * 100);
    lines.push(
      `- **AI Commit Ratio**: ${pct}% likely-AI of ${aiRatio.totalAnalyzed} commits analyzed` +
      ` (${aiRatio.likelyAiCommits} AI / ${aiRatio.likelyHumanCommits} human)`,
    );
  } else {
    lines.push("- **AI Commit Ratio**: no git history — cannot compute");
  }

  return lines.join("\n");
}

function remediationSection(stationScores: StationScore[]): string {
  const plan = buildRemediationPlan(stationScores);
  if (plan.top3.length === 0) return "_no failing checks — project is clean_";

  const lines = plan.top3.map((item, i) => {
    const label = `${item.autoFixClass} · ${item.effortMinutes} min`;
    return `${i + 1}. **[${item.checkId}]** ${item.title}\n   - ${item.severity.toUpperCase()} · ${label}\n   - ${item.fixPrompt}`;
  });

  lines.push("");
  lines.push(
    `> Fixing all three raises your score from **${plan.currentScore}** → **${plan.projectedScore}** (projected).`,
  );

  return lines.join("\n");
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an AGENTS.md string for a project.
 * Pure function — no I/O. Pass the already-built profile, scores, and fingerprint.
 */
export function generateAgentsMd(
  profile: CodeProfile,
  stationScores: StationScore[],
  fingerprint: Fingerprint,
): string {
  const overall = overallScore(stationScores);
  const fw = profile.framework;
  const pkg = profile.packageJson;
  const projectName = (pkg?.name as string | undefined) ?? "this project";
  const now = new Date().toISOString().split("T")[0]!;

  return `# AGENTS.md

> Auto-generated by ShipRank on ${now}.
> Regenerate: \`npx shiprank agents\`
> **ShipRank Score: ${overall}/100**

This file gives AI coding assistants context about ${projectName} so they can
work more accurately without exploring the codebase from scratch.

---

## Project

- **Name**: ${projectName}
- **Framework**: ${FRAMEWORK_LABELS[fw]}
- **Dev command**: \`${frameworkDevCommand(fw)}\`

${fingerprintSection(fingerprint)}

---

## Directory Layout

${dirSummary(profile)}

---

## Context Flags

${contextFlags(profile)}

These flags affect how ShipRank scores the project — e.g. \`hasPayments: true\`
applies a 1.5× severity multiplier to critical security checks.

---

## Key Dependencies

${topDeps(profile.dependencies)}

---

## NPM Scripts

${scripts(pkg)}

---

## Top 3 Fixes (ShipRank)

${remediationSection(stationScores)}

Run \`npx shiprank scan .\` for the full report.

---

## Conventions

${[
  profile.tsConfig ? "- TypeScript (strict mode likely — check tsconfig.json)" : null,
  profile.hasDatabase ? "- Database: use parameterized queries, never string-interpolated SQL" : null,
  profile.hasAuth ? "- Auth is present — never expose session tokens in client bundles or logs" : null,
  profile.hasPayments ? "- Payments are present — treat all Stripe/payment keys as critical secrets" : null,
  profile.supabaseMigrations.length > 0
    ? `- Supabase migrations in \`supabase/migrations/\` — always create new migration files, never edit existing ones`
    : null,
].filter(Boolean).join("\n") || "_no specific conventions detected_"}

---

_Generated by ShipRank — the lifecycle finishing service for AI-built software._
_Detected platform: ${fingerprint.platform.platform} · Model: ${fingerprint.model.model ?? "unknown"}_
`;
}
