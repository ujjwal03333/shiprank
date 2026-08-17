import { NextResponse } from "next/server";
import { processDareJob } from "@/lib/dare-worker";
import { getDareJob } from "@/lib/dare-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await getDareJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

/** Idempotent kick — if the job is still queued (after() missed), start it. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await getDareJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status === "queued") {
    void processDareJob(jobId);
  }
  return NextResponse.json({ started: job.status === "queued" });
}
