"use client";

import { useState, useEffect } from "react";
import { formatPlatformName } from "@/lib/format-names";

interface LeaderboardEntry {
  platform?: string;
  framework?: string;
  avgScore: number;
  projectCount: number;
}

interface LeaderboardData {
  platformLeaderboard: LeaderboardEntry[];
  frameworkLeaderboard: LeaderboardEntry[];
}

function RankRow({
  rank,
  name,
  score,
  count,
}: {
  rank: number;
  name: string;
  score: number;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs ${
          rank === 1
            ? "bg-brand-soft text-brand-ink"
            : "text-ink-subtle"
        }`}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-body text-sm text-ink">
        {formatPlatformName(name)}
      </span>
      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken sm:block">
        <div
          className="grow-bar h-full rounded-full bg-linear-to-r from-brand to-brand-hover"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-sm text-ink">{score}</span>
      <span className="w-14 text-right font-mono text-xs text-ink-subtle">
        {count} {count === 1 ? "scan" : "scans"}
      </span>
    </div>
  );
}

function RankPanel({
  title,
  rows,
  nameKey,
}: {
  title: string;
  rows: LeaderboardEntry[];
  nameKey: "platform" | "framework";
}) {
  return (
    <div className="card-hover overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-surface-raised/60 px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
          {title}
        </span>
      </div>
      {rows.slice(0, 5).map((row, i) => (
        <RankRow
          key={row[nameKey] ?? i}
          rank={i + 1}
          name={row[nameKey] ?? "Unknown"}
          score={row.avgScore}
          count={row.projectCount}
        />
      ))}
    </div>
  );
}

export function LeaderboardPreview() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<LeaderboardData>;
      })
      .then((json) => {
        if (!alive) return;
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-56 rounded-xl border border-border" />
        ))}
      </div>
    );
  }

  const hasData =
    data &&
    (data.platformLeaderboard.length > 0 ||
      data.frameworkLeaderboard.length > 0);

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface/60 p-10 text-center">
        <p className="font-display text-lg text-ink">Leaderboard loading failed</p>
        <p className="mx-auto mt-2 max-w-sm font-body text-sm text-ink-muted">
          We couldn&apos;t load the rankings right now. Check back in a moment.
        </p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-surface/60 p-10 text-center">
        <p className="font-display text-lg text-ink">The board is open</p>
        <p className="mx-auto mt-2 max-w-sm font-body text-sm text-ink-muted">
          No scans ranked yet — the first project to upload sets the baseline.
        </p>
        <code className="mt-4 inline-block rounded-lg border border-border bg-surface-sunken px-4 py-2 font-mono text-sm text-ink">
          npx shiprank ./your-project --upload
        </code>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <RankPanel
          title="By platform"
          rows={data.platformLeaderboard}
          nameKey="platform"
        />
        <RankPanel
          title="By framework"
          rows={data.frameworkLeaderboard}
          nameKey="framework"
        />
      </div>
      <a
        href="/leaderboard"
        className="group inline-flex items-center gap-1.5 self-start font-body text-sm text-brand transition-colors hover:text-brand-hover"
      >
        See the full leaderboard
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </a>
    </div>
  );
}
