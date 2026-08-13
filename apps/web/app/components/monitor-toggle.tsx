"use client";

import { useState } from "react";

export function MonitorToggle({
  repoUrl,
  projectId,
}: {
  repoUrl: string;
  projectId: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "enabled" | "error">("idle");

  async function enable() {
    setState("loading");
    try {
      const res = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, projectId, scanFrequency: "weekly" }),
      });
      setState(res.ok ? "enabled" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "enabled") {
    return (
      <p className="font-body text-sm text-success-ink">
        ✓ Monitoring enabled — this project will be re-scanned weekly.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={enable}
        disabled={state === "loading"}
        className="press rounded-md bg-ink px-4 py-2 font-body text-sm text-canvas transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {state === "loading" ? "Enabling…" : "Enable monitoring"}
      </button>
      {state === "error" && (
        <span className="font-body text-xs text-danger-ink">
          Couldn&apos;t enable monitoring — Monitor plan required.
        </span>
      )}
    </div>
  );
}
