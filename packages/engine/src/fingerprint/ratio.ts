import type { GitCommit } from "../checks/types";
import type { AiRatio } from "./types";

// ── Heuristics ────────────────────────────────────────────────────────────────

// AI-generated commits tend to use perfect conventional-commit format with
// generic, capitalized descriptions. No issue refs, no informality.
const AI_MESSAGE_PATTERNS = [
  /^(feat|fix|chore|refactor|update|add|create|remove|delete|implement|style|docs|perf|ci|build)(\([a-zA-Z-]+\))?!?:\s+[A-Z]/,
  /^Add [A-Z][a-z]+ (component|page|feature|functionality|support|endpoint|route|schema|migration|type|hook|util|helper|service)/,
  /^Update [a-z]+ (to|with|for)\b/i,
  /^Initial commit$/i,
  /^Create [A-Z][a-z]+/,
  /^Implement [A-Z][a-z]+/,
];

// Human commits reference tickets, express opinions, contain informality,
// or describe context AI wouldn't typically add.
const HUMAN_MESSAGE_PATTERNS = [
  /#\d+/,                           // issue/PR reference
  /\b(wip|fixup|squash|sorry|oops|quick fix|minor|temp|tmp|debug|hack)\b/i,
  /Merge (branch|pull request)/i,
  /Revert "/,
  /\b(I |my |we |our )\b/i,        // first-person
  /[.!?]{2,}/,                      // emotional punctuation
  /\b(actually|finally|argh|ugh)\b/i,
];

const LARGE_COMMIT_THRESHOLD = 20; // files changed — AI often touches many files at once
const SMALL_COMMIT_THRESHOLD = 5;  // files changed — human patches tend to be focused

function countFilesChanged(diff: string): number {
  // Each changed file starts a new "diff --git" block
  return (diff.match(/^diff --git /gm) ?? []).length;
}

function classifyCommit(commit: GitCommit): "ai" | "human" | "ambiguous" {
  const msg = commit.message.trim();
  const filesChanged = countFilesChanged(commit.diff);

  let aiScore = 0;
  let humanScore = 0;

  // Message signals
  if (AI_MESSAGE_PATTERNS.some(re => re.test(msg))) aiScore += 2;
  if (HUMAN_MESSAGE_PATTERNS.some(re => re.test(msg))) humanScore += 3; // human signals are more reliable

  // Size signals
  if (filesChanged > LARGE_COMMIT_THRESHOLD) aiScore += 2;  // large batch = AI
  if (filesChanged < SMALL_COMMIT_THRESHOLD && filesChanged > 0) humanScore += 1; // focused = human
  if (filesChanged === 0) aiScore += 1; // no diff info — slight AI lean for conventional message

  if (aiScore > humanScore) return "ai";
  if (humanScore > aiScore) return "human";
  return "ambiguous";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute AI vs human commit ratio from git history.
 * Returns null when gitCommits is null — never fabricates a number.
 * Ambiguous commits are excluded from the ratio numerator/denominator
 * so they don't dilute signal in either direction.
 */
export function computeAiRatio(gitCommits: GitCommit[] | null): AiRatio | null {
  if (gitCommits === null) return null;
  if (gitCommits.length === 0) return null;

  let likelyAi = 0;
  let likelyHuman = 0;

  for (const commit of gitCommits) {
    const cls = classifyCommit(commit);
    if (cls === "ai") likelyAi++;
    else if (cls === "human") likelyHuman++;
    // ambiguous: skip — don't contaminate the ratio
  }

  const total = likelyAi + likelyHuman;
  const aiRatio = total > 0 ? likelyAi / total : 0;

  return {
    likelyAiCommits: likelyAi,
    likelyHumanCommits: likelyHuman,
    totalAnalyzed: gitCommits.length,
    aiRatio: Math.round(aiRatio * 1000) / 1000,
  };
}
