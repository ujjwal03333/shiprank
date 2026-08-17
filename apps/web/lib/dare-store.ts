import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getServiceClient, isSupabaseConfigured } from "./supabase";
import type { DareJobStatus, DareProgress } from "./dare-worker";

export interface DareJob {
  id: string;
  repo_url: string;
  status: DareJobStatus;
  progress_stage: string | null;
  progress: DareProgress | null;
  scan_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export type DareJobPatch = Partial<
  Pick<
    DareJob,
    "status" | "progress_stage" | "progress" | "scan_id" | "error_message" | "completed_at"
  >
>;

const FILE = join(tmpdir(), "shiprank-dare-jobs.json");

function readLocal(): Record<string, DareJob> {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as Record<string, DareJob>;
  } catch {
    return {};
  }
}

function writeLocal(all: Record<string, DareJob>): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(all));
}

let supabaseOk: boolean | null = null;

async function supabaseAvailable(): Promise<boolean> {
  if (supabaseOk != null) return supabaseOk;
  if (!isSupabaseConfigured()) {
    supabaseOk = false;
    return false;
  }
  try {
    const db = getServiceClient();
    const { error } = await db.from("scan_jobs").select("id").limit(1);
    supabaseOk = !error;
    return supabaseOk;
  } catch {
    supabaseOk = false;
    return false;
  }
}

export async function createDareJob(repoUrl: string): Promise<DareJob> {
  const now = new Date().toISOString();
  if (await supabaseAvailable()) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("scan_jobs")
      .insert({ repo_url: repoUrl, status: "queued", progress_stage: "Queued" })
      .select("id, repo_url, status, progress_stage, progress, scan_id, error_message, created_at, completed_at")
      .single();
    if (!error && data) return data as DareJob;
  }

  const job: DareJob = {
    id: randomUUID(),
    repo_url: repoUrl,
    status: "queued",
    progress_stage: "Queued",
    progress: null,
    scan_id: null,
    error_message: null,
    created_at: now,
    completed_at: null,
  };
  const all = readLocal();
  all[job.id] = job;
  writeLocal(all);
  return job;
}

export async function getDareJob(id: string): Promise<DareJob | null> {
  if (await supabaseAvailable()) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("scan_jobs")
      .select("id, repo_url, status, progress_stage, progress, scan_id, error_message, created_at, completed_at")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return data as DareJob;
  }
  return readLocal()[id] ?? null;
}

export async function updateDareJob(id: string, patch: DareJobPatch): Promise<void> {
  if (await supabaseAvailable()) {
    const db = getServiceClient();
    const { error } = await db.from("scan_jobs").update(patch).eq("id", id);
    if (!error) return;
  }
  const all = readLocal();
  const cur = all[id];
  if (!cur) return;
  all[id] = { ...cur, ...patch };
  writeLocal(all);
}

/** Atomically move queued → cloning. Returns the job if this caller won. */
export async function claimDareJob(id: string): Promise<DareJob | null> {
  if (await supabaseAvailable()) {
    const db = getServiceClient();
    const { data, error } = await db
      .from("scan_jobs")
      .update({ status: "cloning", progress_stage: "Cloning repository..." })
      .eq("id", id)
      .eq("status", "queued")
      .select("id, repo_url, status, progress_stage, progress, scan_id, error_message, created_at, completed_at")
      .maybeSingle();
    if (!error && data) return data as DareJob;
    // If supabase is up but claim missed, still check local (dev fallback jobs).
  }

  const all = readLocal();
  const cur = all[id];
  if (!cur || cur.status !== "queued") return null;
  const claimed: DareJob = {
    ...cur,
    status: "cloning",
    progress_stage: "Cloning repository...",
  };
  all[id] = claimed;
  writeLocal(all);
  return claimed;
}
