import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="font-mono text-sm uppercase tracking-widest text-ink-subtle">
        404
      </span>
      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md font-body text-base leading-relaxed text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved. Head back to the homepage and try again.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 font-body text-sm font-medium text-ink-onbrand shadow-sm transition-colors hover:bg-brand-hover"
      >
        Back to home
      </Link>
    </div>
  );
}
