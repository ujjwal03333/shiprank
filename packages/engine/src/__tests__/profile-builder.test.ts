/**
 * Regression tests for buildCodeProfile's file walker — the two bugs found
 * during the 87→98 self-scan push: .gitignore content silently coming back
 * empty (SEC-002), and configFiles collisions silently dropping real config
 * content when a same-named fixture file exists elsewhere in the tree
 * (SEC-005). Real file I/O against temp fixtures, since these are walker
 * behaviors, not pure check-function logic.
 */
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, afterAll } from "vitest";
import { buildCodeProfile } from "../checks/profile";

const ROOT = join(tmpdir(), "shiprank-profile-builder-test");

afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("buildCodeProfile — .gitignore content", () => {
  it("reads .gitignore content (path.extname returns '' for dotfiles with no further extension)", async () => {
    const dir = join(ROOT, "gitignore-case");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
    writeFileSync(join(dir, ".gitignore"), "node_modules\n.env\n.env.local\n");

    const profile = await buildCodeProfile(dir);
    const gitignore = profile.files.find((f) => f.path === ".gitignore");

    expect(gitignore).toBeDefined();
    expect(gitignore?.content).toContain(".env");
  });
});

describe("buildCodeProfile — configFiles collision", () => {
  it("concatenates same-basename config files instead of the last one silently winning", async () => {
    const dir = join(ROOT, "config-collision-case");
    mkdirSync(join(dir, "apps", "web"), { recursive: true });
    mkdirSync(join(dir, "packages", "fixtures", "demo-app"), { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));

    // A real, populated config...
    writeFileSync(
      join(dir, "apps", "web", "next.config.ts"),
      'const headers = [{ key: "Content-Security-Policy", value: "default-src self" }];\nexport default { headers: async () => [{ source: "/(.*)", headers }] };\n',
    );
    // ...and an unrelated stub sharing the same basename elsewhere in the tree.
    writeFileSync(join(dir, "packages", "fixtures", "demo-app", "next.config.ts"), "export default {};\n");

    const profile = await buildCodeProfile(dir);

    expect(profile.configFiles["next.config.ts"]).toContain("Content-Security-Policy");
  });
});
