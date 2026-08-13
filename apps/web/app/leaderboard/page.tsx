import type { Metadata } from "next";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { formatPlatformName } from "@/lib/format-names";
import { LeaderboardTable } from "../components/leaderboard-table";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "AI platform and framework rankings by ShipScore — quality, security, and growth data from real scans.",
  alternates: { canonical: "/leaderboard" },
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
  provenance: "seed" | "self-reported" | "verified" | null;
}

interface AggregatRow {
  name: string;
  avgScore: number;
  projectCount: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const tint = [
      "bg-brand-soft text-brand-ink border-brand/30",
      "bg-surface-raised text-ink-muted border-border-strong",
      "bg-warning-soft text-warning-ink border-warning/30",
    ][rank - 1];
    return (
      <span
        className={`grid size-6 place-items-center rounded-full border font-mono text-xs ${tint}`}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="grid size-6 place-items-center font-mono text-xs text-ink-subtle">
      {rank}
    </span>
  );
}

function ScoreCell({ score }: { score: number }) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken lg:block">
        <div
          className="h-full rounded-full bg-linear-to-r from-brand to-brand-hover"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-sm text-ink">{score}</span>
    </div>
  );
}

function AggTable({ title, rows }: { title: string; rows: AggregatRow[] }) {
  if (!rows.length) return null;
  return (
    <div>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-subtle">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised/60">
              <th className="px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle">
                #
              </th>
              <th className="px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle">
                Name
              </th>
              <th className="px-5 py-3 text-right font-mono text-xs font-normal text-ink-subtle">
                Avg score
              </th>
              <th className="px-5 py-3 text-right font-mono text-xs font-normal text-ink-subtle">
                Projects
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className="border-b border-border/70 transition-colors last:border-0 hover:bg-surface-raised/40"
              >
                <td className="px-5 py-3">
                  <RankBadge rank={i + 1} />
                </td>
                <td className="px-5 py-3 font-body text-sm text-ink">
                  {formatPlatformName(row.name)}
                </td>
                <td className="px-5 py-3">
                  <ScoreCell score={row.avgScore} />
                </td>
                <td className="px-5 py-3 text-right font-mono text-xs text-ink-subtle">
                  {row.projectCount.toLocaleString()}
                </td>
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
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border-strong bg-surface/60 p-16 text-center">
      <p className="font-display text-2xl text-ink">The board is open</p>
      <p className="mx-auto max-w-sm font-body text-sm leading-relaxed text-ink-muted">
        No scans ranked yet. The first project to upload sets the baseline —
        and takes the #1 spot by default.
      </p>
      <code className="mx-auto rounded-lg border border-border bg-surface px-4 py-2.5 font-mono text-sm text-ink shadow-sm">
        npx shiprank ./your-project --upload
      </code>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface px-5 py-3.5 shadow-sm">
      <span className="font-mono text-xl text-ink">{value}</span>
      <span className="font-body text-xs text-ink-subtle">{label}</span>
    </div>
  );
}

export default async function LeaderboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-body text-ink-muted">
            Leaderboard unavailable — database not configured.
          </p>
        </div>
      </div>
    );
  }

  const db = getServiceClient();
  const baseCols =
    "scan_id, project_name, platform, framework, score, grade, scanned_at, station_scores";
  // Try with provenance (post migration 00004); fall back without it so the
  // page keeps rendering before the migration is applied.
  let raw: unknown[] | null = null;
  const withProv = await db
    .from("leaderboard_entries")
    .select(baseCols + ", provenance")
    .order("score", { ascending: false })
    .limit(100);
  if (!withProv.error) {
    raw = withProv.data;
  } else {
    const base = await db
      .from("leaderboard_entries")
      .select(baseCols)
      .order("score", { ascending: false })
      .limit(100);
    raw = base.data;
  }

  const entries = (raw ?? []) as unknown as LeaderboardEntry[];

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
    .map(([name, { total, count }]) => ({
      name,
      avgScore: Math.round(total / count),
      projectCount: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const frameworkRows: AggregatRow[] = Object.entries(byFramework)
    .map(([name, { total, count }]) => ({
      name,
      avgScore: Math.round(total / count),
      projectCount: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  const avgScore = entries.length
    ? Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length)
    : 0;
  const topScore = entries.length ? entries[0]!.score : 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-brand">
            Rankings
          </span>
          <h1 className="mt-2 font-display text-4xl text-ink">Leaderboard</h1>
          <p className="mt-2 max-w-lg font-body text-sm leading-relaxed text-ink-muted">
            Real scans of AI-built projects, ranked by ShipScore — a composite
            of security, code quality, performance, accessibility, and 5 more
            stations. Higher is better. Updated with every upload.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="flex gap-3">
            <StatChip label="projects scanned" value={entries.length.toLocaleString()} />
            <StatChip label="average score" value={String(avgScore)} />
            <StatChip label="top score" value={String(topScore)} />
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <AggTable title="By platform" rows={platformRows} />
            <AggTable title="By framework" rows={frameworkRows} />
          </div>

          <LeaderboardTable entries={entries} />
        </>
      )}
    </div>
  );
}
