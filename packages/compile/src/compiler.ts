import Anthropic from "@anthropic-ai/sdk";
import { COMPILE_SYSTEM_PROMPT } from "./prompt";
import type { RateLimiter, RateLimitResult } from "./rate-limiter";
import {
  detectStack,
  getApplicableConstraints,
  renderConstraintBlock,
  STACK_DEFS,
  type StackKey,
  type FocusMode,
} from "./stack";
import { scorePrompt } from "./prompt-score";

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

function stackLabels(stackKeys: StackKey[]): string {
  if (stackKeys.length === 0) {
    return "Not specified in the prompt. Infer a conventional stack and state it.";
  }
  return stackKeys
    .map((key) => STACK_DEFS.find((d) => d.key === key)?.label ?? key)
    .join(", ");
}

/** Local brief when every provider call fails. Constraints are injected by parseSteps. */
export function deterministicBrief(
  prompt: string,
  stackKeys: StackKey[],
  focusMode: FocusMode,
): string {
  const score = scorePrompt(prompt, stackKeys);
  return [
    "## STACK",
    stackLabels(stackKeys),
    "",
    "## BUILD",
    prompt.trim(),
    `Local prompt score: ${score.total}/100 (stack ${score.stackClarity}, security ${score.securityCoverage}, completeness ${score.completeness}, structure ${score.structure}, testability ${score.testability}).`,
    `Focus: ${focusMode}. Do not invent APIs or providers that were not named.`,
    "",
    "## CONSTRAINTS",
    "",
    "## OUTPUT",
    "The app matches the prompt. Named auth, data, and integrations work. Constraints below pass a ShipRank scan.",
  ].join("\n");
}

async function tryOpenRouter(prompt: string): Promise<string> {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [
        { role: "system", content: COMPILE_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 8192,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`openrouter ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("openrouter empty");
  return text;
}

async function tryAnthropic(client: Anthropic, prompt: string): Promise<string> {
  const stream = await client.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 8192,
    system: COMPILE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const msg = await stream.finalMessage();
  const raw = (msg.content as Anthropic.ContentBlock[])
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b: Anthropic.TextBlock) => b.text)
    .join("");
  if (!raw.trim()) throw new Error("anthropic empty");
  return raw;
}

export async function compile(
  rawPrompt: string,
  identifier: string,
  rateLimiter: RateLimiter,
  client?: Anthropic,
  elevatedConstraints: string[] = [],
  detectedStack?: StackKey[],
  focusMode: FocusMode = "security",
): Promise<CompileResult | CompileError> {
  const rateLimit = await rateLimiter.check(identifier);
  if (!rateLimit.allowed) {
    return { kind: "rate_limited", resetAt: rateLimit.resetAt };
  }

  const stackKeys = detectedStack ?? detectStack(rawPrompt);

  let raw: string | null = null;
  // Injected client (tests) skips OpenRouter so mocks stay in control.
  if (!client && process.env["OPENROUTER_API_KEY"]) {
    try {
      raw = await tryOpenRouter(rawPrompt);
    } catch {
      raw = null;
    }
  }
  if (raw == null) {
    const anthropic =
      client ??
      (process.env["ANTHROPIC_API_KEY"] ? new Anthropic() : undefined);
    if (anthropic) {
      try {
        raw = await tryAnthropic(anthropic, rawPrompt);
      } catch {
        raw = null;
      }
    }
  }
  if (raw == null) {
    raw = deterministicBrief(rawPrompt, stackKeys, focusMode);
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
