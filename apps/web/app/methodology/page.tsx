import type { Metadata } from "next";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the grade is made. Same code, same check version, same score.",
  alternates: { canonical: "/methodology" },
};

async function getScanCount(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const db = getServiceClient();
    const { count } = await db
      .from("leaderboard_entries")
      .select("scan_id", { count: "exact", head: true })
      .neq("provenance", "seed");
    return count ?? 0;
  } catch {
    return null;
  }
}

const STATIONS = [
  {
    id: "security",
    name: "Security",
    weight: 45,
    color: "var(--color-danger)",
    description:
      "What an attacker can use. A failing security P0 caps the grade at D. Row-level security is proposed as SQL and never applied.",
    checks: [
      "SEC-001 · No secrets in source",
      "SEC-031 · No privileged key in NEXT_PUBLIC or VITE",
      "SEC-003 · RLS enabled on database tables",
      "SEC-032 · RLS policies are not USING (true)",
      "SEC-004 · Auth is enforced on the server",
      "SEC-012 · Webhooks verify signatures",
      "SEC-033 · CSP, HSTS, X-Frame-Options DENY, nosniff",
      "SEC-019 · dangerouslySetInnerHTML is not user content",
      "SEC-034 · Authed routes do not allow open CORS",
    ],
  },
  {
    id: "healthy",
    name: "Healthy",
    weight: 30,
    color: "var(--color-info)",
    description:
      "Whether the product can be occupied. A repo with no auth and no data is not a B — the grade caps at C, reason “not a product yet.”",
    checks: [
      "COMP-004 · Users can delete their data",
      "HEAL-002 · No empty catch",
      "HEAL-003 · Loading, empty, and error UI",
      "HEAL-004 · No live payment keys in source",
      "HEAL-005 · Logs do not contain emails, tokens, or user objects",
      "HEAL-006 · A 404 page exists",
      "HEAL-007 · robots.txt exists",
      "HEAL-008 · Login and signup are rate limited",
    ],
  },
  {
    id: "human",
    name: "Human",
    weight: 25,
    color: "var(--color-brand)",
    description:
      "Whether the interface is slop. If it looks clickable and does nothing, it is charged. A dead primary CTA caps the grade at D.",
    checks: [
      "HUM-001 · div with onClick is a button",
      "HUM-002 · No href=\"#\"",
      "HUM-003 · No TODO or empty handlers",
      "HUM-004 · Primary CTA does something",
      "HUM-005 · Heading order is sane",
      "HUM-006 · No lorem, TODO, or John Doe in the UI",
      "HUM-007 · Errors say what failed",
      "HUM-008 · outline-none does not hide focus",
      "HUM-009 · Clickable controls do something",
    ],
  },
];

const GRADE_BOUNDARIES = [
  { grade: "A+", min: 97, token: "var(--color-grade-a)", label: "Exceptional" },
  { grade: "A", min: 85, token: "var(--color-grade-a)", label: "Strong" },
  { grade: "B", min: 70, token: "var(--color-grade-b)", label: "Good" },
  { grade: "C", min: 55, token: "var(--color-grade-c)", label: "Needs work" },
  { grade: "D", min: 40, token: "var(--color-grade-d)", label: "Poor" },
  { grade: "F", min: 0, token: "var(--color-grade-f)", label: "Failing" },
];

export default async function MethodologyPage() {
  const scanCount = await getScanCount();
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 flex flex-col gap-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          GRADE
        </span>
        <h1 className="font-display text-3xl text-ink">How the grade is made</h1>
        <p className="max-w-md font-body text-sm leading-relaxed text-ink-muted">
          Same code. Same check version. Same score. Static analysis — no LLM
          in the scoring path.
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
                      style={{ color: g.token }}
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

      <details className="border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
          Stations
        </summary>
        <div className="flex flex-col gap-5 border-t border-border px-5 py-6">
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
                  <span className="ml-2 font-mono text-xs text-ink-subtle">{station.weight}</span>
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
      </details>

      <details className="border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
          Platform fingerprint
        </summary>
        <div className="border-t border-border px-5 py-6">
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
      </details>

      <details className="border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
          How one contract is picked
        </summary>
        <div className="border-t border-border px-5 py-6">
          <p className="font-body text-sm text-ink-muted leading-relaxed">
            The grade is the weighted mean of Security (45), Healthy (30), and Human (25). A check we cannot detect is excluded, never counted as a pass. Fewer than 12 applicable checks cannot score above C. The docket is at most seven charges, worst of each lane first. Close issues one contract: the first charge that has a file path. “Why the AI did this” only renders when the profiler saw an agent.
          </p>
        </div>
      </details>
    </div>
  );
}
