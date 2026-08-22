const PLATFORM_NAMES: Record<string, string> = {
  cursor: "Cursor",
  lovable: "Lovable",
  bolt: "Bolt",
  v0: "V0",
  windsurf: "Windsurf",
  replit: "Replit",
  copilot: "GitHub Copilot",
  "github-copilot": "GitHub Copilot",
  claude: "Claude",
  "claude-code": "Claude Code",
  base44: "Base44",
  chatgpt: "ChatGPT",
  aider: "Aider",
  cline: "Cline",
  devin: "Devin",
  unknown: "Unknown",
};

export function formatPlatformName(raw: string | null | undefined): string {
  if (!raw) return "Not detected";
  const lower = raw.toLowerCase();
  if (PLATFORM_NAMES[lower]) return PLATFORM_NAMES[lower]!;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Card chip only — hide unknown / empty so the face stays clean. */
export function visiblePlatform(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if (!lower || lower === "unknown" || lower === "not detected") return null;
  const named = formatPlatformName(raw);
  if (named === "Unknown" || named === "Not detected") return null;
  return named;
}

export function formatModelName(raw: string | null | undefined): string {
  if (!raw) return "Not detected";
  return raw
    .replace(/^claude-/i, "Claude ")
    .replace(/^gpt-/i, "GPT-")
    .replace(/^gemini-/i, "Gemini ")
    .replace(/-/g, " ")
    .replace(/(\d)\.(\d)/g, "$1.$2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Gpt/g, "GPT");
}

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < SECONDS_PER_MINUTE) return "just now";
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `${minutes}m ago`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
