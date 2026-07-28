import { describe, it, expect, vi, afterEach } from "vitest";
import { createMemoryRateLimiter } from "../rate-limiter";

describe("createMemoryRateLimiter()", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first 5 requests", async () => {
    const limiter = createMemoryRateLimiter(5);

    for (let i = 0; i < 5; i++) {
      const r = await limiter.check("user-a");
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(4 - i);
    }
  });

  it("blocks the 6th request", async () => {
    const limiter = createMemoryRateLimiter(5);

    for (let i = 0; i < 5; i++) {
      await limiter.check("user-b");
    }

    const r = await limiter.check("user-b");
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("isolates identifiers", async () => {
    const limiter = createMemoryRateLimiter(1);

    await limiter.check("alpha");
    const blocked = await limiter.check("alpha");
    expect(blocked.allowed).toBe(false);

    const fresh = await limiter.check("beta");
    expect(fresh.allowed).toBe(true);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const windowMs = 1000;
    const limiter = createMemoryRateLimiter(1, windowMs);

    await limiter.check("user-c");
    const blocked = await limiter.check("user-c");
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);

    const fresh = await limiter.check("user-c");
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(0);
  });
});
