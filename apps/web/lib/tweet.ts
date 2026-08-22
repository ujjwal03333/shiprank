import { dareUrl, safePublicOrigin } from "./public-url";

/**
 * Locked tweet for every Card. Do not "improve" this copy.
 *
 *   {name} is a {grade} ({score}).
 *   I dare you to beat it.
 *   {origin}/dare
 */
export function lockedTweet(input: {
  name: string;
  score: number;
  grade: string;
  origin?: string;
}): string {
  const origin = safePublicOrigin(input.origin);
  return `${input.name} is a ${input.grade} (${input.score}).\nI dare you to beat it.\n${dareUrl(origin)}`;
}

export function tweetIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}
