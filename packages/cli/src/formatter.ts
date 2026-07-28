import type { StationScore } from "@shiprank/engine";
import type { Fingerprint } from "@shiprank/engine";
import type { ScanResult } from "./scanner.js";
import { scoreToGrade } from "@shiprank/database";

export { scoreToGrade as gradeFromScore };

const VERSION = "1.0.0";
const SUITE_VERSION = "1.0.0";
const LINE = "─".repeat(46);

function stationStatus(station: StationScore): string {
  const active = station.checks.filter((c) => c.confidence > 0);
  const criticals = active.filter((c) => !c.passed && c.severity === "critical");
  const warnings = active.filter((c) => !c.passed && c.severity === "warning");

  if (criticals.length > 0) return `⚠ ${criticals.length} critical`;
  if (station.score < 50) return `✗ ${active.filter((c) => !c.passed).length} failing`;
  if (warnings.length > 0) return `✓ ${warnings.length} warnings`;
  return "✓ ok";
}

function pad(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - s.length));
}

function formatFingerprintLine(fp: Fingerprint): string {
  const { platform, model, aiRatio } = fp;
  const platformStr =
    platform.platform === "unknown"
      ? "Unknown tool"
      : `${cap(platform.platform)} (${platform.confidence}%)`;
  const modelStr = model.model ?? "unknown model";
  const aiStr =
    aiRatio != null ? ` · ${Math.round(aiRatio.aiRatio * 100)}% AI-written` : "";
  return `Detected: ${platformStr} → ${modelStr}${aiStr}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function renderTerminalOutput(result: ScanResult): string {
  const lines: string[] = [];
  const { score, grade, stations, fingerprint, remediation } = result;

  lines.push(`ShipRank v${VERSION} · check suite v${SUITE_VERSION}`);
  lines.push("");
  lines.push(
    `Project: ${result.projectName} · ${result.fileCount} files · ${result.lineCount.toLocaleString()} lines · ${result.depCount} deps`,
  );
  lines.push(formatFingerprintLine(fingerprint));
  lines.push(`Framework: ${cap(result.framework)}`);
  lines.push("");
  lines.push(LINE);
  lines.push(`ShipScore   ${score} / 100   Grade ${grade}`);
  lines.push(LINE);

  for (const station of stations) {
    if (station.implemented === 0) continue;
    const name = pad(station.name, 14);
    const scoreStr = pad(String(station.score), 5);
    const status = stationStatus(station);
    lines.push(`${name} ${scoreStr}  ${status}`);
  }

  lines.push(LINE);
  lines.push("");

  const top3 = remediation.top3;
  if (top3.length > 0) {
    const totalGain = Math.round(top3.reduce((s, i) => s + i.scoreGain, 0));
    lines.push(`Fix these ${top3.length} for +${totalGain} points:`);
    top3.forEach((item, idx) => {
      const title = pad(item.title, 36);
      const gain = pad(`+${Math.round(item.scoreGain)}`, 4);
      const time = pad(item.effortMinutes < 60
        ? `${item.effortMinutes} min`
        : `${Math.round(item.effortMinutes / 60)} hr`, 8);
      lines.push(`${idx + 1}. ${title} ${gain} ${time} [${item.checkId}]`);
    });
    lines.push("");
  }

  lines.push("Full report: npx shiprank --json | less");
  lines.push("Rules file:  npx shiprank --rules > .cursorrules");

  return lines.join("\n");
}

export function renderJsonOutput(result: ScanResult): string {
  // Omit profile.files content — it duplicates source code, can be huge
  const { profile: _profile, ...rest } = result;
  return JSON.stringify(rest, null, 2);
}

export { VERSION, SUITE_VERSION };
