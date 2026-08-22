import type { Metadata } from "next";
import Link from "next/link";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { StationRadar } from "@/app/components/station-radar-lazy";
import { BadgeSnippet } from "@/app/components/badge-snippet";
import { CopyButton } from "@/app/components/command-card";
import { ShipCard } from "@/app/components/ship-card";
import { ShareActions } from "@/app/components/share-actions";
import { CloseContract } from "@/app/components/close-contract";
import {
  gradeBadgeClass,
  STATION_LABEL,
  STATION_DESCRIPTION,
  STATION_COLOR,
} from "@/lib/grade";
import { pickContract } from "@/lib/contract";
import { publicAppUrl } from "@/lib/public-url";
import { fetchProjectScanPoints } from "@/lib/scan-history";
import { computeVelocity, formatVelocityLabel } from "@/lib/velocity";
import { fetchScanFindings } from "@/lib/scan-findings";
import { gateFindingsForPlan, type GatedFinding } from "@/lib/plan-gating";
import { resolvePlanForApiKey, SESSION_COOKIE } from "@/lib/subscription";
import { cookies } from "next/headers";
import { MonitorToggle } from "@/app/components/monitor-toggle";
import { formatPlatformName, formatModelName, timeAgo } from "@/lib/format-names";
import { fetchCheckPrevalence, type CheckPrevalence } from "@/lib/check-prevalence";
import { decisionContextFor } from "@/lib/decision-context";

const APP_URL = publicAppUrl();

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
  id: string;
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
  repo_url: string | null;
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
  const rawPlatform = fp?.platform ?? project.platform ?? null;
  const rawModel = fp?.metadata?.model ?? meta?.model ?? null;
  const aiRatio = fp?.metadata?.aiRatio ?? meta?.aiRatio ?? null;
  const platformDetected = rawPlatform != null && rawPlatform !== "unknown";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
        Attribution
      </h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="font-mono text-xs text-ink-subtle">Platform</dt>
          <dd className="mt-1 font-body text-sm text-ink">
            {platformDetected ? formatPlatformName(rawPlatform) : (
              <span className="text-ink-muted">Not detected</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-ink-subtle">Model</dt>
          <dd className="mt-1 font-body text-sm text-ink">
            {rawModel ? formatModelName(rawModel) : (
              <span className="text-ink-muted">Not detected</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-ink-subtle">AI Ratio</dt>
          <dd className="mt-1 font-mono text-sm text-ink">
            {aiRatio != null ? `${Math.round(aiRatio * 100)}%` : "—"}
          </dd>
        </div>
        {fp && (
          <div>
            <dt className="font-mono text-xs text-ink-subtle">Confidence</dt>
            <dd className="mt-1 font-mono text-sm text-ink">
              {Math.round(fp.confidence * 100)}%
            </dd>
          </div>
        )}
      </dl>
      {!platformDetected && (
        <p className="font-body text-xs text-ink-subtle">
          ShipRank couldn&apos;t identify the AI platform. You can{" "}
          <code className="rounded bg-surface-sunken px-1 font-mono text-[11px]">
            POST /api/attribute
          </code>{" "}
          to set it manually.
        </p>
      )}
      {fp?.signals && fp.signals.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {fp.signals.map((s) => (
            <span
              key={s}
              className="rounded bg-surface-sunken px-2 py-0.5 font-mono text-xs text-ink-muted"
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
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
        Station Scores
      </h2>
      <div className="flex flex-col gap-3">
        {sorted.map((s) => {
          const label = STATION_LABEL[s.station] ?? s.station;
          const color = STATION_COLOR[s.station] ?? "#8f8676";
          const desc = STATION_DESCRIPTION[s.station] ?? "";
          return (
            <div key={s.station} className="flex flex-col gap-1.5" title={desc}>
              <div className="flex items-center justify-between">
                <span className="group flex items-center gap-1.5 font-body text-sm text-ink">
                  {label}
                  {desc && (
                    <span className="hidden font-body text-xs text-ink-subtle sm:inline">
                      — {desc}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">{s.score}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-xs ${gradeBadgeClass(s.grade)}`}
                  >
                    {s.grade}
                  </span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="grow-bar h-full rounded-full"
                  style={{
                    width: `${s.score}%`,
                    backgroundColor: color,
                    opacity: 0.85,
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

const SEVERITY_TONE: Record<string, string> = {
  critical: "bg-danger-soft text-danger-ink",
  high: "bg-danger-soft text-danger-ink",
  medium: "bg-warning-soft text-warning-ink",
  low: "bg-surface-sunken text-ink-muted",
  info: "bg-surface-sunken text-ink-muted",
};

function FindingCard({
  finding,
  prevalence,
  plan,
}: {
  finding: GatedFinding;
  prevalence?: CheckPrevalence | undefined;
  plan: "free" | "pro" | "monitor";
}) {
  const tone = SEVERITY_TONE[finding.severity] ?? "bg-surface-sunken text-ink-muted";
  const decision = decisionContextFor(finding.checkId, prevalence);
  const locked = plan === "free";
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-body text-sm text-ink">{finding.title}</span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs uppercase ${tone}`}>
          {finding.severity}
        </span>
      </div>
      {prevalence && (
        <span className="font-mono text-xs text-ink-subtle">
          Fails in {prevalence.failPct}% of scanned projects (n={prevalence.sampleSize})
        </span>
      )}
      <details className="group">
        <summary className="cursor-pointer list-none font-mono text-xs text-brand marker:content-none">
          {locked ? "Why did this happen?  Lock — Unlock with Pro →" : "Why did this happen?"}
        </summary>
        {locked ? (
          <p className="mt-2 font-body text-xs text-ink-muted">
            Decision records are a Pro feature.{" "}
            <Link href="/pricing" className="text-brand hover:underline">
              Unlock with Pro →
            </Link>
          </p>
        ) : (
          <dl className="mt-2 flex flex-col gap-2 font-body text-xs leading-relaxed text-ink-muted">
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-subtle">Pattern</dt>
              <dd>{decision.aiPattern}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-subtle">Probable cause</dt>
              <dd>{decision.probableCause}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-subtle">Should be</dt>
              <dd>{decision.whatShouldBe}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-subtle">Impact</dt>
              <dd>{decision.impactChain}</dd>
            </div>
            {decision.frequencyPct != null && decision.sampleSize != null && (
              <div>
                <dt className="font-mono text-[10px] uppercase text-ink-subtle">Frequency</dt>
                <dd>
                  Fails in {decision.frequencyPct}% of eligible scans (n={decision.sampleSize}).
                </dd>
              </div>
            )}
          </dl>
        )}
      </details>
      {finding.upgradeRequired ? (
        <div className="relative overflow-hidden rounded-md border border-border bg-surface-sunken px-3 py-3">
          <p aria-hidden className="select-none font-mono text-xs text-ink-subtle blur-[3px]">
            Move all secrets to environment variables and rotate any exposed
            keys — src/lib/client.ts:14
          </p>
          <div className="absolute inset-0 flex items-center justify-center bg-surface-sunken/60">
            <Link
              href="/pricing"
              className="whitespace-nowrap font-body text-xs text-brand hover:underline"
            >
              Unlock fix details with Pro →
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {finding.filePath && (
            <code className="font-mono text-xs text-ink-subtle">
              {finding.filePath}
              {finding.lineNumber != null ? `:${finding.lineNumber}` : ""}
            </code>
          )}
          {finding.fixSuggestion && (
            <div className="flex items-start justify-between gap-2 rounded-md bg-surface-sunken px-3 py-2">
              <p className="font-body text-xs leading-relaxed text-ink-muted">
                {finding.fixSuggestion}
              </p>
              <CopyButton text={finding.fixSuggestion} label="fix prompt" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FindingsSection({
  findings,
  prevalenceMap,
  plan,
}: {
  findings: GatedFinding[];
  prevalenceMap: Map<string, CheckPrevalence>;
  plan: "free" | "pro" | "monitor";
}) {
  if (findings.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <h2 className="font-mono text-xs text-ink-subtle uppercase tracking-widest">
        Findings
      </h2>
      <div className="flex flex-col gap-3">
        {findings.map((f) => (
          <FindingCard
            key={f.id}
            finding={f}
            prevalence={prevalenceMap.get(f.checkId)}
            plan={plan}
          />
        ))}
      </div>
    </div>
  );
}

function VelocityPill({ label, direction }: { label: string; direction: "up" | "down" | "flat" }) {
  const tone =
    direction === "up"
      ? "bg-success-soft text-success-ink"
      : direction === "down"
        ? "bg-danger-soft text-danger-ink"
        : "bg-surface-sunken text-ink-muted";
  return (
    <span className={`chip-pop font-mono text-xs px-2 py-0.5 rounded ${tone}`}>
      {label}
    </span>
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
      `id, status, score, grade, provenance, station_count, scan_mode, started_at, completed_at,
       projects ( id, name, framework, platform, url, repo_url, metadata ),
       station_results ( id, station, score, grade, pass_count, warn_count, fail_count ),
       fingerprints ( platform, confidence, signals, metadata )`,
    )
    .eq("id", id)
    .single();

  if (error || !scan || (scan as { provenance?: string }).provenance === "seed") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-6 py-24 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-warning-soft">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <path d="M6 6.5 10 10.5M10 6.5 6 10.5" stroke="var(--color-warning-ink)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="8" r="6.25" stroke="var(--color-warning-ink)" strokeWidth="1.5" />
          </svg>
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl text-ink">Scan not found</h1>
          <p className="mx-auto max-w-sm font-body text-sm leading-relaxed text-ink-muted">
            This scan ID doesn&apos;t match anything in our database.
            It may have been removed, or the URL might be wrong.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="font-body text-sm text-ink">
            Scan your own project:
          </p>
          <code className="rounded-lg border border-border bg-surface-sunken px-4 py-2.5 font-mono text-sm text-ink">
            npx shiprank ./your-project --upload
          </code>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="font-body text-sm text-ink-muted transition-colors hover:text-ink"
          >
            ← Home
          </Link>
          <span className="h-3 w-px bg-border" />
          <Link
            href="/leaderboard"
            className="font-body text-sm text-brand transition-colors hover:text-brand-hover"
          >
            Browse the leaderboard →
          </Link>
        </div>
      </div>
    );
  }

  const typedScan = scan as unknown as Scan;
  const project = typedScan.projects;
  const scannedAt = typedScan.completed_at ?? typedScan.started_at;

  const velocity = project?.id
    ? computeVelocity(await fetchProjectScanPoints(db, project.id)).latest
    : null;

  const cookieStore = await cookies();
  const apiKeyCookie = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const resolvedPlan = await resolvePlanForApiKey(db, apiKeyCookie);
  const rawFindings = await fetchScanFindings(
    db,
    typedScan.station_results.map((s) => s.id),
  );
  const findings = gateFindingsForPlan(rawFindings, resolvedPlan.plan);
  const contract = pickContract(rawFindings);
  const failingFindings = findings.filter((f) => !f.passed);
  const prevalenceMap = await fetchCheckPrevalence(
    db,
    failingFindings.map((f) => f.checkId),
  );

  // Real sitewide average per station, computed from actual leaderboard
  // data — never fabricated. Skipped entirely if there's nothing to average.
  const currentStationScores: Record<string, number> = {};
  for (const s of typedScan.station_results) currentStationScores[s.station] = s.score;

  let siteAverage: Record<string, number> | null = null;
  let siteAverageN = 0;
  const { data: allStationScores } = await db
    .from("leaderboard_entries")
    .select("station_scores");
  if (allStationScores && allStationScores.length > 0) {
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const row of allStationScores as unknown as Array<{ station_scores: Record<string, number> | null }>) {
      const scores = row.station_scores;
      if (!scores) continue;
      for (const [key, val] of Object.entries(scores)) {
        totals[key] ??= { sum: 0, count: 0 };
        totals[key]!.sum += val;
        totals[key]!.count++;
      }
    }
    if (Object.keys(totals).length > 0) {
      siteAverage = {};
      for (const [key, { sum, count }] of Object.entries(totals)) {
        siteAverage[key] = sum / count;
      }
      siteAverageN = allStationScores.length;
    }
  }

  const platform = project?.platform
    ? formatPlatformName(project.platform)
    : project?.framework ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <ShipCard
        score={typedScan.score}
        grade={typedScan.grade}
        projectName={project?.name ?? "Unnamed project"}
        platform={platform}
        meta={
          project?.metadata?.fileCount != null
            ? `${project.metadata.fileCount} files`
            : undefined
        }
        size="hero"
        staticStamp
      />

      <ShareActions
        scanId={typedScan.id}
        projectName={project?.name ?? "This project"}
        score={typedScan.score}
        grade={typedScan.grade}
        origin={APP_URL}
      />

      <CloseContract contract={contract} />

      {velocity ? (
        <div className="flex items-center justify-center gap-3">
          <VelocityPill
            label={formatVelocityLabel(velocity)}
            direction={velocity.direction}
          />
          {scannedAt ? (
            <span className="font-mono text-xs text-ink-subtle" title={new Date(scannedAt).toLocaleString()}>
              {timeAgo(scannedAt)}
            </span>
          ) : null}
        </div>
      ) : null}

      <details id="stations" className="border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-subtle">
          Stations and evidence
        </summary>
        <div className="flex flex-col gap-6 border-t border-border px-5 py-6">
          {typedScan.station_results.length >= 3 && (
            <StationRadar
              current={currentStationScores}
              siteAverage={siteAverage}
              siteAverageN={siteAverageN}
            />
          )}
          {project && (
            <AttributionCard
              project={project}
              fingerprints={typedScan.fingerprints}
            />
          )}
          {typedScan.station_results.length > 0 && (
            <StationBars stations={typedScan.station_results} />
          )}
          <FindingsSection
            findings={failingFindings}
            prevalenceMap={prevalenceMap}
            plan={resolvedPlan.plan}
          />
          <BadgeSnippet scanId={typedScan.id} appUrl={APP_URL} />
          {resolvedPlan.plan === "monitor" && project?.repo_url ? (
            <MonitorToggle repoUrl={project.repo_url} projectId={project.id} />
          ) : null}
        </div>
      </details>
    </div>
  );
}
