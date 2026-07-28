"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "compile" | "scan" | "leaderboard";

interface CompileStep {
  name: string;
  index: number;
  stack: string;
  build: string;
  constraints: string;
  output: string;
}

interface CompileData {
  steps: CompileStep[];
  isSingleStep: boolean;
}

interface LeaderboardEntry {
  platform?: string;
  framework?: string;
  avgScore: number;
  projectCount: number;
}

interface LeaderboardData {
  platformLeaderboard: LeaderboardEntry[];
  frameworkLeaderboard: LeaderboardEntry[];
  entries: { project_name: string; score: number; grade: string; platform: string | null; framework: string | null }[];
}

const EXAMPLE_PROMPTS = [
  "I want a booking app where people pick a time slot and pay a deposit and also get an email after",
  "Build a SaaS dashboard where teams track their sprint velocity with charts and CSV exports",
  "Create an AI writing assistant where users paste text and get rewrites in different tones",
];

function SectionBlock({ label, content }: { label: string; content: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs text-brand uppercase tracking-widest">
        {label}
      </span>
      <p className="font-body text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  );
}

function StepCard({
  step,
  isSingleStep,
}: {
  step: CompileStep;
  isSingleStep: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm overflow-hidden">
      {!isSingleStep && (
        <div className="px-5 py-3 border-b border-border bg-surface-raised flex items-baseline gap-3">
          <span className="font-mono text-xs text-ink-subtle">
            Step {step.index}
          </span>
          <span className="font-display text-base text-ink">{step.name}</span>
        </div>
      )}
      <div className="p-5 flex flex-col gap-5">
        {step.stack && <SectionBlock label="Stack" content={step.stack} />}
        {step.build && <SectionBlock label="Build" content={step.build} />}
        {step.constraints && (
          <SectionBlock label="Constraints" content={step.constraints} />
        )}
        {step.output && <SectionBlock label="Output" content={step.output} />}
      </div>
    </div>
  );
}

function CompileTab() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCompile() {
    if (prompt.length < 10) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError((data["error"] as string) ?? "Compile failed");
      } else {
        setResult(data as unknown as CompileData);
      }
    } catch {
      setError("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label className="font-mono text-xs text-ink-subtle uppercase tracking-widest">
          Your vibe-coded prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={EXAMPLE_PROMPTS[0]}
          rows={5}
          className="w-full rounded-lg border border-border bg-surface p-4 font-body text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 placeholder:text-ink-subtle leading-relaxed"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {EXAMPLE_PROMPTS.slice(1).map((ex, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ex)}
              className="font-mono text-xs text-ink-subtle border border-border rounded px-2 py-1 hover:border-brand hover:text-brand transition-colors"
            >
              Example {i + 2}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCompile}
          disabled={loading || prompt.length < 10}
          className="px-5 py-2.5 bg-brand text-ink-onbrand font-body text-sm rounded-md hover:bg-brand-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Compiling…" : "Compile →"}
        </button>
        {error && (
          <span className="text-sm text-danger font-body">{error}</span>
        )}
        {loading && (
          <span className="font-mono text-xs text-ink-subtle animate-pulse">
            Structuring your prompt with Claude…
          </span>
        )}
      </div>

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-ink-subtle uppercase tracking-widest">
              {result.steps.length === 1 ? "1 step" : `${result.steps.length} steps`}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {result.steps.map((step) => (
            <StepCard
              key={step.index}
              step={step}
              isSingleStep={result.isSingleStep}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScanTab() {
  const [scanId, setScanId] = useState("");

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4">
        <h3 className="font-display text-base text-ink">
          Look up a scan by ID
        </h3>
        <p className="font-body text-sm text-ink-muted">
          After running{" "}
          <code className="font-mono text-xs bg-surface-sunken px-1.5 py-0.5 rounded">
            npx shiprank --upload
          </code>
          , paste your scan ID below.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/50 placeholder:text-ink-subtle"
          />
          <a
            href={scanId ? `/scan/${scanId}` : "#"}
            className={`px-4 py-2 rounded-md font-body text-sm transition-colors
              ${scanId
                ? "bg-brand text-ink-onbrand hover:bg-brand-hover"
                : "bg-surface-sunken text-ink-subtle cursor-not-allowed"
              }`}
            onClick={(e) => !scanId && e.preventDefault()}
          >
            View →
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-4">
        <h3 className="font-display text-base text-ink">
          Scan from your terminal
        </h3>
        <ol className="flex flex-col gap-3 font-body text-sm text-ink-muted">
          <li className="flex gap-3">
            <span className="font-mono text-xs text-brand mt-0.5 shrink-0">01</span>
            <span>
              Install once:{" "}
              <code className="font-mono text-xs bg-surface-sunken px-1.5 py-0.5 rounded">
                npm install -g shiprank
              </code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-brand mt-0.5 shrink-0">02</span>
            <span>
              Scan and upload your project:{" "}
              <code className="font-mono text-xs bg-surface-sunken px-1.5 py-0.5 rounded">
                npx shiprank ./my-project --upload
              </code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs text-brand mt-0.5 shrink-0">03</span>
            <span>
              Copy the scan ID printed to stderr and paste it above.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function RankTable({
  title,
  rows,
  nameKey,
}: {
  title: string;
  rows: LeaderboardEntry[];
  nameKey: "platform" | "framework";
}) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="font-mono text-xs text-ink-subtle uppercase tracking-widest mb-3">
        {title}
      </h3>
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="px-4 py-2.5 text-left font-mono text-xs text-ink-subtle">
                #
              </th>
              <th className="px-4 py-2.5 text-left font-mono text-xs text-ink-subtle">
                Name
              </th>
              <th className="px-4 py-2.5 text-right font-mono text-xs text-ink-subtle">
                Avg Score
              </th>
              <th className="px-4 py-2.5 text-right font-mono text-xs text-ink-subtle">
                Projects
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, i) => (
              <tr
                key={row[nameKey]}
                className="border-b border-border last:border-0 hover:bg-surface-raised/50 transition-colors"
              >
                <td className="px-4 py-2.5 font-mono text-xs text-ink-subtle">
                  {i + 1}
                </td>
                <td className="px-4 py-2.5 font-body text-sm text-ink capitalize">
                  {row[nameKey] ?? "Unknown"}
                </td>
                <td className="px-4 py-2.5 font-mono text-sm text-ink text-right">
                  {row.avgScore}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-ink-subtle text-right">
                  {row.projectCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaderboardTab() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error();
      setData(await res.json() as LeaderboardData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-raised" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="font-body text-sm text-ink-muted">
          Leaderboard unavailable — database not yet configured.
        </p>
        <p className="font-mono text-xs text-ink-subtle mt-2">
          Run{" "}
          <code className="bg-surface-sunken px-1 rounded">npx shiprank --upload</code>{" "}
          to add the first entry.
        </p>
      </div>
    );
  }

  const hasData =
    data.platformLeaderboard.length > 0 || data.frameworkLeaderboard.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="font-body text-sm text-ink-muted">
          No scans yet — be the first.
        </p>
        <p className="font-mono text-xs text-ink-subtle mt-2">
          <code className="bg-surface-sunken px-1 rounded">
            npx shiprank ./your-project --upload
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid sm:grid-cols-2 gap-6">
        <RankTable
          title="By Platform"
          rows={data.platformLeaderboard}
          nameKey="platform"
        />
        <RankTable
          title="By Framework"
          rows={data.frameworkLeaderboard}
          nameKey="framework"
        />
      </div>
      <a
        href="/leaderboard"
        className="font-body text-sm text-brand hover:text-brand-hover transition-colors"
      >
        See full leaderboard →
      </a>
    </div>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  compile: "Compile",
  scan: "Scan",
  leaderboard: "Leaderboard",
};

export function HomeTabs() {
  const [active, setActive] = useState<Tab>("compile");

  return (
    <div>
      <div className="flex border-b border-border">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-5 py-3 font-body text-sm transition-colors border-b-2 -mb-px
              ${
                active === tab
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className="mt-8">
        {active === "compile" && <CompileTab />}
        {active === "scan" && <ScanTab />}
        {active === "leaderboard" && <LeaderboardTab />}
      </div>
    </div>
  );
}
