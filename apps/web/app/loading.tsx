export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      {/* Heading skeleton */}
      <div className="skeleton h-8 w-48 rounded-md" />
      {/* Subtitle skeleton */}
      <div className="skeleton mt-3 h-4 w-80 rounded-md" />

      {/* Content block skeletons */}
      <div className="mt-10 space-y-4">
        <div className="skeleton h-4 w-full rounded-md" />
        <div className="skeleton h-4 w-5/6 rounded-md" />
        <div className="skeleton h-4 w-3/4 rounded-md" />
      </div>

      {/* Card-like skeleton */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <div className="skeleton h-5 w-24 rounded-md" />
            <div className="skeleton mt-3 h-4 w-full rounded-md" />
            <div className="skeleton mt-2 h-4 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
