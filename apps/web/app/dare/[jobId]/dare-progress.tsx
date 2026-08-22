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

export function DareProgress({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let kicked = false;

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
        if (!cancelled) setJob(data);
      } catch {
        if (!cancelled) setError("Could not load job status.");
      }
    }

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 2000);
    const clock = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(clock);
    };
  }, [jobId]);

  if (error) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center">
        <p className="font-display text-2xl text-ink">Couldn&apos;t load this dare</p>
        <p className="font-body text-sm text-ink-muted">{error}</p>
        <Link href="/dare" className="font-body text-sm text-ink hover:underline">
          Try another repo →
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-3 py-12">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-3 w-full rounded" />
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
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 text-center">
          <p className="font-display text-3xl text-ink">Scan complete</p>
          <Link href="/dare" className="font-mono text-xs text-ink-subtle hover:text-ink">
            Dare someone back →
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center">
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
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-12 text-center">
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

  const stage = (job.progress_stage ?? job.status).toLowerCase();
  let currentIdx = ACTS.findIndex((a) => stage.includes(a.match));
  if (currentIdx < 0) {
    if (job.status === "queued" || job.status === "cloning") currentIdx = 0;
    else if (job.status === "scanning") currentIdx = 2;
    else currentIdx = 0;
  }

  const chips = [
    job.progress?.fileCount != null ? `${job.progress.fileCount} files` : null,
    job.progress?.framework ?? null,
    job.progress?.platform
      ? formatPlatformName(job.progress.platform)
      : null,
    job.progress?.findingCount != null
      ? `${job.progress.findingCount} findings`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-12">
      <p className="truncate font-mono text-xs text-ink-subtle">{job.repo_url}</p>
      <ol className="flex flex-col gap-6">
        {ACTS.map((act, i) => {
          const done = currentIdx > i;
          const active = currentIdx === i;
          return (
            <li key={act.key} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-4">
                <span
                  className={`font-mono text-[11px] tracking-[0.2em] ${
                    done
                      ? "text-grade-a"
                      : active
                        ? "text-ink"
                        : "text-ink-subtle/40"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`font-display text-3xl tracking-tight sm:text-4xl ${
                    done
                      ? "text-ink-subtle line-through decoration-grade-a decoration-1"
                      : active
                        ? "text-ink"
                        : "text-ink-subtle/35"
                  }`}
                >
                  {act.label}
                </span>
                {active ? (
                  <span className="pulse-dot size-1.5 rounded-full bg-grade-a" />
                ) : null}
              </div>
              {active && chips.length > 0 ? (
                <div className="ml-10 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="chip-pop border border-border px-2.5 py-1 font-mono text-xs text-ink-muted"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="font-mono text-[11px] text-ink-subtle">
        {elapsed >= 45
          ? "Still reading the tree."
          : "Most dares finish in under a minute."}
      </p>
    </div>
  );
}
