import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolvePlanForApiKey, SESSION_COOKIE } from "@/lib/subscription";
import { fetchProjectScanPoints } from "@/lib/scan-history";
import { computeVelocity } from "@/lib/velocity";
import { timeAgo } from "@/lib/format-names";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your monitored projects — current score, last scan, and trend.",
};

interface MonitoredRow {
  id: string;
  repo_url: string;
  scan_frequency: string;
  last_scanned_at: string | null;
  next_scan_at: string;
  project_id: string | null;
  projects: { id: string; name: string } | null;
}

function TrendArrow({ direction }: { direction: "up" | "down" | "flat" | null }) {
  if (!direction) return <span className="font-mono text-xs text-ink-subtle">—</span>;
  const glyph = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const tone =
    direction === "up" ? "text-success-ink" : direction === "down" ? "text-danger-ink" : "text-ink-muted";
  return <span className={`font-mono text-sm ${tone}`}>{glyph}</span>;
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="font-body text-ink-muted">Database not configured.</p>
      </div>
    );
  }

  const db = getServiceClient();
  const cookieStore = await cookies();
  const apiKey = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const resolved = await resolvePlanForApiKey(db, apiKey);

  if (resolved.plan !== "monitor") {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12 flex flex-col gap-8">
        <div>
          <span className="font-mono text-xs text-brand uppercase tracking-widest">Dashboard</span>
          <h1 className="font-display text-2xl text-ink mt-2">Monitored projects</h1>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
          <div aria-hidden className="pointer-events-none select-none blur-[3px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised">
                  <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Project</th>
                  <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Score</th>
                  <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Trend</th>
                  <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Last scan</th>
                  <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Frequency</th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {[
                  { name: "checkout-service", score: 91, trend: "↑", last: "3h ago", freq: "daily" },
                  { name: "marketing-site", score: 78, trend: "→", last: "1d ago", freq: "weekly" },
                  { name: "internal-tools", score: 64, trend: "↓", last: "2d ago", freq: "weekly" },
                ].map((r) => (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-body text-sm text-ink">{r.name}</td>
                    <td className="px-5 py-3 font-mono text-sm text-ink">{r.score}</td>
                    <td className="px-5 py-3 font-mono text-sm text-ink-muted">{r.trend}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{r.last}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{r.freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/70 p-8 text-center">
            <h2 className="font-display text-lg text-ink">Monitor-tier feature</h2>
            <p className="font-body text-sm text-ink-muted max-w-sm">
              Continuous re-scanning, regression alerts, and this dashboard are
              part of the Monitor plan.
            </p>
            <Link
              href="/pricing"
              className="press mt-1 rounded-md bg-brand px-4 py-2.5 font-body text-sm text-ink-onbrand transition-colors hover:bg-brand-hover"
            >
              View plans →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: monitored } = await db
    .from("monitored_projects")
    .select("id, repo_url, scan_frequency, last_scanned_at, next_scan_at, project_id, projects ( id, name )")
    .eq("subscription_id", resolved.subscriptionId as string);

  const rows = (monitored ?? []) as unknown as MonitoredRow[];

  const enriched = await Promise.all(
    rows.map(async (row) => {
      if (!row.project_id) {
        return { ...row, score: null, direction: null as "up" | "down" | "flat" | null };
      }
      const points = await fetchProjectScanPoints(db, row.project_id);
      const latest = points[points.length - 1] ?? null;
      const velocity = computeVelocity(points).latest;
      return {
        ...row,
        score: latest?.score ?? null,
        direction: velocity?.direction ?? null,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 flex flex-col gap-8">
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">Dashboard</span>
        <h1 className="font-display text-2xl text-ink mt-2">Monitored projects</h1>
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-body text-sm text-ink-muted">
            No monitored projects yet. Enable monitoring from any scan result page.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Project</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Score</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Trend</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Last scan</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-body text-sm text-ink">
                    {row.project_id ? (
                      <Link href={`/project/${row.project_id}/history`} className="hover:text-brand transition-colors">
                        {row.projects?.name ?? row.repo_url}
                      </Link>
                    ) : (
                      row.repo_url
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {row.score != null ? (
                      <span className="font-mono text-sm text-ink">{row.score}</span>
                    ) : (
                      <span className="font-mono text-xs text-ink-subtle">Pending first scan</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <TrendArrow direction={row.direction} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-subtle" title={row.last_scanned_at ?? undefined}>
                    {row.last_scanned_at
                      ? timeAgo(row.last_scanned_at)
                      : "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-subtle capitalize">
                    {row.scan_frequency}
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
