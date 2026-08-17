export default function Loading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
      <div className="skeleton h-7 w-48 rounded-md" />
      <div className="skeleton h-64 w-full rounded-lg" />
    </div>
  );
}
