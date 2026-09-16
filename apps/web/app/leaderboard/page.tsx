import type { Metadata } from "next";
import Link from "next/link";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { formatPlatformName } from "@/lib/format-names";
import { publicBoardEntries } from "@/lib/provenance";
import { cardPath } from "@/lib/public-url";
import { LeaderboardTable } from "../components/leaderboard-table";
import { ShipCard } from "../components/ship-card";

export const metadata: Metadata = {
  title: "Board",
  description: "Public grades. Real repos. Same engine.",
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

export default async function LeaderboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-center font-body text-ink-muted">
          Board unavailable — database not configured.
        </p>
      </div>
    );
  }

  const db = getServiceClient();
  const baseCols =
    "scan_id, project_name, platform, framework, score, grade, scanned_at, station_scores";
  let raw: unknown[] | null = null;
  let loadError = false;
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
    if (base.error) {
      loadError = true;
      raw = [];
    } else {
      raw = base.data;
    }
  }

  const entries = publicBoardEntries(
    (raw ?? []) as unknown as LeaderboardEntry[],
  );

  const wall = [...entries]
    .filter((e) => typeof e.scan_id === "string")
    .sort(
      (a, b) =>
        new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime(),
    );

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

  const hasNumbers = platformRows.length > 0 || frameworkRows.length > 0;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-12 px-6 py-14">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-brand">
          LIVE
        </span>
        <h1 className="font-display text-4xl text-ink">Board</h1>
        <p className="font-body text-sm text-ink-muted">
          Public grades. Real repos. Same engine.
        </p>
      </div>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-body text-sm text-ink-muted">
            Couldn&apos;t load the board. Try again in a minute.
          </p>
          <Link
            href="/dare"
            className="font-mono text-xs text-ink hover:text-brand-ink"
          >
            Dare a repo →
          </Link>
        </div>
      ) : wall.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-mono text-xs text-ink-subtle">
            The board is empty. Be the first dare.
          </p>
          <Link
            href="/dare"
            className="font-mono text-xs text-ink hover:text-brand-ink"
          >
            Dare a repo →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wall.map((card) => (
            <ShipCard
              key={card.scan_id}
              score={card.score}
              grade={card.grade}
              projectName={card.project_name}
              platform={
                card.platform ? formatPlatformName(card.platform) : null
              }
              href={cardPath(card.scan_id!)}
              size="board"
              staticStamp
            />
          ))}
        </div>
      )}

      {entries.length > 0 ? (
        <div className="flex flex-col gap-10">
          <LeaderboardTable entries={entries} />
          {hasNumbers ? (
            <details className="border border-border bg-surface">
              <summary className="cursor-pointer px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
                Numbers
              </summary>
              <div className="grid gap-6 border-t border-border px-5 py-6 sm:grid-cols-2">
                <AggTable title="By platform" rows={platformRows} />
                <AggTable title="By framework" rows={frameworkRows} />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
