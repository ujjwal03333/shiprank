/**
 * Rate limiter for the compile endpoint.
 * Free tier: 5 compiles/day per identifier (IP or user ID).
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are present. Falls back to an in-memory store for local dev/testing so the
 * rest of the code doesn't need to branch on environment.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix ms when the window resets */
  resetAt: number;
}

export interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ── In-memory limiter (tests + local dev) ─────────────────────────────────────

interface MemoryEntry {
  count: number;
  windowStart: number;
}

export function createMemoryRateLimiter(
  maxRequests = 5,
  windowMs = ONE_DAY_MS,
): RateLimiter {
  const store = new Map<string, MemoryEntry>();

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const entry = store.get(identifier);

      if (!entry || now - entry.windowStart >= windowMs) {
        store.set(identifier, { count: 1, windowStart: now });
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt: now + windowMs,
        };
      }

      if (entry.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: entry.windowStart + windowMs,
        };
      }

      entry.count++;
      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetAt: entry.windowStart + windowMs,
      };
    },
  };
}

// ── Upstash Redis limiter (production) ────────────────────────────────────────

export async function createUpstashRateLimiter(
  maxRequests = 5,
  windowMs = ONE_DAY_MS,
): Promise<RateLimiter> {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!url || !token) {
    return createMemoryRateLimiter(maxRequests, windowMs);
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    const redis = new Redis({ url, token });
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(maxRequests, `${Math.round(windowMs / 1000)} s`),
      analytics: false,
    });

    return {
      async check(identifier: string): Promise<RateLimitResult> {
        try {
          const result = await ratelimit.limit(identifier);
          return {
            allowed: result.success,
            remaining: result.remaining,
            resetAt: result.reset,
          };
        } catch {
          // Upstash unreachable at check-time — fail open. Blocking real
          // requests because the rate-limiter backend hiccupped is worse
          // than occasionally under-limiting.
          return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs };
        }
      },
    };
  } catch {
    // Missing packages or a construction-time failure — same graceful
    // degradation as missing credentials above, rather than taking down
    // whatever endpoint is trying to rate-limit.
    return createMemoryRateLimiter(maxRequests, windowMs);
  }
}
