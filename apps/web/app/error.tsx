"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="font-mono text-sm uppercase tracking-widest text-ink-subtle">
        Error
      </span>
      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md font-body text-base leading-relaxed text-ink-muted">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="press mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-medium text-ink-onbrand shadow-sm transition-colors hover:bg-brand-hover"
      >
        Try again
      </button>
    </div>
  );
}
