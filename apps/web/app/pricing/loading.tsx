export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <div className="skeleton h-8 w-56 rounded-md" />
      <div className="grid gap-6 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
