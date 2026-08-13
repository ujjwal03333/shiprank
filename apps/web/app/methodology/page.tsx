import type { Metadata } from "next";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How ShipRank scores AI-built software — 9 stations, grade boundaries, check descriptions, and accuracy metrics.",
  alternates: { canonical: "/methodology" },
};

async function getScanCount(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = getServiceClient();
    const { count } = await db
      .from("leaderboard_entries")
      .select("scan_id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return null;
  }
}

const STATIONS = [
  {
    id: "security",
    name: "Security",
    color: "#b23b3b",
    description:
      "Checks for hardcoded secrets, RLS configuration, authentication patterns, exposed API routes, and dependency vulnerabilities. The highest-weight station — a single critical finding can anchor the score.",
    checks: [
      "SEC-001 · No hardcoded secrets or API keys in source",
      "SEC-002 · .env files excluded from git (.gitignore)",
      "SEC-003 · RLS enabled on database tables",
      "SEC-004 · Server-side session validation on protected routes",
      "SEC-005 · Input validated before database writes",
      "SEC-006 · No eval() or dynamic require() in application code",
    ],
  },
  {
    id: "accessibility",
    name: "Accessibility",
    color: "#6a4c93",
    description:
      "Evaluates WCAG 2.1 compliance signals in source: alt attributes, ARIA labels, skip-to-content links, heading hierarchy, color contrast annotations, and keyboard focus management.",
    checks: [
      "A11Y-001 · Image alt attributes present",
      "A11Y-002 · ARIA labels on interactive elements",
      "A11Y-003 · Heading hierarchy (h1→h2→h3)",
      "A11Y-004 · Keyboard focus indicators",
      "A11Y-005 · Skip-to-content link present",
    ],
  },
  {
    id: "performance",
    name: "Performance",
    color: "#c08a1e",
    description:
      "Scores bundle hygiene, image optimization, caching strategies, and Core Web Vitals indicators detectable in source. Rewards projects with lazy loading, font optimization, and proper caching headers.",
    checks: [
      "PERF-001 · Image optimization (next/image or equivalent)",
      "PERF-002 · Dynamic imports for heavy components",
      "PERF-003 · Cache headers on static assets",
      "PERF-004 · No blocking scripts in <head>",
      "PERF-005 · Font subsetting / display: swap",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    color: "#3f7d52",
    description:
      "Measures SEO fundamentals (meta tags, robots.txt, sitemap), social sharing cards (OG/Twitter), analytics integration, and viral-loop infrastructure. Most vibe-coded apps score lowest here.",
    checks: [
      "SEO-001 · <title> and <meta description> on all pages",
      "SEO-002 · Open Graph tags (og:title, og:image)",
      "SEO-003 · robots.txt present",
      "SEO-004 · sitemap.xml or sitemap generation",
      "SEO-005 · Twitter/X card meta tags",
      "SEO-006 · Canonical URL set",
    ],
  },
  {
    id: "code_quality",
    name: "Code Quality",
    color: "#3d6e8c",
    description:
      "Analyzes TypeScript coverage, test presence, ESLint configuration, dead code ratio, and component complexity. A proxy for long-term maintainability.",
    checks: [
      "QA-001 · TypeScript strict mode",
      "QA-002 · Test files present (Vitest / Jest / Playwright)",
      "QA-003 · ESLint configured",
      "QA-004 · No console.log in production paths",
    ],
  },
  {
    id: "infra",
    name: "Infra",
    color: "#5c6b73",
    description:
      "Checks deployment configuration, environment variable management, CI/CD presence, and error monitoring setup.",
    checks: [
      "INFRA-001 · Deployment config present (vercel.json, fly.toml, etc.)",
      "INFRA-002 · Environment variables documented (.env.example)",
      "INFRA-003 · Error monitoring integrated (Sentry, etc.)",
    ],
  },
];

const GRADE_BOUNDARIES = [
  { grade: "A+", min: 97, color: "#3f7d52", label: "Exceptional" },
  { grade: "A", min: 85, color: "#3f7d52", label: "Strong" },
  { grade: "B", min: 70, color: "#3d6e8c", label: "Good" },
  { grade: "C", min: 55, color: "#c08a1e", label: "Needs work" },
  { grade: "D", min: 40, color: "#b23b3b", label: "Poor" },
  { grade: "F", min: 0, color: "#b23b3b", label: "Failing" },
];

export default async function MethodologyPage() {
  const scanCount = await getScanCount();
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-16">
      {/* Header */}
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">
          How it works
        </span>
        <h1 className="font-display text-3xl text-ink mt-2">Methodology</h1>
        <p className="font-body text-base text-ink-muted mt-3 max-w-2xl leading-relaxed">
          ShipRank runs deterministic static analysis across 9 quality
          stations. No LLM in the loop — every check is a pattern match or
          structural test against your source code, so the same project always
          produces the same score. Station scores are weighted and combined
          into a single ShipScore (0–100).
        </p>
      </div>

      {/* Grade boundaries */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Grade Boundaries</h2>
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Grade</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Min Score</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Label</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_BOUNDARIES.map((g) => (
                <tr key={g.grade} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <span
                      className="font-mono text-sm font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${g.color}18`,
                        color: g.color,
                      }}
                    >
                      {g.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-sm text-ink">
                    ≥ {g.min}
                  </td>
                  <td className="px-5 py-3 font-body text-sm text-ink-muted">
                    {g.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-body text-xs text-ink-subtle">
          {scanCount != null
            ? `Boundaries are derived from the distribution of real scans (n=${scanCount.toLocaleString()} so far) — they may shift as the dataset grows. With a sample this ${scanCount < 50 ? "small, treat them as provisional" : "size, they're reasonably stable"}.`
            : "Boundaries are derived from the distribution of real scans — they may shift as the dataset grows."}
        </p>
      </section>

      {/* Stations */}
      <section className="flex flex-col gap-6">
        <h2 className="font-display text-xl text-ink">Stations</h2>
        <div className="flex flex-col gap-5">
          {STATIONS.map((station) => (
            <div
              key={station.id}
              className="rounded-lg border border-border bg-surface p-6 shadow-sm flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: station.color }}
                />
                <h3 className="font-display text-lg text-ink">
                  {station.name}
                </h3>
              </div>
              <p className="font-body text-sm text-ink-muted leading-relaxed">
                {station.description}
              </p>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-xs text-ink-subtle marker:content-none">
                  <span className="transition-transform group-open:rotate-90">▸</span>
                  {station.checks.length} checks in this station
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {station.checks.map((check) => {
                    const [checkId, ...rest] = check.split(" · ");
                    const checkDesc = rest.join(" · ");
                    return (
                      <div key={check} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
                          style={{ backgroundColor: `${station.color}15`, color: station.color }}
                        >
                          {checkId}
                        </span>
                        <span className="font-body text-sm text-ink-muted">
                          {checkDesc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* Fingerprint */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Platform Fingerprint</h2>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="font-body text-sm text-ink-muted leading-relaxed">
            ShipRank detects which AI platform generated your code — Lovable,
            Bolt, Cursor, V0, and others — by analyzing comment patterns,
            metadata files, and structural signatures. Detection requires a
            high-confidence signal; unrecognized projects are labeled{" "}
            <code className="font-mono text-xs bg-surface-sunken px-1 rounded">
              unknown
            </code>
            . You can correct a misattribution by calling{" "}
            <code className="font-mono text-xs bg-surface-sunken px-1 rounded">
              POST /api/attribute
            </code>
            .
          </p>
        </div>
      </section>

      {/* Remediation */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl text-ink">Remediation Ranking</h2>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="font-body text-sm text-ink-muted leading-relaxed">
            The &ldquo;Fix these 3&rdquo; recommendations are sorted by ROI: score gain per
            minute of implementation effort. A failing SEO check that takes 5
            minutes to fix ranks above a failing security check that takes 2
            hours — even if the security check is labeled critical. The critical
            label is severity information; the fix list is time-to-score
            optimization. Fix critical issues regardless of their ROI position.
          </p>
        </div>
      </section>
    </div>
  );
}
