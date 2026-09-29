"use client";

import { useState } from "react";

const TOO_SHORT = "Use at least 10 characters.";
const COPY_FAIL = "Couldn’t copy. Select the brief and copy it yourself.";

type RateLimit = {
  remaining?: number;
  resetAt?: number;
  allowed?: boolean;
};

type CompileBody = {
  raw?: string;
  provider?: string;
  rateLimit?: RateLimit;
  error?: string;
  reason?: string;
  resetAt?: number;
};

function formatReset(resetAt: number): string {
  return new Date(resetAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function chipLabel(provider: string | undefined): string {
  const value = provider?.trim();
  return value ? value : "Local brief";
}

export function CompileForm() {
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [chip, setChip] = useState("Local brief");
  const [remaining, setRemaining] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (trimmed.length < 10) {
      setError(TOO_SHORT);
      return;
    }

    setError(null);
    setCopied(false);
    setCopyError(null);
    setPending(true);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as CompileBody;

      if (res.status === 429) {
        setRaw(null);
        const resetAt =
          typeof data.resetAt === "number"
            ? data.resetAt
            : typeof data.rateLimit?.resetAt === "number"
              ? data.rateLimit.resetAt
              : null;
        setError(
          resetAt != null
            ? `Too many compiles. Try again at ${formatReset(resetAt)}.`
            : "Too many compiles. Try again later.",
        );
        return;
      }

      if (res.status === 422) {
        setRaw(null);
        setError(TOO_SHORT);
        return;
      }

      if (res.status === 502) {
        setRaw(null);
        const reason = data.reason?.trim();
        setError(reason ? reason : "Compile temporarily unavailable. Please try again later.");
        return;
      }

      if (!res.ok || typeof data.raw !== "string") {
        setRaw(null);
        const message = data.error?.trim();
        setError(message ? message : "Could not compile.");
        return;
      }

      setRaw(data.raw);
      setChip(chipLabel(data.provider));
      setRemaining(
        data.rateLimit && typeof data.rateLimit.remaining === "number"
          ? `${data.rateLimit.remaining} remaining`
          : null,
      );
    } catch {
      setRaw(null);
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function copyBrief() {
    if (raw == null) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(COPY_FAIL);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-left">
      <form
        onSubmit={onSubmit}
        aria-busy={pending}
        className="flex w-full min-w-0 flex-col gap-3"
      >
        <label htmlFor="compile-prompt" className="sr-only">
          what you want built
        </label>
        <textarea
          id="compile-prompt"
          name="prompt"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (error) setError(null);
          }}
          placeholder="what you want built."
          minLength={10}
          maxLength={2000}
          rows={6}
          required
          spellCheck
          aria-invalid={!!error}
          className="w-full min-w-0 resize-y rounded-[10px] border border-border bg-surface px-4 py-4 font-mono text-base text-ink placeholder:text-ink-subtle shadow-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="press w-full rounded-[10px] bg-ink px-5 py-3.5 font-body text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Compiling…" : "Compile"}
        </button>
        {error ? (
          <p role="alert" className="break-words font-body text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
      </form>

      {raw != null ? (
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] text-ink-subtle">{chip}</span>
            {remaining ? (
              <span className="font-mono text-[11px] text-ink-subtle">{remaining}</span>
            ) : null}
          </div>
          <pre className="max-w-full whitespace-pre-wrap break-words border border-border bg-canvas px-3 py-3 font-mono text-xs leading-relaxed text-ink">
            {raw}
          </pre>
          <button
            type="button"
            onClick={() => void copyBrief()}
            className="press w-full rounded-[10px] bg-ink px-4 py-3 font-body text-sm text-canvas hover:opacity-90"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          {copyError ? (
            <p role="alert" className="text-center font-body text-sm text-danger-ink">
              {copyError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
