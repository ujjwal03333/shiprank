import Anthropic from "@anthropic-ai/sdk";
import { COMPILE_SYSTEM_PROMPT } from "./prompt";
import type { RateLimiter, RateLimitResult } from "./rate-limiter";

export interface CompiledStep {
  name: string;
  index: number;
  stack: string;
  build: string;
  constraints: string;
  output: string;
  raw: string;
}

export interface CompileResult {
  raw: string;
  steps: CompiledStep[];
  isSingleStep: boolean;
  rateLimit: RateLimitResult;
}

export type CompileError =
  | { kind: "rate_limited"; resetAt: number }
  | { kind: "api_error"; message: string };

const SECURITY_PHRASES = [
  "rls enabled",
  "server-side environment",
  "server-side session",
  "zod",
  "error boundary",
];

function extractSection(text: string, header: string): string {
  const re = new RegExp(`## ${header}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = re.exec(text);
  return match ? match[1]!.trim() : "";
}

function ensureSecurityBaseline(constraints: string): string {
  const lower = constraints.toLowerCase();
  const allPresent = SECURITY_PHRASES.every((p) => lower.includes(p));
  if (allPresent) return constraints;

  const baseline = [
    "- RLS enabled on every Supabase table; no table is publicly writable",
    "- All secrets in server-side environment variables only; nothing secret in client bundles",
    "- Server-side session validation on every protected route",
    "- Input validated with Zod on every mutation before it touches the database",
    "- Error boundary at app root; individual async boundaries around data-fetching subtrees",
  ].join("\n");

  return constraints ? `${constraints}\n\n${baseline}` : baseline;
}

function parseStep(raw: string, name: string, index: number): CompiledStep {
  return {
    name,
    index,
    stack: extractSection(raw, "STACK"),
    build: extractSection(raw, "BUILD"),
    constraints: ensureSecurityBaseline(extractSection(raw, "CONSTRAINTS")),
    output: extractSection(raw, "OUTPUT"),
    raw,
  };
}

function parseSteps(raw: string): CompiledStep[] {
  const stepPattern = /###\s+Step\s+(\d+):\s+(.+)/gi;
  const matches = [...raw.matchAll(stepPattern)];

  if (matches.length === 0) {
    return [parseStep(raw, "Build", 1)];
  }

  return matches.map((match, i) => {
    const nextMatch = matches[i + 1];
    const stepStart = match.index!;
    const stepEnd = nextMatch ? nextMatch.index! : raw.length;
    const stepRaw = raw.slice(stepStart, stepEnd).trim();
    return parseStep(stepRaw, match[2]!.trim(), parseInt(match[1]!, 10));
  });
}

export async function compile(
  rawPrompt: string,
  identifier: string,
  rateLimiter: RateLimiter,
  client: Anthropic = new Anthropic(),
): Promise<CompileResult | CompileError> {
  const rateLimit = await rateLimiter.check(identifier);
  if (!rateLimit.allowed) {
    return { kind: "rate_limited", resetAt: rateLimit.resetAt };
  }

  let raw: string;
  try {
    const stream = await client.messages.stream({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system: COMPILE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawPrompt }],
    });
    const msg = await stream.finalMessage();
    raw = (msg.content as Anthropic.ContentBlock[])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b: Anthropic.TextBlock) => b.text)
      .join("");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: "api_error", message };
  }

  const steps = parseSteps(raw);
  return {
    raw,
    steps,
    isSingleStep: steps.length === 1,
    rateLimit,
  };
}
