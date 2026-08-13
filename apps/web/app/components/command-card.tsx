"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  detectStack,
  getApplicableConstraints,
  scorePrompt,
  type FocusMode,
  type PromptScore,
  type StackKey,
} from "@shiprank/compile/client";
import { StackPanel } from "./compile/stack-panel";
import { PromptScoreCard } from "./compile/prompt-score-card";
import { StageProgress, type Stage } from "./compile/stage-progress";
import { SplitOutput } from "./compile/split-output";
import { BounceGame } from "./bounce-game";

type Mode = "compile" | "scan";

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
  detectedStack?: StackKey[];
}

const EXAMPLE_PROMPTS = [
  "A booking app where people pick a time slot, pay a deposit, and get a confirmation email",
  "A SaaS dashboard where teams track sprint velocity with charts and CSV exports",
  "An AI writing assistant where users paste text and get rewrites in different tones",
];

const STAGE_LABELS = [
  "Detecting your stack…",
  "Loading failure patterns…",
  "Scoring your prompt…",
  "Injecting security constraints…",
  "Compressing and structuring…",
  "Formatting for your coding agent…",
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      className="press flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-ink-subtle transition-colors hover:border-border-strong hover:text-ink"
      aria-label={`Copy ${label ?? "text"}`}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path
              d="m3 8.5 3.5 3.5L13 5"
              stroke="var(--color-success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-success-ink">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <rect
              x="5.5"
              y="5.5"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M10.5 3.5v-1a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function ModePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`press rounded-full px-3.5 py-1.5 font-body text-xs font-medium transition-all ${
        active
          ? "bg-ink text-canvas shadow-sm"
          : "text-ink-muted hover:bg-surface-raised hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function CommandCard() {
  // Optimistic default: Compile is the flagship entry point when it's
  // available. Only falls back to Scan once the HEAD probe below confirms
  // Compile is genuinely unavailable — and only if the visitor hasn't
  // already picked a tab themselves.
  const [mode, setMode] = useState<Mode>("compile");
  const userPickedMode = useRef(false);
  const [prompt, setPrompt] = useState("");
  const [scanId, setScanId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompileData | null>(null);
  const [compiledForPrompt, setCompiledForPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [compileAvailable, setCompileAvailable] = useState<boolean | null>(null);
  const [scanIdError, setScanIdError] = useState<string | null>(null);
  const [scanWait, setScanWait] = useState<"idle" | "checking" | "error">("idle");
  const [scanWaitError, setScanWaitError] = useState<string | null>(null);
  const scanRunId = useRef(0);

  const [detectedStack, setDetectedStack] = useState<StackKey[]>([]);
  const [focusMode, setFocusMode] = useState<FocusMode>("security");

  const [activeStage, setActiveStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [injectedCount, setInjectedCount] = useState<number | null>(null);

  const runId = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/compile", { method: "HEAD" }).then((res) => {
      if (!alive) return;
      const available = res.status !== 503;
      setCompileAvailable(available);
      if (!available && !userPickedMode.current) setMode("scan");
    }).catch(() => {
      if (!alive) return;
      setCompileAvailable(false);
      if (!userPickedMode.current) setMode("scan");
    });
    return () => { alive = false; };
  }, []);

  const canCompile = prompt.trim().length >= 10 && !loading;

  const promptScoreBefore: PromptScore | null = useMemo(() => {
    if (prompt.trim().length < 10) return null;
    return scorePrompt(prompt, detectedStack);
  }, [prompt, detectedStack]);

  const stages: Stage[] = STAGE_LABELS.map((label, i) => ({
    label:
      i === 3 && injectedCount != null
        ? `Injecting ${injectedCount} security constraint${injectedCount === 1 ? "" : "s"}…`
        : label,
  }));

  async function handleCompile() {
    if (!canCompile) return;
    const myRun = ++runId.current;
    const currentPrompt = prompt;

    setLoading(true);
    setError(null);
    setResult(null);
    setInjectedCount(null);
    setCompletedStages(new Set());
    setActiveStage(0);

    const stackKeys = detectStack(currentPrompt);

    // Stage 1 — detect stack (real, instant computation above; held briefly so it's visible)
    await wait(150);
    if (myRun !== runId.current) return;
    setCompletedStages((s) => new Set(s).add(0));
    setActiveStage(1);

    // Stage 2 — load failure patterns (real network call to the feedback-loop-backed risk route)
    try {
      const params = new URLSearchParams({ stack: stackKeys.join(",") });
      await fetch(`/api/compile/risk?${params}`);
    } catch {
      /* risk line is best-effort; compile proceeds regardless */
    }
    if (myRun !== runId.current) return;
    setCompletedStages((s) => new Set(s).add(1));
    setActiveStage(2);

    // Stage 3 — score the raw prompt (real, instant)
    await wait(150);
    if (myRun !== runId.current) return;
    setCompletedStages((s) => new Set(s).add(2));
    setActiveStage(3);

    // Stage 4 — select applicable constraints for this stack + focus mode (real, instant)
    const selection = getApplicableConstraints(stackKeys, focusMode);
    setInjectedCount(selection.primary.length + selection.deferred.length);
    await wait(150);
    if (myRun !== runId.current) return;
    setCompletedStages((s) => new Set(s).add(3));
    setActiveStage(4);

    // Stage 5 — the real Claude API round trip via /api/compile
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: currentPrompt, focusMode }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (myRun !== runId.current) return;

      if (!res.ok) {
        if (res.status === 502 || res.status === 503) {
          setCompileAvailable(false);
          setError("unavailable");
        } else if (res.status === 429) {
          setError("You've hit the daily compile limit. Try again tomorrow, or upgrade to Pro for unlimited compiles.");
        } else {
          setError((data["error"] as string) ?? "Something went wrong. Please try again.");
        }
        setLoading(false);
        setActiveStage(-1);
        return;
      }

      setCompletedStages((s) => new Set(s).add(4));
      setActiveStage(5);

      // Stage 6 — formatting for the split-screen view (real, quick)
      await wait(150);
      if (myRun !== runId.current) return;
      setCompletedStages((s) => new Set(s).add(5));
      setActiveStage(-1);
      setCompiledForPrompt(currentPrompt);
      setResult(data as unknown as CompileData);
    } catch {
      if (myRun !== runId.current) return;
      setError("Can't reach the server. Check your connection and try again.");
      setActiveStage(-1);
    } finally {
      if (myRun === runId.current) setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCompile();
    }
  }

  async function handleScanLookup(e: React.MouseEvent) {
    e.preventDefault();
    const trimmed = scanId.trim();
    if (!trimmed) {
      setScanIdError("Paste a scan ID first");
      return;
    }
    setScanIdError(null);
    setScanWaitError(null);
    setScanWait("checking");

    const myRun = ++scanRunId.current;
    const startedAt = Date.now();
    const POLL_INTERVAL_MS = 1500;
    const TIMEOUT_MS = 30_000;

    // Real status polling against /api/scan/[id] — the game is visible for as
    // long as this actually takes, not a fixed fake duration. Most lookups
    // resolve on the first check since the CLI uploads a completed scan in
    // one shot; the pending/running branch exists for when a scan is
    // genuinely still in flight.
    while (true) {
      if (myRun !== scanRunId.current) return;
      try {
        const res = await fetch(`/api/scan/${trimmed}`);
        if (res.status === 404) {
          setScanWait("error");
          setScanWaitError("Scan not found. Check the ID and try again.");
          return;
        }
        if (!res.ok) {
          setScanWait("error");
          setScanWaitError("Couldn't check scan status. Try again.");
          return;
        }
        const data = (await res.json()) as { status?: string };
        if (data.status !== "pending" && data.status !== "running") {
          window.location.href = `/scan/${trimmed}`;
          return;
        }
      } catch {
        setScanWait("error");
        setScanWaitError("Can't reach the server. Check your connection and try again.");
        return;
      }

      if (Date.now() - startedAt > TIMEOUT_MS) {
        window.location.href = `/scan/${trimmed}`;
        return;
      }
      await wait(POLL_INTERVAL_MS);
    }
  }

  function skipScanWait() {
    scanRunId.current++;
    window.location.href = `/scan/${scanId.trim()}`;
  }

  // Once a user is in compile mode, keep the tab visible even if a call
  // later fails and flips compileAvailable to false — otherwise the mode
  // switcher loses its only pill for the tab the user is still looking at.
  const showCompileTab = compileAvailable !== false || mode === "compile";

  return (
    <div className="flex w-full flex-col gap-6">
      {/* The card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl transition-shadow focus-within:border-brand/40">
        {/* Mode switcher */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <div className="flex items-center gap-1">
            {showCompileTab && (
              <ModePill
                active={mode === "compile"}
                onClick={() => { userPickedMode.current = true; setMode("compile"); setScanIdError(null); setScanWait("idle"); }}
              >
                Compile a prompt
              </ModePill>
            )}
            <ModePill
              active={mode === "scan"}
              onClick={() => { userPickedMode.current = true; setMode("scan"); setError(null); }}
            >
              Look up a scan
            </ModePill>
          </div>
          <span className="hidden font-mono text-[11px] text-ink-subtle sm:block">
            {mode === "compile" ? "⌘↵ to compile" : "paste a scan ID"}
          </span>
        </div>

        {mode === "compile" ? (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build…"
              rows={4}
              className="w-full resize-none bg-transparent px-5 pt-4 pb-2 font-body text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-subtle"
            />

            {prompt.length === 0 && (
              <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
                <span className="font-mono text-[11px] text-ink-subtle">Try:</span>
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(ex)}
                    className="press shrink-0 rounded-full border border-border bg-surface px-3 py-1 font-body text-xs text-ink-subtle transition-colors hover:border-brand/40 hover:text-brand-ink"
                  >
                    {ex.length > 42 ? ex.slice(0, 42) + "…" : ex}
                  </button>
                ))}
              </div>
            )}

            <StackPanel
              prompt={prompt}
              focusMode={focusMode}
              onFocusModeChange={setFocusMode}
              onStackDetected={setDetectedStack}
            />

            <div className="flex items-center justify-end gap-3 px-4 pt-2 pb-3.5">
              <button
                onClick={handleCompile}
                disabled={!canCompile}
                aria-label="Compile"
                className={`press grid size-9 shrink-0 place-items-center rounded-full transition-all ${
                  canCompile
                    ? "bg-linear-to-br from-brand to-brand-hover text-ink-onbrand shadow-brand hover:brightness-110"
                    : "bg-surface-sunken text-ink-subtle"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 12.5v-9M4.5 7 8 3.5 11.5 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 p-5">
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <input
                  type="text"
                  value={scanId}
                  onChange={(e) => { setScanId(e.target.value); setScanIdError(null); }}
                  disabled={scanWait === "checking"}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && scanId.trim() && scanWait !== "checking") {
                      handleScanLookup(e as unknown as React.MouseEvent);
                    }
                  }}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`w-full rounded-lg border bg-canvas/60 px-4 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand/50 disabled:opacity-60 ${
                    scanIdError ? "border-danger/50" : "border-border"
                  }`}
                />
                {scanIdError && (
                  <span className="font-body text-xs text-danger-ink">{scanIdError}</span>
                )}
              </div>
              <button
                onClick={handleScanLookup}
                disabled={scanWait === "checking"}
                className={`press flex h-[42px] items-center gap-1.5 self-start rounded-lg px-4 font-body text-sm transition-all ${
                  scanId.trim() && scanWait !== "checking"
                    ? "bg-linear-to-br from-brand to-brand-hover text-ink-onbrand shadow-brand hover:brightness-110"
                    : "cursor-not-allowed bg-surface-sunken text-ink-subtle"
                }`}
              >
                {scanWait === "checking" ? "Checking…" : "View report"}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-xs leading-relaxed text-ink-subtle">
              <span>Run</span>
              <span className="inline-flex items-center gap-1.5">
                <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono">
                  npx shiprank ./my-project --upload
                </code>
                <CopyButton text="npx shiprank ./my-project --upload" label="command" />
              </span>
              <span>in your terminal, then paste the scan ID it prints.</span>
            </div>
          </div>
        )}
      </div>

      {/* Scan wait — real status polling, game visible only as long as it actually takes */}
      {mode === "scan" && scanWait === "checking" && (
        <div className="reveal flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <span className="font-body text-sm text-ink-muted">Checking scan status…</span>
          <BounceGame />
          <button
            onClick={skipScanWait}
            className="font-body text-xs text-ink-subtle underline decoration-border-strong underline-offset-2 transition-colors hover:text-ink"
          >
            Skip
          </button>
        </div>
      )}

      {mode === "scan" && scanWait === "error" && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft">
              <span className="size-1.5 rounded-full bg-danger" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-body text-sm text-ink">{scanWaitError}</p>
              <button
                onClick={() => setScanWait("idle")}
                className="self-start font-body text-xs text-brand transition-colors hover:text-brand-hover"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt score — before Compile runs */}
      {mode === "compile" && !loading && !result && promptScoreBefore && (
        <PromptScoreCard label="Prompt score" score={promptScoreBefore} />
      )}

      {/* Multi-stage progress */}
      {loading && (
        <StageProgress stages={stages} activeIndex={activeStage} completedIndices={completedStages} />
      )}

      {/* Error state — designed card, not bare text */}
      {error && !loading && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          {error === "unavailable" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-warning-soft">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M8 5v3.5M8 10.5v.5" stroke="var(--color-warning-ink)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="8" r="6.25" stroke="var(--color-warning-ink)" strokeWidth="1.5" />
                </svg>
              </span>
              <p className="font-display text-base text-ink">Compile is temporarily offline</p>
              <p className="max-w-sm font-body text-sm text-ink-muted">
                The AI compiler needs an active API connection. In the meantime, scan your project locally — it works offline.
              </p>
              <code className="mt-1 rounded-lg border border-border bg-surface-sunken px-4 py-2 font-mono text-sm text-ink">
                npx shiprank ./your-project
              </code>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft">
                <span className="size-1.5 rounded-full bg-danger" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-body text-sm text-ink">{error}</p>
                <button
                  onClick={() => { setError(null); handleCompile(); }}
                  className="self-start font-body text-xs text-brand transition-colors hover:text-brand-hover"
                >
                  Try again →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results — split-screen annotated output */}
      {result && !loading && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
              {result.steps.length === 1
                ? "Ship-ready spec"
                : `${result.steps.length}-step build plan`}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <SplitOutput
            originalPrompt={compiledForPrompt}
            detectedStack={result.detectedStack ?? detectedStack}
            steps={result.steps}
          />
        </div>
      )}
    </div>
  );
}
