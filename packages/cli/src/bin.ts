#!/usr/bin/env node
import { parseArgs } from "./args.js";
import { scanProject, getAgentsMd } from "./scanner.js";
import { renderTerminalOutput, renderJsonOutput } from "./formatter.js";
import { uploadResult } from "./uploader.js";
import { compile, createMemoryRateLimiter } from "@shiprank/compile";
import { hostname } from "node:os";

async function main(): Promise<number> {
  const args = parseArgs(process.argv);

  if (args.command === "compile") {
    if (!args.compilePrompt) {
      process.stderr.write('Usage: npx shiprank compile "<your prompt>"\n');
      return 1;
    }

    const limiter = createMemoryRateLimiter(5);
    const id = hostname();
    const result = await compile(args.compilePrompt, id, limiter);

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

  // scan command
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

  if (args.upload) {
    try {
      await uploadResult(result);
      process.stderr.write("Uploaded to shiprank.dev\n");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Upload failed: ${msg}\n`);
    }
  }

  if (args.ci && result.score < args.threshold) {
    return 1;
  }

  return 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exit(1);
});
