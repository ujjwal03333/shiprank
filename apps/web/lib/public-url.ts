/**
 * Host we control. shiprank.dev is a different product ("lines shipped")
 * and must never appear in tweets, OG images, CLI uploads, or share links.
 */
export const CONTROLLED_HOST = "https://shiprank-web-cqm7.vercel.app";

export function publicAppUrl(): string {
  const raw = process.env["NEXT_PUBLIC_APP_URL"]?.trim().replace(/\/$/, "");
  if (raw && !isForeignShiprankHost(raw)) return raw;
  if (process.env["NODE_ENV"] === "development") return "http://localhost:3000";
  return CONTROLLED_HOST;
}

/** Never let a share/OG/tweet origin resolve to shiprank.dev. */
export function safePublicOrigin(url?: string | null): string {
  const raw = url?.trim().replace(/\/$/, "") ?? "";
  if (raw && !isForeignShiprankHost(raw)) return raw;
  return publicAppUrl();
}

export function isForeignShiprankHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "shiprank.dev" || host === "www.shiprank.dev";
  } catch {
    return /shiprank\.dev/i.test(url);
  }
}

export function cardPath(scanId: string): string {
  return `/s/${scanId}`;
}

export function cardUrl(scanId: string, origin: string = publicAppUrl()): string {
  return `${safePublicOrigin(origin)}${cardPath(scanId)}`;
}

export function dareUrl(origin: string = publicAppUrl()): string {
  return `${safePublicOrigin(origin)}/dare`;
}
