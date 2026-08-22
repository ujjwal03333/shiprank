/** Shared host helpers for verify + seed scripts. No extra deps. */

export const CONTROLLED_HOST = "https://shiprank-web-cqm7.vercel.app";

export function isForeignShiprankHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "shiprank.dev" || host === "www.shiprank.dev";
  } catch {
    return /shiprank\.dev/i.test(url);
  }
}

export function normalizeOrigin(raw) {
  return String(raw ?? "").trim().replace(/\/$/, "");
}

export function resolveHost(argv = process.argv.slice(2)) {
  const flag = flagValue(argv, "--host");
  if (flag && !isForeignShiprankHost(flag)) return normalizeOrigin(flag);
  if (process.env.SHIPRANK_HOST && !isForeignShiprankHost(process.env.SHIPRANK_HOST)) {
    return normalizeOrigin(process.env.SHIPRANK_HOST);
  }
  if (process.env.NEXT_PUBLIC_APP_URL && !isForeignShiprankHost(process.env.NEXT_PUBLIC_APP_URL)) {
    return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  }
  return CONTROLLED_HOST;
}

export function resolveSecret(argv = process.argv.slice(2)) {
  return flagValue(argv, "--secret") || process.env.CRON_SECRET || "";
}

export function flagValue(argv, name) {
  const i = argv.indexOf(name);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.slice(name.length + 1) : "";
}

export function hasFlag(argv, name) {
  return argv.includes(name);
}

export function lockedTweet({ name, score, grade, origin }) {
  const host =
    origin && !isForeignShiprankHost(origin) ? normalizeOrigin(origin) : CONTROLLED_HOST;
  return `${name} is a ${grade} (${score}).\nI dare you to beat it.\n${host}/dare`;
}

export function pngSize(buf) {
  if (buf.length < 24 || buf[0] !== 0x89 || buf[1] !== 0x50) {
    throw new Error("not a PNG");
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

export function seedHeaders(secret) {
  const headers = { "content-type": "application/json" };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return headers;
}

export async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { res, data };
}

export async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function pollDare(origin, jobId, { timeoutMs = 90_000, intervalMs = 2_000, secret = "" } = {}) {
  const started = Date.now();
  await fetch(`${origin}/api/dare/${jobId}`, {
    method: "POST",
    headers: seedHeaders(secret),
  });
  while (Date.now() - started < timeoutMs) {
    const { res, data } = await fetchJson(`${origin}/api/dare/${jobId}`);
    if (!res.ok) {
      return { ok: false, error: data?.error ?? `GET job ${res.status}`, job: data };
    }
    if (data.status === "complete") return { ok: true, job: data };
    if (data.status === "failed") {
      return { ok: false, error: data.error_message ?? "Dare failed", job: data };
    }
    await sleep(intervalMs);
  }
  return { ok: false, error: `Timed out after ${timeoutMs}ms`, job: null };
}
