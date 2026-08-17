import { describe, it, expect, beforeEach } from "vitest";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDareJob, getDareJob, claimDareJob, updateDareJob } from "../dare-store";

const FILE = join(tmpdir(), "shiprank-dare-jobs.json");

describe("dare-store (local fallback)", () => {
  beforeEach(() => {
    try { unlinkSync(FILE); } catch { /* ok */ }
  });

  it("creates, claims once, and updates a job", async () => {
    const job = await createDareJob("https://github.com/octocat/Hello-World");
    expect(job.status).toBe("queued");
    const fetched = await getDareJob(job.id);
    expect(fetched?.repo_url).toContain("octocat/Hello-World");

    const first = await claimDareJob(job.id);
    expect(first?.status).toBe("cloning");
    const second = await claimDareJob(job.id);
    expect(second).toBeNull();

    await updateDareJob(job.id, { status: "complete", progress: { score: 80, grade: "B" } });
    const done = await getDareJob(job.id);
    expect(done?.status).toBe("complete");
    expect(done?.progress?.score).toBe(80);
  });
});
