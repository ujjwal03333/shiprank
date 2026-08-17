import type { Metadata } from "next";
import { DareProgress } from "./dare-progress";

export const metadata: Metadata = {
  title: "Dare in progress",
  description: "Live progress for a ShipRank Dare scan.",
};

export default async function DareJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-20">
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-brand">
          Dare
        </span>
        <h1 className="mt-2 font-display text-3xl text-ink">Scanning…</h1>
      </div>
      <DareProgress jobId={jobId} />
    </div>
  );
}
