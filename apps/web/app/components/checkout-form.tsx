"use client";

import { useState } from "react";

export function CheckoutForm({
  plan,
  cta,
  highlighted,
}: {
  plan: "pro" | "monitor";
  cta: string;
  highlighted?: boolean | undefined;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const form = e.currentTarget;
    const body = new FormData(form);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        body,
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      if (res.status === 503) {
        setMessage("Checkout is coming soon — Stripe isn’t configured on this deployment yet.");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Could not start checkout.");
        return;
      }
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="plan" value={plan} />
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        className="rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-ink placeholder:text-ink-subtle"
      />
      <button
        type="submit"
        disabled={pending}
        className={`press rounded-md px-4 py-2.5 font-body text-sm transition-colors disabled:opacity-50 ${
          highlighted
            ? "bg-brand text-ink-onbrand hover:bg-brand-hover"
            : "bg-ink text-canvas hover:bg-brand-hover"
        }`}
      >
        {pending ? "Starting checkout…" : `${cta} →`}
      </button>
      {message && (
        <p role="alert" className="font-body text-xs text-ink-muted">
          {message}
        </p>
      )}
    </form>
  );
}
