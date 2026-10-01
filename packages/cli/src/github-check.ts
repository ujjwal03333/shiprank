import { appendFileSync } from "node:fs";
import type { License } from "@shiprank/engine";

export interface GithubCheckInput {
  license: License;
  grade: string;
  score: number;
  cardUrl?: string;
  failureReason?: string;
}

export function githubCheckSummary(input: GithubCheckInput): string {
  const lines = ["## Ship License", ""];
  if (input.failureReason) {
    lines.push(input.failureReason);
  } else {
    lines.push(
      `**${input.license}** · Grade **${input.grade}** (${input.score}/100)`,
    );
  }
  if (input.cardUrl) {
    lines.push("", `[Open the Card](${input.cardUrl})`);
  }
  return lines.join("\n");
}

export function githubAnnotation(input: GithubCheckInput): string {
  const body = input.failureReason
    ? input.failureReason
    : `${input.license} · Grade ${input.grade} (${input.score}/100)` +
      (input.cardUrl ? ` · ${input.cardUrl}` : "");
  const kind = input.license === "Hold" || input.failureReason ? "error" : "notice";
  return `::${kind} title=Ship License::${body}`;
}

/** When running in GitHub Actions, annotate the Check named Ship License. */
export function emitGithubCheck(input: GithubCheckInput): void {
  if (process.env["GITHUB_ACTIONS"] !== "true") return;
  process.stdout.write(githubAnnotation(input) + "\n");
  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (!summaryPath) return;
  appendFileSync(summaryPath, githubCheckSummary(input) + "\n");
}
