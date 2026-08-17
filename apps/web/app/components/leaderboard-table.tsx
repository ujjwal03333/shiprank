"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { gradeBadgeClass } from "@/lib/grade";
import { formatPlatformName, timeAgo } from "@/lib/format-names";

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

const PROVENANCE_BADGE: Record<string, string> = {
  verified: "bg-success-soft text-success-ink",
  seed: "bg-surface-sunken text-ink-subtle",
  "self-reported": "bg-info-soft text-info-ink",
};

function ProvenanceBadge({ tier }: { tier: string | null }) {
  const t = tier ?? "self-reported";
  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${PROVENANCE_BADGE[t] ?? PROVENANCE_BADGE["self-reported"]}`}
      title={
        t === "verified"
          ? "Produced by the ShipRank CLI upload path"
          : t === "seed"
            ? "Hand-seeded demo data"
            : "Self-reported"
      }
    >
      {t === "self-reported" ? "self" : t}
    </span>
  );
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

type SortKey = "score-desc" | "score-asc" | "date-desc" | "date-asc";

const PAGE_SIZE = 20;

function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-surface px-3 py-1.5 font-body text-xs text-ink outline-none transition-colors focus:border-brand/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("score-desc");
  const [page, setPage] = useState(0);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) set.add(e.platform ?? "unknown");
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    let rows = entries;
    if (platformFilter !== "all") {
      rows = rows.filter((e) => (e.platform ?? "unknown") === platformFilter);
    }
    const sorted = [...rows].sort((a, b) => {
      switch (sort) {
        case "score-desc":
          return b.score - a.score;
        case "score-asc":
          return a.score - b.score;
        case "date-desc":
          return new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime();
        case "date-asc":
          return new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime();
      }
    });
    return sorted;
  }, [entries, platformFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  function updateFilter(next: string) {
    setPlatformFilter(next);
    setPage(0);
  }

  function updateSort(next: string) {
    setSort(next as SortKey);
    setPage(0);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
          All scans
        </h2>
        <div className="flex items-center gap-2">
          <FilterSelect
            ariaLabel="Filter by platform"
            value={platformFilter}
            onChange={updateFilter}
            options={[
              { value: "all", label: "All platforms" },
              ...platforms.map((p) => ({ value: p, label: formatPlatformName(p) })),
            ]}
          />
          <FilterSelect
            ariaLabel="Sort by"
            value={sort}
            onChange={updateSort}
            options={[
              { value: "score-desc", label: "Score: high to low" },
              { value: "score-asc", label: "Score: low to high" },
              { value: "date-desc", label: "Newest first" },
              { value: "date-asc", label: "Oldest first" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60">
                <th className="px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle">
                  #
                </th>
                <th className="px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle">
                  Project
                </th>
                <th className="hidden px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle sm:table-cell">
                  Platform
                </th>
                <th className="hidden px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle md:table-cell">
                  Framework
                </th>
                <th className="hidden px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle lg:table-cell">
                  Scanned
                </th>
                <th className="px-5 py-3 text-right font-mono text-xs font-normal text-ink-subtle">
                  Score
                </th>
                <th className="px-5 py-3 text-right font-mono text-xs font-normal text-ink-subtle">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((e, i) => (
                <tr
                  key={`${e.project_name}-${e.scanned_at}`}
                  className="border-b border-border/70 transition-colors last:border-0 hover:bg-surface-raised/40"
                >
                  <td className="px-5 py-3">
                    <RankBadge rank={clampedPage * PAGE_SIZE + i + 1} />
                  </td>
                  <td className="px-5 py-3 font-body text-sm text-ink">
                    <span className="flex items-center gap-2">
                      {e.scan_id ? (
                        <Link
                          href={`/scan/${e.scan_id}`}
                          className="transition-colors hover:text-brand hover:underline"
                        >
                          {e.project_name}
                        </Link>
                      ) : (
                        e.project_name
                      )}
                      <ProvenanceBadge tier={e.provenance} />
                    </span>
                  </td>
                  <td className="hidden px-5 py-3 font-body text-sm text-ink-muted sm:table-cell">
                    {formatPlatformName(e.platform)}
                  </td>
                  <td className="hidden px-5 py-3 font-body text-sm text-ink-muted md:table-cell">
                    {e.framework ?? "—"}
                  </td>
                  <td className="hidden px-5 py-3 font-body text-xs text-ink-subtle lg:table-cell">
                    {timeAgo(e.scanned_at)}
                  </td>
                  <td className="px-5 py-3">
                    <ScoreCell score={e.score} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-xs ${gradeBadgeClass(e.grade)}`}
                    >
                      {e.grade}
                    </span>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center font-body text-sm text-ink-subtle">
                    No scans match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-ink-subtle">
            Page {clampedPage + 1} of {totalPages} · {filtered.length.toLocaleString()} scans
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
              className="press rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={clampedPage >= totalPages - 1}
              className="press rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
