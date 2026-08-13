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

export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
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
