import type { Platform, PlatformDetection, ModelInference } from "./types";

// Spec-defined model → confidence mapping.
// Confidence reflects how certain we are about which model was used —
// lower for platforms where users can freely switch models (e.g. Cursor).
const MODEL_MAP: Record<Exclude<Platform, "unknown">, { model: string; confidence: number; reasoning: string }> = {
  lovable: {
    model: "claude-sonnet-4-6",
    confidence: 80,
    reasoning: "Lovable uses Claude Sonnet as its default generation model.",
  },
  bolt: {
    model: "claude-opus-4-8",
    confidence: 75,
    reasoning: "Bolt.new defaults to Claude Opus for its code generation.",
  },
  cursor: {
    model: "claude-opus-4-8",
    confidence: 55,
    reasoning: "Cursor users commonly choose Claude Opus, but model selection is user-controlled — lower confidence.",
  },
  v0: {
    model: "gpt-5.5",
    confidence: 70,
    reasoning: "v0 by Vercel is built on OpenAI's GPT-5.5 model.",
  },
  replit: {
    model: "gpt-4o",
    confidence: 60,
    reasoning: "Replit Agent primarily uses GPT-4o for code generation.",
  },
  "claude-code": {
    model: "claude-opus-4-8",
    confidence: 70,
    reasoning: "Claude Code defaults to claude-opus-4-8 for agentic coding sessions.",
  },
  base44: {
    model: "gemini-3.1-pro",
    confidence: 65,
    reasoning: "Base44 uses Google's Gemini model for app generation.",
  },
};

export function inferModel(detection: PlatformDetection): ModelInference {
  if (detection.platform === "unknown") {
    return { model: null, confidence: 0, reasoning: "Platform unknown — model cannot be inferred." };
  }

  const entry = MODEL_MAP[detection.platform];

  // Scale model confidence by platform detection confidence.
  // If we're 80% sure it's Lovable (80 conf) and Lovable is 80% likely Claude Sonnet,
  // the effective model confidence is 80 * (80/100) = 64. Floor at spec value if
  // detection is high-confidence (>= 80).
  const effectiveConfidence =
    detection.confidence >= 80
      ? entry.confidence
      : Math.round(entry.confidence * (detection.confidence / 100));

  return {
    model: entry.model,
    confidence: effectiveConfidence,
    reasoning: entry.reasoning,
  };
}
