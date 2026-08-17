import type { Platform, PlatformDetection, ModelInference } from "./types";

// Platform-detection confidence at or above this is treated as certain
// enough to use the spec's model confidence as-is, rather than scaling it
// down by the detection confidence.
const HIGH_CONFIDENCE_THRESHOLD = 80;

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

  // Scale model confidence by platform detection confidence, unless
  // detection is already high-confidence (>= HIGH_CONFIDENCE_THRESHOLD) —
  // then use the spec value as-is rather than discounting it further.
  const effectiveConfidence =
    detection.confidence >= HIGH_CONFIDENCE_THRESHOLD
      ? entry.confidence
      : Math.round(entry.confidence * (detection.confidence / 100));

  return {
    model: entry.model,
    confidence: effectiveConfidence,
    reasoning: entry.reasoning,
  };
}
