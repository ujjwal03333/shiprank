export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <div className="skeleton h-8 w-48 rounded-md" />
      <div className="skeleton h-4 w-96 max-w-full rounded-md" />
      <div className="skeleton h-56 w-full rounded-lg" />
      <div className="skeleton h-40 w-full rounded-lg" />
    </div>
  );
}
