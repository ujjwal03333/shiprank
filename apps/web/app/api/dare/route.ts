import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
import { z } from "zod";
import { checkRateLimit, ipFromRequest, rateLimitHeaders } from "@/lib/rate-limit";
import {
  DARE_MAX_SIZE_KB,
  fetchGithubRepoMeta,
  parseGithubRepoUrl,
} from "@/lib/github-repo";
import { processDareJob } from "@/lib/dare-worker";
import { createDareJob } from "@/lib/dare-store";
import { dareRateLimitBypassed } from "@/lib/seed-guard";

const BodySchema = z.object({
  repoUrl: z.string().min(3).max(300),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a GitHub repository URL." }, { status: 422 });
  }

  const repo = parseGithubRepoUrl(parsed.data.repoUrl);
  if (!repo) {
    return NextResponse.json(
      { error: "Use a public GitHub URL like github.com/user/repo." },
      { status: 422 },
    );
  }

  const ip = ipFromRequest(request);
  const bypass = dareRateLimitBypassed(request);
  const rl = bypass
    ? { allowed: true, remaining: 99, resetAt: Date.now() + 3600_000 }
    : await checkRateLimit(`dare:${ip}`, 3, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Three dares per hour per IP." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const meta = await fetchGithubRepoMeta(repo.owner, repo.repo);
  if (!meta.ok) {
    const message =
      meta.status === 404
        ? "Repository not found or private."
        : `GitHub returned ${meta.status}.`;
    return NextResponse.json({ error: message }, { status: meta.status === 404 ? 404 : 502 });
  }
  if (meta.meta.private) {
    return NextResponse.json({ error: "Private repositories cannot be dared." }, { status: 403 });
  }
  if (meta.meta.sizeKb > DARE_MAX_SIZE_KB) {
    return NextResponse.json(
      { error: `Repository is too large (${Math.round(meta.meta.sizeKb / 1024)} MB). Cap is 50 MB.` },
      { status: 413 },
    );
  }

  let job;
  try {
    job = await createDareJob(repo.url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create dare job.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Await on the request (maxDuration 60). Vercel Hobby `after()` is too
  // short to finish clone + scan + ingest, which left scan_id null.
  await processDareJob(job.id);

  return NextResponse.json(
    { jobId: job.id, repo: repo.url },
    { status: 201, headers: rateLimitHeaders(rl) },
  );
}
