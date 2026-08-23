import type { Metadata } from "next";
import { DareProgress } from "./dare-progress";

export const metadata: Metadata = {
  title: "Dare",
  description: "A ShipRank Dare in progress.",
};

export default async function DareJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return (
    <div className="night-court flex min-h-[calc(100dvh-8rem)] flex-col justify-center px-6 py-16">
      <DareProgress jobId={jobId} />
    </div>
  );
}
