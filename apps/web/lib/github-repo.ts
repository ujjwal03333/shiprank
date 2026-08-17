export interface ParsedGithubRepo {
  owner: string;
  repo: string;
  url: string;
}

const GITHUB_RE =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:\/.*)?$/;

export function parseGithubRepoUrl(raw: string): ParsedGithubRepo | null {
  const trimmed = raw.trim();
  const match = GITHUB_RE.exec(trimmed);
  if (!match) return null;
  const owner = match[1]!;
  const repo = match[2]!.replace(/\.git$/, "");
  if (!owner || !repo || owner === "." || repo === ".") return null;
  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
  };
}

export interface GithubRepoMeta {
  private: boolean;
  defaultBranch: string;
  sizeKb: number;
  fullName: string;
}

export async function fetchGithubRepoMeta(
  owner: string,
  repo: string,
  signal?: AbortSignal,
): Promise<{ ok: true; meta: GithubRepoMeta } | { ok: false; status: number }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "shiprank-dare",
  };
  const token = process.env["GITHUB_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = { method: "GET", headers };
  if (signal) init.signal = signal;
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, init);

    if (!res.ok) return { ok: false, status: res.status };

    const body = (await res.json()) as {
      private?: boolean;
      default_branch?: string;
      size?: number;
      full_name?: string;
    };

    return {
      ok: true,
      meta: {
        private: !!body.private,
        defaultBranch: body.default_branch ?? "main",
        sizeKb: typeof body.size === "number" ? body.size : 0,
        fullName: body.full_name ?? `${owner}/${repo}`,
      },
    };
  } catch {
    return { ok: false, status: 502 };
  }
}

export const DARE_MAX_SIZE_KB = 50 * 1024;
export const DARE_MAX_FILES = 5000;
export const DARE_TIMEOUT_MS = 120_000;
