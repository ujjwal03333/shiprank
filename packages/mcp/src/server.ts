import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runFullScan, checkDiff, getRules } from "./scan.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "shiprank",
    version: "0.1.0",
  });

  server.tool(
    "shiprank_scan",
    "Run the full ShipRank scan on a local project directory and return the complete result: overall score, grade, per-station breakdown, fingerprint (detected AI platform/model), remediation plan, and held-out check results. Same shape as the ShipRank CLI's JSON output.",
    { path: z.string().describe("Absolute or relative path to the project root to scan") },
    async ({ path }) => {
      const result = await runFullScan(path);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "shiprank_check_diff",
    "Run the ShipRank check suite on a project and return only the findings whose evidence touches one of the given files. Use this after editing specific files to see which ShipRank findings are relevant to just that change, instead of the full report.",
    {
      path: z.string().describe("Absolute or relative path to the project root to scan"),
      files: z
        .array(z.string())
        .describe("Project-relative file paths to filter findings down to"),
    },
    async ({ path, files }) => {
      const findings = await checkDiff(path, files);
      return {
        content: [{ type: "text", text: JSON.stringify(findings, null, 2) }],
      };
    },
  );

  server.tool(
    "shiprank_get_rules",
    "Generate an AGENTS.md (coding rules) document for a project from its current ShipRank findings. Elevates the project's actual weak spots (failing checks) into concrete rules for an AI coding agent to follow.",
    { path: z.string().describe("Absolute or relative path to the project root to scan") },
    async ({ path }) => {
      const content = await getRules(path);
      return { content: [{ type: "text", text: content }] };
    },
  );

  return server;
}
