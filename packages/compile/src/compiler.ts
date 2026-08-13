import Anthropic from "@anthropic-ai/sdk";
import { COMPILE_SYSTEM_PROMPT } from "./prompt";
import type { RateLimiter, RateLimitResult } from "./rate-limiter";
import {
  detectStack,
  getApplicableConstraints,
  renderConstraintBlock,
  type StackKey,
  type FocusMode,
} from "./stack";

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
  detectedStack: StackKey[];
  focusMode: FocusMode;
}

export type CompileError =
  | { kind: "rate_limited"; resetAt: number }
  | { kind: "api_error"; message: string };

function extractSection(text: string, header: string): string {
  const re = new RegExp(`## ${header}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const match = re.exec(text);
  return match ? match[1]!.trim() : "";
}

/**
 * Replaces whatever CONSTRAINTS text Claude produced with the stack-aware,
 * focus-mode-aware constraint block: universal constraints plus every
 * constraint applicable to the detected stack, each with a checkId, an
 * inline few-shot code example, and a verification command. Speed mode
 * defers non-critical constraints to a "Phase 2: Harden" section; scale
 * mode adds performance constraints.
 */
function ensureSecurityBaseline(
  constraints: string,
  stackKeys: StackKey[],
  focusMode: FocusMode,
  elevatedConstraints: string[] = [],
): string {
  const selection = getApplicableConstraints(stackKeys, focusMode);
  const dynamicBlock = renderConstraintBlock(selection, focusMode);

  let result = constraints ? `${constraints}\n\n${dynamicBlock}` : dynamicBlock;

  if (elevatedConstraints.length > 0) {
    result = `${result}\n\n${elevatedConstraints.join("\n")}`;
  }

  return result;
}

function parseStep(
  raw: string,
  name: string,
  index: number,
  stackKeys: StackKey[],
  focusMode: FocusMode,
  elevatedConstraints: string[] = [],
): CompiledStep {
  return {
    name,
    index,
    stack: extractSection(raw, "STACK"),
    build: extractSection(raw, "BUILD"),
    constraints: ensureSecurityBaseline(
      extractSection(raw, "CONSTRAINTS"),
      stackKeys,
      focusMode,
      elevatedConstraints,
    ),
    output: extractSection(raw, "OUTPUT"),
    raw,
  };
}

function parseSteps(
  raw: string,
  stackKeys: StackKey[],
  focusMode: FocusMode,
  elevatedConstraints: string[] = [],
): CompiledStep[] {
  const stepPattern = /###\s+Step\s+(\d+):\s+(.+)/gi;
  const matches = [...raw.matchAll(stepPattern)];

  if (matches.length === 0) {
    return [parseStep(raw, "Build", 1, stackKeys, focusMode, elevatedConstraints)];
  }

  return matches.map((match, i) => {
    const nextMatch = matches[i + 1];
    const stepStart = match.index!;
    const stepEnd = nextMatch ? nextMatch.index! : raw.length;
    const stepRaw = raw.slice(stepStart, stepEnd).trim();
    return parseStep(
      stepRaw,
      match[2]!.trim(),
      parseInt(match[1]!, 10),
      stackKeys,
      focusMode,
      elevatedConstraints,
    );
  });
}

export async function compile(
  rawPrompt: string,
  identifier: string,
  rateLimiter: RateLimiter,
  client: Anthropic = new Anthropic(),
  elevatedConstraints: string[] = [],
  detectedStack?: StackKey[],
  focusMode: FocusMode = "security",
): Promise<CompileResult | CompileError> {
  const rateLimit = await rateLimiter.check(identifier);
  if (!rateLimit.allowed) {
    return { kind: "rate_limited", resetAt: rateLimit.resetAt };
  }

  const stackKeys = detectedStack ?? detectStack(rawPrompt);

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

  const steps = parseSteps(raw, stackKeys, focusMode, elevatedConstraints);
  return {
    raw,
    steps,
    isSingleStep: steps.length === 1,
    rateLimit,
    detectedStack: stackKeys,
    focusMode,
  };
}
