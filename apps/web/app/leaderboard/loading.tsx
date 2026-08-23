export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-14">
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton h-3 w-12 rounded" />
        <div className="skeleton h-9 w-28 rounded-md" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-4 rounded-[10px] border border-border px-6 py-12"
          >
            <div className="skeleton h-16 w-16 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-5 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
