interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ── In-memory fallback (no Upstash configured) ────────────────────────────────

interface MemoryEntry { count: number; windowStart: number }
const memoryStore = new Map<string, MemoryEntry>();

function checkMemory(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.windowStart + windowMs };
  }
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.windowStart + windowMs };
}

// ── Upstash Redis (production) ────────────────────────────────────────────────

async function checkUpstash(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) return checkMemory(key, limit, windowSeconds * 1000);

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");
    const redis = new Redis({ url, token });
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, `${windowSeconds} s`),
      analytics: false,
    });
    const result = await rl.limit(key);
    return { allowed: result.success, remaining: result.remaining, resetAt: result.reset };
  } catch (err) {
    console.error("Upstash rate limit check failed, falling back to in-memory:", err);
    return checkMemory(key, limit, windowSeconds * 1000);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  return checkUpstash(`api:${identifier}`, limit, windowSeconds);
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export function ipFromRequest(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  );
}
