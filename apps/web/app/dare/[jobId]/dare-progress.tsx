"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  } | null;
  scan_id: string | null;
  error_message: string | null;
}

const STAGES = [
  "Cloning repository...",
  "Profiling codebase...",
  "Running checks...",
  "Computing score...",
];

export function DareProgress({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId]);

  if (error) {
    return <p className="font-body text-sm text-danger-ink">{error}</p>;
  }

  if (!job) {
    return (
      <div className="flex flex-col gap-3">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-full rounded" />
      </div>
    );
  }

  if (job.status === "complete") {
    const name = job.progress?.projectName ?? job.repo_url;
    const scoreBit =
      job.progress?.score != null && job.progress.grade
        ? `${job.progress.score}/${job.progress.grade}`
        : "a ShipScore";
    const tweet = `${name} scored ${scoreBit} on ShipRank 🎯\nDare your app → https://shiprank.dev/dare`;
    return (
      <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="font-display text-xl text-ink">Scan complete</p>
        <p className="font-display text-3xl text-ink">
          {job.progress?.score != null ? job.progress.score : "—"}
          {job.progress?.grade ? (
            <span className="ml-2 font-mono text-base text-ink-muted">{job.progress.grade}</span>
          ) : null}
        </p>
        <p className="font-body text-sm text-ink-muted">
          {name}
          {job.progress?.framework ? ` · ${job.progress.framework}` : ""}
          {job.progress?.fileCount != null ? ` · ${job.progress.fileCount} files` : ""}
        </p>
        {job.scan_id ? (
          <Link
            href={`/scan/${job.scan_id}`}
            className="press rounded-lg bg-brand px-4 py-2.5 text-center font-body text-sm text-ink-onbrand hover:bg-brand-hover"
          >
            Open the report →
          </Link>
        ) : (
          <p className="font-body text-xs text-ink-subtle">
            Score computed locally. Leaderboard write needs a valid service-role
            key and migration 00011.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(tweet)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex-1 rounded-lg border border-border px-4 py-2.5 text-center font-body text-sm text-ink hover:bg-surface-raised"
          >
            Share on X
          </a>
          <Link
            href="/dare"
            className="press flex-1 rounded-lg border border-border px-4 py-2.5 text-center font-body text-sm text-ink hover:bg-surface-raised"
          >
            Dare someone back
          </Link>
        </div>
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-xl text-ink">Could not finish this dare</p>
        <p className="font-body text-sm text-ink-muted">
          {job.error_message ?? "Unknown error."}
        </p>
        <Link href="/dare" className="font-body text-sm text-brand hover:underline">
          Try another repo →
        </Link>
      </div>
    );
  }

  const current = job.progress_stage ?? "Queued";
  const currentIdx = STAGES.findIndex((s) => current.toLowerCase().includes(s.split("...")[0]!.toLowerCase()));

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
      <p className="font-mono text-xs text-ink-subtle">{job.repo_url}</p>
      <ol className="flex flex-col gap-3">
        {STAGES.map((stage, i) => {
          const done = currentIdx > i || job.status === "complete";
          const active = currentIdx === i || (currentIdx < 0 && i === 0 && job.status !== "queued");
          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                className={`grid size-5 place-items-center rounded-full font-mono text-[10px] ${
                  done
                    ? "bg-success-soft text-success-ink"
                    : active
                      ? "bg-brand-soft text-brand-ink pulse-dot"
                      : "bg-surface-sunken text-ink-subtle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`font-body text-sm ${active ? "text-ink" : "text-ink-muted"}`}>
                {stage}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {job.progress?.fileCount != null && (
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-mono text-xs text-ink-muted">
            {job.progress.fileCount} files
          </span>
        )}
        {job.progress?.framework && (
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-mono text-xs text-ink-muted">
            {job.progress.framework}
          </span>
        )}
        {job.progress?.findingCount != null && (
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-mono text-xs text-ink-muted">
            {job.progress.findingCount} findings
          </span>
        )}
      </div>
    </div>
  );
}
