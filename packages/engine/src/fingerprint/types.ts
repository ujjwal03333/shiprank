export type Platform =
  | "cursor"
  | "bolt"
  | "lovable"
  | "replit"
  | "v0"
  | "base44"
  | "claude-code"
  | "unknown";

export interface PlatformDetection {
  platform: Platform;
  confidence: number; // 0-100
  signals: string[];
}

export interface ModelInference {
  model: string | null; // null when platform is unknown
  confidence: number;   // 0-100, 0 when unknown
  reasoning: string;
}

export interface AiRatio {
  likelyAiCommits: number;
  likelyHumanCommits: number;
  totalAnalyzed: number;
  aiRatio: number; // 0.0–1.0
}

export interface Fingerprint {
  platform: PlatformDetection;
  model: ModelInference;
  aiRatio: AiRatio | null; // null when no git history — never fabricated
}
