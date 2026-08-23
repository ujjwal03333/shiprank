"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScoreReveal } from "../../components/score-reveal";
import { ShareActions } from "../../components/share-actions";
import { formatPlatformName } from "@/lib/format-names";

interface JobPayload {
  id: string;
  repo_url: string;
  status: "queued" | "cloning" | "scanning" | "complete" | "failed";
  progress_stage: string | null;
  progress: {
    fileCount?: number;
    framework?: string;
    findingCount?: number;
    projectName?: string;
    score?: number;
    grade?: string;
    platform?: string;
  } | null;
  scan_id: string | null;
  error_message: string | null;
}

const ACTS = [
  { key: "clone", label: "Cloning", match: "clon" },
  { key: "profile", label: "Profiling", match: "profil" },
  { key: "judge", label: "Judging", match: "check" },
  { key: "score", label: "Stamping", match: "score" },
] as const;

function actIndex(job: JobPayload): number {
  const stage = (job.progress_stage ?? job.status).toLowerCase();
  const hit = ACTS.findIndex((a) => stage.includes(a.match));
  if (hit >= 0) return hit;
  if (job.status === "queued" || job.status === "cloning") return 0;
  if (job.status === "scanning") return 2;
  return 0;
}

export function DareProgress({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let kicked = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function tick() {
      try {
        if (!kicked) {
          kicked = true;
          await fetch(`/api/dare/${jobId}`, { method: "POST" });
        }
        const res = await fetch(`/api/dare/${jobId}`);
        const data = (await res.json()) as JobPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Job not found");
          return;
        }
        if (!cancelled) {
          setJob(data);
          if (data.status === "complete" || data.status === "failed") {
            if (interval) clearInterval(interval);
          }
        }
      } catch {
        if (!cancelled) setError("Could not load job status.");
      }
    }

    void tick();
    interval = setInterval(() => {
      void tick();
    }, 2000);
    const clock = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      clearInterval(clock);
    };
  }, [jobId]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <p className="font-display text-2xl text-ink">Couldn&apos;t load this dare</p>
        <p className="font-body text-sm text-ink-muted">{error}</p>
        <Link
          href="/dare"
          className="press rounded-[10px] bg-ink px-5 py-3 font-body text-sm text-canvas"
        >
          Try another repo
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-12">
        <div className="skeleton h-3 w-48 rounded" />
        <ol className="flex flex-col gap-6">
          {ACTS.map((act) => (
            <li key={act.key} className="skeleton h-8 w-40 rounded" />
          ))}
        </ol>
      </div>
    );
  }

  if (job.status === "complete") {
    const name = job.progress?.projectName ?? job.repo_url;
    const score = job.progress?.score;
    const grade = job.progress?.grade ?? "—";
    const platform = job.progress?.platform
      ? formatPlatformName(job.progress.platform)
      : job.progress?.framework ?? null;
    const meta =
      job.progress?.fileCount != null ? `${job.progress.fileCount} files` : undefined;

    if (score == null) {
      return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <p className="font-display text-2xl text-ink">Couldn&apos;t stamp a grade</p>
          <Link
            href="/dare"
            className="press rounded-[10px] bg-ink px-5 py-3 font-body text-sm text-canvas"
          >
            Try another repo
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col items-center">
        <ScoreReveal
          score={score}
          grade={grade}
          projectName={name}
          platform={platform}
          meta={meta}
          animate
        >
          {job.scan_id ? (
            <ShareActions
              scanId={job.scan_id}
              projectName={name}
              score={score}
              grade={grade}
              closeHref={`/scan/${job.scan_id}`}
            />
          ) : (
            <p className="text-center font-body text-xs text-ink-subtle">
              Grade is ready. The board write needs a configured database.
            </p>
          )}
        </ScoreReveal>
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
        <p className="font-display text-2xl text-ink">Couldn&apos;t finish this dare</p>
        <p className="font-body text-sm leading-relaxed text-ink-muted">
          {job.error_message ?? "This repo is private, too big, or gone."}
        </p>
        <Link
          href="/dare"
          className="press rounded-[10px] bg-ink px-5 py-3 font-body text-sm text-canvas"
        >
          Try another repo
        </Link>
      </div>
    );
  }

  const currentIdx = actIndex(job);
  const chips = [
    job.progress?.fileCount != null ? `${job.progress.fileCount} files` : null,
    job.progress?.framework ?? null,
    job.progress?.findingCount != null
      ? `${job.progress.findingCount} findings`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-md flex-col gap-12">
      <p className="truncate font-mono text-xs text-ink-subtle">{job.repo_url}</p>
      <ol className="flex flex-col gap-6">
        {ACTS.map((act, i) => {
          const done = currentIdx > i;
          const active = currentIdx === i;
          return (
            <li key={act.key} className="flex flex-col gap-2">
              <span
                className={`font-display text-3xl tracking-tight sm:text-4xl ${
                  done
                    ? "text-ink-subtle"
                    : active
                      ? "text-ink"
                      : "text-ink-subtle/40"
                }`}
              >
                {done ? `${act.label} ✓` : act.label}
              </span>
              {active && chips.length > 0 ? (
                <p className="break-words font-mono text-xs text-ink-muted">
                  {chips.join("  ·  ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="font-mono text-[11px] text-ink-subtle">{elapsed}s</p>
    </div>
  );
}
