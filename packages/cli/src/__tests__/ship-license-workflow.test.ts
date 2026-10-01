import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("Ship License example workflow", () => {
  const yml = readFileSync(
    join(root, ".github/workflows/ship-license.example.yml"),
    "utf8",
  );
  const onBlock = yml.slice(yml.indexOf("\non:"), yml.indexOf("\njobs:"));

  it("does not trigger on this repo", () => {
    expect(onBlock).toContain("workflow_dispatch");
    expect(onBlock).not.toMatch(/pull_request|push|schedule|workflow_call/);
    expect(yml).toContain("github.repository != 'ujjwal03333/shiprank'");
  });

  it("names the check Ship License and runs the CLI", () => {
    expect(yml).toContain("name: Ship License");
    expect(yml).toContain("actions/checkout@v7");
    expect(yml).toContain("npx --yes shiprank");
    expect(yml).toContain("node packages/cli/dist/bin.js");
    expect(yml).toContain('printf \'\\n[Open the Card](%s)\\n\' "$url" >> "$GITHUB_STEP_SUMMARY"');
    expect(yml).toContain('exit "$code"');
  });

  it("does not mention shiprank.dev or Stripe", () => {
    expect(yml).not.toContain("shiprank.dev");
    expect(yml.toLowerCase()).not.toContain("stripe");
  });
});

describe("README Ship License paste", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  const fence = readme.match(/```yaml\n([\s\S]*?)```/);

  it("is 12 lines a stranger can paste", () => {
    expect(fence).not.toBeNull();
    const lines = fence?.[1]?.replace(/\n$/, "").split("\n") ?? [];
    expect(lines).toHaveLength(12);
    expect(lines.join("\n")).toBe(
      [
        "name: Ship License",
        "on:",
        "  pull_request:",
        "  push:",
        "jobs:",
        "  ship-license:",
        "    name: Ship License",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v7",
        "      - name: Ship License",
        "        run: npx --yes shiprank",
      ].join("\n"),
    );
  });

  it("names the host we control", () => {
    expect(readme).toContain("https://shiprank-web-cqm7.vercel.app");
    expect(readme).not.toContain("shiprank.dev");
  });
});
