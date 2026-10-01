#!/usr/bin/env node
import { parseArgs, type ParsedArgs } from "./args.js";
import { scanProject, getAgentsMd } from "./scanner.js";
import { renderTerminalOutput, renderJsonOutput } from "./formatter.js";
import { uploadResult, cardUrlFromScanId } from "./uploader.js";
import { scanExitCode } from "./exit.js";
import { emitGithubCheck } from "./github-check.js";
import { compile, createMemoryRateLimiter } from "@shiprank/compile";
import { hostname } from "node:os";

const HELP = `
ShipRank — the Ship License for AI-built software

Usage:
  npx shiprank [dir]              Scan a project (defaults to current dir)
  npx shiprank compile "<prompt>" Optimize a build prompt with Claude

Options:
  --json                          Output full report as JSON
  --ci --threshold <n>            Also exit 1 if score < n (default 60)
  --upload                        Upload results and print the Card URL
  --rules                         Print an AGENTS.md / .cursorrules file
  -h, --help                      Show this help message

Exit codes:
  0  Licensed. --help and --rules always exit 0.
  1  Hold (a scored critical failed), --upload could not reach the API,
     or --ci score is below --threshold.

Examples:
  npx shiprank ./my-app
  npx shiprank ./my-app --upload
  npx shiprank ./my-app --ci --threshold 70
  npx shiprank ./my-app --json | less
  npx shiprank ./my-app --rules > .cursorrules
  npx shiprank compile "build a SaaS with Stripe and Supabase"
`.trim();

async function runCompileCommand(prompt: string): Promise<number> {
  const limiter = createMemoryRateLimiter(5);
  const id = hostname();
  const result = await compile(prompt, id, limiter);

  if ("kind" in result) {
    if (result.kind === "rate_limited") {
      const reset = new Date(result.resetAt).toLocaleTimeString();
      process.stderr.write(`Rate limit reached. Resets at ${reset}\n`);
      return 1;
    }
    process.stderr.write(`Error: ${result.message}\n`);
    return 1;
  }

  for (const step of result.steps) {
    if (!result.isSingleStep) {
      process.stdout.write(`\n### Step ${step.index}: ${step.name}\n`);
    }
    if (step.stack) process.stdout.write(`\n## STACK\n${step.stack}\n`);
    if (step.build) process.stdout.write(`\n## BUILD\n${step.build}\n`);
    if (step.constraints) process.stdout.write(`\n## CONSTRAINTS\n${step.constraints}\n`);
    if (step.output) process.stdout.write(`\n## OUTPUT\n${step.output}\n`);
  }
  return 0;
}

async function runScanCommand(args: ParsedArgs): Promise<number> {
  let result;
  try {
    result = await scanProject(args.dir);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error scanning ${args.dir}: ${msg}\n`);
    return 1;
  }

  if (args.rules) {
    process.stdout.write(getAgentsMd(result) + "\n");
    return 0;
  }

  if (args.json) {
    process.stdout.write(renderJsonOutput(result) + "\n");
  } else {
    process.stdout.write(renderTerminalOutput(result) + "\n");
  }

  let uploadFailed = false;
  let cardUrl: string | undefined;
  let failureReason: string | undefined;

  if (args.upload) {
    try {
      const uploaded = await uploadResult(result);
      cardUrl = cardUrlFromScanId(uploaded.scanId);
      process.stderr.write(`Card: ${cardUrl}\n`);
    } catch (err) {
      uploadFailed = true;
      failureReason = err instanceof Error ? err.message : String(err);
      process.stderr.write(`${failureReason}\n`);
    }
  }

  emitGithubCheck({
    license: result.license,
    grade: result.grade,
    score: result.score,
    ...(cardUrl !== undefined ? { cardUrl } : {}),
    ...(failureReason !== undefined ? { failureReason } : {}),
  });

  return scanExitCode({
    license: result.license,
    uploadFailed,
    ci: args.ci,
    score: result.score,
    threshold: args.threshold,
  });
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);

  if (args.help) {
    process.stdout.write(HELP + "\n");
    return 0;
  }

  if (args.command === "compile") {
    if (!args.compilePrompt) {
      process.stderr.write('Usage: npx shiprank compile "<your prompt>"\n');
      return 1;
    }
    return runCompileCommand(args.compilePrompt);
  }

  return runScanCommand(args);
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
