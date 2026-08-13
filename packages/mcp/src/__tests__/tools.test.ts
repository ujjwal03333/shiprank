import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../server";

const FIXTURE = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "fixtures",
  "demo-app",
);

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  const block = result.content[0];
  if (!block || block.type !== "text" || block.text == null) {
    throw new Error("Expected a text content block");
  }
  return block.text;
}

describe("shiprank MCP tools (via real SDK client/server)", () => {
  let client: Client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
  });

  it("lists all three tools", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "shiprank_check_diff",
      "shiprank_get_rules",
      "shiprank_scan",
    ]);
  });

  it("shiprank_scan returns a full scan result for the fixture project", async () => {
    const result = await client.callTool({
      name: "shiprank_scan",
      arguments: { path: FIXTURE },
    });
    const parsed = JSON.parse(textOf(result as never));

    expect(parsed.projectName).toBe("mcp-demo-app");
    expect(parsed.framework).toBe("nextjs");
    expect(typeof parsed.score).toBe("number");
    expect(parsed.score).toBeGreaterThanOrEqual(0);
    expect(parsed.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(parsed.stations)).toBe(true);
    expect(parsed.stations.length).toBeGreaterThan(0);
    expect(typeof parsed.contentHash).toBe("string");
    expect(parsed.contentHash).toHaveLength(64);

    // The fixture's hardcoded OpenAI-style key must be caught by SEC-001.
    const security = parsed.stations.find((s: { station: string }) => s.station === "security");
    const secretCheck = security.checks.find((c: { id: string }) => c.id === "SEC-001");
    expect(secretCheck.passed).toBe(false);
    expect(secretCheck.evidence).toContain("client.ts");
  });

  it("shiprank_check_diff filters findings to only the listed file", async () => {
    const result = await client.callTool({
      name: "shiprank_check_diff",
      arguments: { path: FIXTURE, files: ["src/client.ts"] },
    });
    const findings = JSON.parse(textOf(result as never)) as Array<{
      id: string;
      evidence: string;
      failMessage: string;
    }>;

    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.evidence + f.failMessage).toContain("client.ts");
    }
    expect(findings.some((f) => f.id === "SEC-001")).toBe(true);
  });

  it("shiprank_check_diff returns nothing for a file with no matching findings", async () => {
    const result = await client.callTool({
      name: "shiprank_check_diff",
      arguments: { path: FIXTURE, files: ["src/does-not-exist.ts"] },
    });
    const findings = JSON.parse(textOf(result as never));
    expect(findings).toEqual([]);
  });

  it("shiprank_get_rules returns AGENTS.md content generated from findings", async () => {
    const result = await client.callTool({
      name: "shiprank_get_rules",
      arguments: { path: FIXTURE },
    });
    const content = textOf(result as never);

    expect(content).toContain("mcp-demo-app");
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(50);
  });
});
