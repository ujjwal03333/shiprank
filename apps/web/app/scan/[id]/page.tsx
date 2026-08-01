import type { Metadata } from "next";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { ScoreGauge } from "@/app/components/score-gauge";
import {
  gradeBadgeClass,
  STATION_LABEL,
  STATION_COLOR,
} from "@/lib/grade";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Scan ${id.slice(0, 8)}…`,
    description: "ShipRank scan result — quality, security, and growth report.",
  };
}

interface StationResult {
  station: string;
  score: number;
  grade: string;
  pass_count: number | null;
  warn_count: number | null;
  fail_count: number | null;
}

interface Fingerprint {
  platform: string;
  confidence: number;
  signals: string[];
  metadata: { model?: string | null; aiRatio?: number | null } | null;
}

interface Project {
  id: string;
  name: string;
  framework: string | null;
  platform: string | null;
  url: string | null;
  metadata: {
    fileCount?: number;
    lineCount?: number;
    depCount?: number;
    model?: string | null;
    aiRatio?: number | null;
  } | null;
}

interface Scan {
  id: string;
  status: string;
  score: number;
  grade: string;
  station_count: number | null;
  scan_mode: string | null;
  started_at: string | null;
  completed_at: string | null;
  projects: Project | null;
  station_results: StationResult[];
  fingerprints: Fingerprint[];
}

function AttributionCard({
  project,
  fingerprints,
}: {
  project: Project;
  fingerprints: Fingerprint[];
}) {
  const fp = fingerprints[0];
  const meta = project.metadata;
  const model = fp?.metadata?.model ?? meta?.model ?? null;
  const aiRatio = fp?.metadata?.aiRatio ?? meta?.aiRatio ?? null;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <h2 className="font-mono text-xs text-ink-subtle uppercase tracking-widest">
        Attribution
      </h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <dt className="font-mono text-xs text-ink-subtle">Platform</dt>
          <dd className="font-body text-sm text-ink mt-1 capitalize">
            {fp?.platform ?? project.platform ?? "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-ink-subtle">Model</dt>
          <dd className="font-body text-sm text-ink mt-1">
            {model ?? "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-ink-subtle">AI Ratio</dt>
          <dd className="font-mono text-sm text-ink mt-1">
            {aiRatio != null ? `${Math.round(aiRatio * 100)}%` : "—"}
          </dd>
        </div>
        {fp && (
          <div>
            <dt className="font-mono text-xs text-ink-subtle">Confidence</dt>
            <dd className="font-mono text-sm text-ink mt-1">
              {Math.round(fp.confidence * 100)}%
            </dd>
          </div>
        )}
      </dl>
      {fp?.signals && fp.signals.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {fp.signals.map((s) => (
            <span
              key={s}
              className="font-mono text-xs bg-surface-sunken text-ink-muted px-2 py-0.5 rounded"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StationBars({ stations }: { stations: StationResult[] }) {
  const sorted = [...stations].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <h2 className="font-mono text-xs text-ink-subtle uppercase tracking-widest">
        Station Scores
      </h2>
      <div className="flex flex-col gap-3">
        {sorted.map((s) => {
          const label = STATION_LABEL[s.station] ?? s.station;
          const color = STATION_COLOR[s.station] ?? "#8f8676";
          return (
            <div key={s.station} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-ink">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">{s.score}</span>
                  <span
                    className={`font-mono text-xs px-1.5 py-0.5 rounded ${gradeBadgeClass(s.grade)}`}
                  >
                    {s.grade}
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${s.score}%`,
                    backgroundColor: color,
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShareCard({ scanId }: { scanId: string }) {
  const url = `https://shiprank.dev/scan/${scanId}`;
  return (
    <div className="rounded-lg border border-brand-soft bg-brand-soft/30 p-5 flex flex-col gap-3">
      <h2 className="font-mono text-xs text-brand uppercase tracking-widest">
        Share this scan
      </h2>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-ink-muted"
        />
        <a
          href={`https://x.com/intent/tweet?text=${encodeURIComponent(`I scanned my AI-built project on ShipRank\n\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-md bg-brand text-ink-onbrand font-body text-sm hover:bg-brand-hover transition-colors whitespace-nowrap"
        >
          Share on X →
        </a>
      </div>
    </div>
  );
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="font-body text-ink-muted">
          Database not configured — set Supabase credentials to view scans.
        </p>
      </div>
    );
  }

  const db = getServiceClient();
  const { data: scan, error } = await db
    .from("scans")
    .select(
      `id, status, score, grade, station_count, scan_mode, started_at, completed_at,
       projects ( id, name, framework, platform, url, metadata ),
       station_results ( station, score, grade, pass_count, warn_count, fail_count ),
       fingerprints ( platform, confidence, signals, metadata )`,
    )
    .eq("id", id)
    .single();

  if (error || !scan) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 text-center flex flex-col gap-4">
        <p className="font-display text-xl text-ink">Scan not found</p>
        <p className="font-body text-sm text-ink-muted max-w-sm mx-auto">
          This scan ID doesn&apos;t exist or may have been removed.
          Double-check the URL or run a new scan.
        </p>
        <code className="font-mono text-sm bg-surface-sunken border border-border px-4 py-2 rounded-md text-ink mx-auto">
          npx shiprank ./your-project --upload
        </code>
        <a
          href="/"
          className="font-mono text-xs text-brand hover:underline mt-2"
        >
          ← Back to ShipRank
        </a>
      </div>
    );
  }

  const typedScan = scan as unknown as Scan;
  const project = typedScan.projects;
  const scannedAt = typedScan.completed_at ?? typedScan.started_at;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <a href="/" className="font-mono text-xs text-ink-subtle hover:text-brand transition-colors">
          ← shiprank.dev
        </a>
        <h1 className="font-display text-2xl text-ink mt-2">
          {project?.name ?? "Unnamed project"}
        </h1>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          {project?.framework && (
            <span className="font-mono text-xs bg-surface-sunken text-ink-muted px-2 py-0.5 rounded">
              {project.framework}
            </span>
          )}
          {project?.metadata?.fileCount != null && (
            <span className="font-mono text-xs text-ink-subtle">
              {project.metadata.fileCount} files
            </span>
          )}
          {project?.metadata?.lineCount != null && (
            <span className="font-mono text-xs text-ink-subtle">
              {project.metadata.lineCount.toLocaleString()} lines
            </span>
          )}
          {scannedAt && (
            <span className="font-mono text-xs text-ink-subtle">
              {new Date(scannedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Score + Stations */}
      <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="flex flex-col items-center gap-3">
          <ScoreGauge score={typedScan.score} grade={typedScan.grade} />
          <span className="font-mono text-xs text-ink-subtle text-center max-w-[160px]">
            ShipScore
          </span>
        </div>
        {typedScan.station_results.length > 0 && (
          <StationBars stations={typedScan.station_results} />
        )}
      </div>

      {/* Attribution */}
      {project && (
        <AttributionCard
          project={project}
          fingerprints={typedScan.fingerprints}
        />
      )}

      {/* Top opportunities (lowest-scoring stations) */}
      {typedScan.station_results.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
          <h2 className="font-mono text-xs text-ink-subtle uppercase tracking-widest">
            Top opportunities
          </h2>
          <div className="flex flex-col gap-2">
            {[...typedScan.station_results]
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((s, i) => (
                <div
                  key={s.station}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <span className="font-mono text-xs text-brand w-4">
                    {i + 1}
                  </span>
                  <span className="font-body text-sm text-ink flex-1">
                    Improve {STATION_LABEL[s.station] ?? s.station}
                  </span>
                  <span className="font-mono text-sm text-ink">{s.score}</span>
                  <span
                    className={`font-mono text-xs px-1.5 py-0.5 rounded ${gradeBadgeClass(s.grade)}`}
                  >
                    {s.grade}
                  </span>
                </div>
              ))}
          </div>
          <p className="font-body text-xs text-ink-subtle">
            Run{" "}
            <code className="font-mono bg-surface-sunken px-1 rounded">
              npx shiprank --rules
            </code>{" "}
            to generate a rules file for your AI coding tool.
          </p>
        </div>
      )}

      {/* Share */}
      <ShareCard scanId={typedScan.id} />
    </div>
  );
}
