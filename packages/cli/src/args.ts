export interface ParsedArgs {
  command: "scan" | "compile";
  dir: string;
  json: boolean;
  ci: boolean;
  threshold: number;
  upload: boolean;
  rules: boolean;
  compilePrompt: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const result: ParsedArgs = {
    command: "scan",
    dir: ".",
    json: false,
    ci: false,
    threshold: 60,
    upload: false,
    rules: false,
    compilePrompt: "",
  };

  if (args[0] === "compile") {
    result.command = "compile";
    result.compilePrompt = args[1] ?? "";
    return result;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--json") {
      result.json = true;
    } else if (arg === "--ci") {
      result.ci = true;
    } else if (arg === "--threshold") {
      const next = args[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        result.threshold = parseInt(next, 10);
        i++;
      }
    } else if (arg.startsWith("--threshold=")) {
      result.threshold = parseInt(arg.split("=")[1] ?? "60", 10);
    } else if (arg === "--upload") {
      result.upload = true;
    } else if (arg === "--rules") {
      result.rules = true;
    } else if (!arg.startsWith("--")) {
      result.dir = arg;
    }
  }

  return result;
}
