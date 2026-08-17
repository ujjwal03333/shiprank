"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DareForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/dare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: value }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
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
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor="repo-url" className="sr-only">
        GitHub repository URL
      </label>
      <input
        id="repo-url"
        name="repoUrl"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="github.com/user/repo"
        autoComplete="off"
        spellCheck={false}
        required
        className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-center font-mono text-sm text-ink placeholder:text-ink-subtle shadow-sm"
      />
      <button
        type="submit"
        disabled={pending || value.trim().length < 3}
        className="press rounded-xl bg-brand px-5 py-3 font-body text-sm font-medium text-ink-onbrand hover:bg-brand-hover disabled:opacity-50"
      >
        {pending ? "Checking repository…" : "Dare it"}
      </button>
      {error && (
        <p role="alert" className="font-body text-sm text-danger-ink">
          {error}
        </p>
      )}
    </form>
  );
}
