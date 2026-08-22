/**
 * Seed / ops bypass for the Dare rate limit.
 * Uses the existing CRON_SECRET. Never a public product path.
 */
export function dareRateLimitBypassed(
  request: Request,
  secret: string | undefined = process.env["CRON_SECRET"],
): boolean {
  if (!secret || secret.length === 0) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const seed = request.headers.get("x-shiprank-seed");
  return seed === secret;
}
