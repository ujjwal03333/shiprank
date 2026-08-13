// Intentionally insecure fixture: hardcoded secret for shiprank_check_diff to find.
export const OPENAI_KEY = "sk-fixture0123456789abcdefFIXTUREKEY0000";

export function callModel(prompt: string): string {
  return `${OPENAI_KEY}:${prompt}`;
}
