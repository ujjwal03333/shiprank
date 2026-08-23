"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseGithubRepoUrl } from "@/lib/github-repo";

const INVALID_URL = "Use a public GitHub URL like github.com/user/repo.";
const RATE_LIMIT =
  "Three dares per hour. Try later, or run npx shiprank locally.";

export function DareForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const parsed = parseGithubRepoUrl(trimmed);
  const tooShort = trimmed.length < 3;
  const invalidAfterBlur = touched && !tooShort && !parsed;
  const disabled = pending || tooShort || invalidAfterBlur;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!parseGithubRepoUrl(value)) {
      setError(INVALID_URL);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/dare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: value }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (res.status === 429) {
        setError(RATE_LIMIT);
        return;
      }
      if (!res.ok || !data.jobId) {
        setError(data.error ?? "Could not start the dare.");
        return;
      }
      router.push(`/dare/${data.jobId}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full min-w-0 flex-col gap-3">
      <label htmlFor="repo-url" className="sr-only">
        GitHub repository URL
      </label>
      <input
        id="repo-url"
        name="repoUrl"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        onBlur={() => setTouched(true)}
        placeholder="github.com/user/repo"
        autoComplete="off"
        spellCheck={false}
        required
        aria-invalid={invalidAfterBlur || !!error}
        className="w-full min-w-0 rounded-[10px] border border-border bg-surface px-4 py-4 text-center font-mono text-base text-ink placeholder:text-ink-subtle shadow-sm"
      />
      <button
        type="submit"
        disabled={disabled}
        className="press w-full rounded-[10px] bg-ink px-5 py-3.5 font-body text-sm font-medium text-canvas hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Daring…" : "Dare"}
      </button>
      {(error || invalidAfterBlur) && (
        <p role="alert" className="break-words font-body text-sm text-danger-ink">
          {error ?? INVALID_URL}
        </p>
      )}
    </form>
  );
}
