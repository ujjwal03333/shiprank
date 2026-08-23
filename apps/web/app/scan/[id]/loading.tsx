export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8 px-6 py-16">
      <div className="w-full rounded-[10px] border border-border px-6 py-12">
        <div className="skeleton mx-auto h-24 w-24 rounded" />
        <div className="skeleton mx-auto mt-6 h-4 w-48 rounded" />
        <div className="skeleton mx-auto mt-3 h-6 w-40 rounded" />
      </div>
      <div className="skeleton h-11 w-full rounded-[10px]" />
      <div className="skeleton h-40 w-full rounded-[10px]" />
    </div>
  );
}
