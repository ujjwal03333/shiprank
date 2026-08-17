import type { Metadata } from "next";
import Link from "next/link";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { formatModelName } from "@/lib/format-names";
import { rankModels, type ModelScanRow } from "@/lib/model-rankings";
import { STATION_LABEL } from "@/lib/grade";
import { ModelDrilldown } from "./model-drilldown";

export const metadata: Metadata = {
  title: "Model rankings",
  description: "AI models ranked by the production quality of code they ship.",
  alternates: { canonical: "/models" },
};

export const revalidate = 60;

export default async function ModelsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="font-body text-ink-muted">Database not configured.</p>
      </div>
    );
  }

  const db = getServiceClient();
  const { data } = await db
    .from("leaderboard_entries")
    .select("scan_id, score, station_scores, project_id");

  const entries = (data ?? []) as Array<{
    scan_id: string;
    score: number;
    station_scores: Record<string, number> | null;
    project_id: string;
  }>;

  const scanIds = entries.map((e) => e.scan_id).filter(Boolean);
  const modelByScan = new Map<string, string>();
  if (scanIds.length > 0) {
    const { data: fps } = await db
      .from("fingerprints")
      .select("scan_id, metadata")
      .in("scan_id", scanIds);
    for (const fp of fps ?? []) {
      const model = (fp.metadata as { model?: string | null } | null)?.model;
      if (typeof model === "string" && model.length > 0) {
        modelByScan.set(fp.scan_id as string, model);
      }
    }
  }

  const rows: ModelScanRow[] = entries.map((e) => ({
    model: modelByScan.get(e.scan_id) ?? "unknown",
    score: e.score,
    stationScores: e.station_scores ?? {},
    scanId: e.scan_id,
  }));

  const rankings = rankModels(rows);
  const totalScans = rows.length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-brand">
          Models
        </span>
        <h1 className="mt-2 font-display text-4xl text-ink">Model rankings</h1>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Live ranking of detected AI models by average ShipScore. Volume
          gates confidence — we never invent a ranking from a handful of
          scans.
        </p>
      </div>

      {totalScans < 20 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft/40 px-5 py-4">
          <p className="font-body text-sm text-warning-ink">
            Rankings stabilize with more data. Currently based on {totalScans}{" "}
            {totalScans === 1 ? "scan" : "scans"}.{" "}
            <Link href="/dare" className="underline hover:no-underline">
              Contribute →
            </Link>
          </p>
        </div>
      )}

      {rankings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-16 text-center">
          <p className="font-display text-2xl text-ink">No model data yet</p>
          <p className="mt-2 font-body text-sm text-ink-muted">
            The leaderboard is empty. Be the first to dare a repo →
          </p>
          <Link
            href="/dare"
            className="press mt-6 inline-flex rounded-lg bg-brand px-5 py-2.5 font-body text-sm text-ink-onbrand hover:bg-brand-hover"
          >
            Dare a public repo
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60">
                <th className="px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle">Rank</th>
                <th className="px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle">Model</th>
                <th className="px-5 py-3 text-right font-mono text-xs font-normal text-ink-subtle">Avg</th>
                <th className="px-5 py-3 text-right font-mono text-xs font-normal text-ink-subtle">Scans</th>
                <th className="hidden px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle sm:table-cell">Best</th>
                <th className="hidden px-5 py-3 text-left font-mono text-xs font-normal text-ink-subtle md:table-cell">Worst</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((row, i) => (
                <tr key={row.model} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{i + 1}</td>
                  <td className="px-5 py-3">
                    <details>
                      <summary className={`cursor-pointer list-none font-body text-sm ${row.confidence === "none" ? "text-ink-subtle" : "text-ink"}`}>
                        {formatModelName(row.model)}
                        {row.confidence === "none" && (
                          <span className="ml-2 font-mono text-[10px] uppercase text-ink-subtle">
                            Not enough data
                          </span>
                        )}
                        {row.confidence === "low" && (
                          <span className="ml-2 rounded bg-warning-soft px-1.5 py-0.5 font-mono text-[10px] text-warning-ink">
                            Low confidence
                          </span>
                        )}
                      </summary>
                      <div className="mt-3">
                        <ModelDrilldown ranking={row} />
                      </div>
                    </details>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm text-ink">
                    {row.confidence === "none" ? "—" : row.avgScore}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs text-ink-muted">
                    {row.scanCount}
                  </td>
                  <td className="hidden px-5 py-3 font-body text-xs text-ink-muted sm:table-cell">
                    {row.bestStation ? (STATION_LABEL[row.bestStation] ?? row.bestStation) : "—"}
                  </td>
                  <td className="hidden px-5 py-3 font-body text-xs text-ink-muted md:table-cell">
                    {row.worstStation ? (STATION_LABEL[row.worstStation] ?? row.worstStation) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
