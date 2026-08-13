import { NextResponse } from "next/server";
import { z } from "zod";
import { compile, createMemoryRateLimiter } from "@shiprank/compile";
import { checkRateLimit, ipFromRequest, rateLimitHeaders } from "@/lib/rate-limit";

const CompileSchema = z.object({
  prompt: z.string().min(10).max(2000),
  focusMode: z.enum(["security", "speed", "scale"]).default("security"),
});

// In-memory compile rate limiter (5/day per identifier).
// Production: createUpstashRateLimiter() when UPSTASH env vars are set.
const compileLimiter = createMemoryRateLimiter(5, 24 * 60 * 60 * 1000);

export async function HEAD() {
  const hasKey = !!process.env["ANTHROPIC_API_KEY"];
  return new Response(null, { status: hasKey ? 200 : 503 });
}

export async function POST(request: Request) {
  const ip = ipFromRequest(request);

  // Route-level rate limit (30/hr) as a coarse guard before the 5/day compile limit
  const coarse = await checkRateLimit(`compile-route:${ip}`, 30, 3600);
  if (!coarse.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", resetAt: coarse.resetAt },
      { status: 429, headers: rateLimitHeaders(coarse) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CompileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const result = await compile(
    parsed.data.prompt,
    ip,
    compileLimiter,
    undefined,
    [],
    undefined,
    parsed.data.focusMode,
  );

  if ("kind" in result) {
    if (result.kind === "rate_limited") {
      return NextResponse.json(
        { error: "Daily compile limit reached", resetAt: result.resetAt },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Compile temporarily unavailable. Please try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    raw: result.raw,
    isSingleStep: result.isSingleStep,
    steps: result.steps.map((s) => ({
      name: s.name,
      index: s.index,
      stack: s.stack,
      build: s.build,
      constraints: s.constraints,
      output: s.output,
    })),
    rateLimit: result.rateLimit,
    detectedStack: result.detectedStack,
    focusMode: result.focusMode,
  });
}
