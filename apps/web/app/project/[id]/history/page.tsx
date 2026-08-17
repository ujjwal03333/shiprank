import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolvePlanForApiKey, SESSION_COOKIE } from "@/lib/subscription";
import { fetchProjectScanPoints } from "@/lib/scan-history";
import { toChartData } from "@/lib/history-chart";
import { ScoreHistoryChart } from "@/app/components/score-history-chart-lazy";

export const metadata: Metadata = {
  title: "Scan history",
  description: "Score over time for a monitored project.",
};

async function canViewHistory(
  db: ReturnType<typeof getServiceClient>,
  projectId: string,
  subscriptionId: string | null,
): Promise<boolean> {
  const { data: project } = await db
    .from("projects")
    .select("is_public")
    .eq("id", projectId)
    .maybeSingle();

  if (project?.["is_public"]) return true;
  if (!subscriptionId) return false;

  const { data: owned } = await db
    .from("monitored_projects")
    .select("id")
    .eq("project_id", projectId)
    .eq("subscription_id", subscriptionId)
    .maybeSingle();

  return !!owned;
}

export default async function ProjectHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  const { data: project } = await db
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="font-display text-xl text-ink">Project not found</p>
      </div>
    );
  }

  const allowed = await canViewHistory(db, id, resolved.subscriptionId);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center flex flex-col gap-4 items-center">
        <span className="font-mono text-xs text-brand uppercase tracking-widest">History</span>
        <h1 className="font-display text-2xl text-ink">This history is private</h1>
        <p className="font-body text-sm text-ink-muted max-w-sm">
          Only the Monitor-tier subscription monitoring this project can view
          its history, unless the project owner makes it public.
        </p>
        <Link
          href="/pricing"
          className="press mt-2 rounded-md bg-brand px-4 py-2.5 font-body text-sm text-ink-onbrand transition-colors hover:bg-brand-hover"
        >
          View plans →
        </Link>
      </div>
    );
  }

  const points = await fetchProjectScanPoints(db, id);
  const chartData = toChartData(points);
  const stations = Array.from(
    new Set(points.flatMap((p) => Object.keys(p.stationScores))),
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 flex flex-col gap-8">
      <div>
        <span className="font-mono text-xs text-brand uppercase tracking-widest">History</span>
        <h1 className="font-display text-2xl text-ink mt-2">
          {project["name"] as string}
        </h1>
      </div>

      {chartData.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <p className="font-body text-sm text-ink-muted">No completed scans yet.</p>
        </div>
      ) : chartData.length === 1 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center flex flex-col gap-2">
          <p className="font-display text-3xl text-ink">{chartData[0]!.score}</p>
          <p className="font-body text-sm text-ink-muted">
            First scan recorded. A trend line appears after the second scan.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <ScoreHistoryChart data={chartData} stations={stations} />
        </div>
      )}

      {chartData.length > 0 && (
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Date</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Score</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-ink-subtle">Scan</th>
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((row) => (
                <tr key={row.scanId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-subtle">{row.date}</td>
                  <td className="px-5 py-3 font-mono text-sm text-ink">{row.score}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/scan/${row.scanId}`}
                      className="font-body text-xs text-brand hover:underline"
                    >
                      View report →
                    </Link>
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
