import type { Metadata } from "next";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { gradeBadgeClass } from "@/lib/grade";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "AI platform and framework rankings by ShipScore — quality, security, and growth data from real scans.",
};

export const revalidate = 60;

interface LeaderboardEntry {
  scan_id: string | null;
  project_name: string;
  platform: string | null;
  framework: string | null;
  score: number;
  grade: string;
  scanned_at: string;
  station_scores: Record<string, number> | null;
}

interface AggregatRow {
  name: string;
  avgScore: number;
  projectCount: number;
}

function AggTable({ title, rows }: { title: string; rows: AggregatRow[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <h2 className="font-mono text-xs text-ink-subtle uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">#</th>
              <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Name</th>
              <th className="px-5 py-3 text-right font-mono text-xs text-ink-subtle">Avg Score</th>
              <th className="px-5 py-3 text-right font-mono text-xs text-ink-subtle">Projects</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className="border-b border-border last:border-0 hover:bg-surface-raised/40 transition-colors"
              >
                <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{i + 1}</td>
                <td className="px-5 py-3 font-body text-sm text-ink capitalize">{row.name}</td>
                <td className="px-5 py-3 font-mono text-sm text-ink text-right">{row.avgScore}</td>
                <td className="px-5 py-3 font-mono text-xs text-ink-subtle text-right">{row.projectCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-surface p-16 text-center flex flex-col gap-4">
      <p className="font-display text-xl text-ink">No scans yet</p>
      <p className="font-body text-sm text-ink-muted max-w-sm mx-auto">
        Be the first to add your project to the leaderboard.
      </p>
      <code className="font-mono text-sm bg-surface-sunken border border-border px-4 py-2 rounded-md text-ink mx-auto">
        npx shiprank ./your-project --upload
      </code>
    </div>
  );
}

export default async function LeaderboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-body text-ink-muted">
            Leaderboard unavailable — database not configured.
          </p>
        </div>
      </div>
    );
  }

  const db = getServiceClient();
  const { data: raw } = await db
    .from("leaderboard_entries")
    .select("scan_id, project_name, platform, framework, score, grade, scanned_at, station_scores")
    .order("score", { ascending: false })
    .limit(100);

  const entries = (raw ?? []) as LeaderboardEntry[];

  const byPlatform: Record<string, { total: number; count: number }> = {};
  const byFramework: Record<string, { total: number; count: number }> = {};

  for (const e of entries) {
    const plat = e.platform ?? "unknown";
    byPlatform[plat] ??= { total: 0, count: 0 };
    byPlatform[plat]!.total += e.score;
    byPlatform[plat]!.count++;

    const fw = e.framework ?? "unknown";
    byFramework[fw] ??= { total: 0, count: 0 };
    byFramework[fw]!.total += e.score;
    byFramework[fw]!.count++;
  }

  const platformRows: AggregatRow[] = Object.entries(byPlatform)
    .map(([name, { total, count }]) => ({ name, avgScore: Math.round(total / count), projectCount: count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const frameworkRows: AggregatRow[] = Object.entries(byFramework)
    .map(([name, { total, count }]) => ({ name, avgScore: Math.round(total / count), projectCount: count }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-12">
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">
          Rankings
        </span>
        <h1 className="font-display text-3xl text-ink mt-2">Leaderboard</h1>
        <p className="font-body text-sm text-ink-muted mt-2">
          {entries.length} project{entries.length !== 1 ? "s" : ""} scanned.
          Updated every scan.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-6">
            <AggTable title="By Platform" rows={platformRows} />
            <AggTable title="By Framework" rows={frameworkRows} />
          </div>

          <div>
            <h2 className="font-mono text-xs text-ink-subtle uppercase tracking-widest mb-3">
              All scans
            </h2>
            <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-raised">
                    <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">#</th>
                    <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Project</th>
                    <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle hidden sm:table-cell">Platform</th>
                    <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle hidden md:table-cell">Framework</th>
                    <th className="px-5 py-3 text-right font-mono text-xs text-ink-subtle">Score</th>
                    <th className="px-5 py-3 text-right font-mono text-xs text-ink-subtle">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr
                      key={`${e.project_name}-${e.scanned_at}`}
                      className="border-b border-border last:border-0 hover:bg-surface-raised/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{i + 1}</td>
                      <td className="px-5 py-3 font-body text-sm text-ink">
                        {e.scan_id ? (
                          <a href={`/scan/${e.scan_id}`} className="hover:text-brand hover:underline transition-colors">
                            {e.project_name}
                          </a>
                        ) : e.project_name}
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-ink-muted capitalize hidden sm:table-cell">
                        {e.platform ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-body text-sm text-ink-muted hidden md:table-cell">
                        {e.framework ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-sm text-ink text-right">{e.score}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${gradeBadgeClass(e.grade)}`}>
                          {e.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
