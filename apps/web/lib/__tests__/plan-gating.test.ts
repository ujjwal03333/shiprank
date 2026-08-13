import { describe, it, expect } from "vitest";
import { gateFindingsForPlan, type FindingRow } from "../plan-gating";

const failing: FindingRow = {
  id: "cr-1",
  checkId: "SEC-001",
  title: "No hardcoded secrets in source code",
  severity: "critical",
  passed: false,
  filePath: "src/client.ts",
  lineNumber: 2,
  snippet: 'const KEY = "sk-...";',
  fixSuggestion: "Move all secrets to environment variables.",
  docsUrl: "https://shiprank.dev/docs/sec-001",
};

const passing: FindingRow = {
  id: "cr-2",
  checkId: "SEC-002",
  title: ".env files excluded from git",
  severity: "medium",
  passed: true,
  filePath: null,
  lineNumber: null,
  snippet: null,
  fixSuggestion: null,
  docsUrl: null,
};

describe("gateFindingsForPlan", () => {
  it("free tier keeps title, severity, and pass/fail but redacts fix content", () => {
    const [gated] = gateFindingsForPlan([failing], "free");
    expect(gated).toMatchObject({
      id: "cr-1",
      title: "No hardcoded secrets in source code",
      severity: "critical",
      passed: false,
      filePath: null,
      lineNumber: null,
      snippet: null,
      fixSuggestion: null,
      docsUrl: null,
      upgradeRequired: true,
    });
  });

  it("free tier does not flag upgrade_required on findings with nothing to redact", () => {
    const [gated] = gateFindingsForPlan([passing], "free");
    expect(gated!.upgradeRequired).toBe(false);
  });

  it("pro tier sees every field, unredacted", () => {
    const [gated] = gateFindingsForPlan([failing], "pro");
    expect(gated).toEqual({ ...failing, upgradeRequired: false });
  });

  it("monitor tier sees every field, unredacted", () => {
    const [gated] = gateFindingsForPlan([failing], "monitor");
    expect(gated).toEqual({ ...failing, upgradeRequired: false });
  });

  it("redacts every finding independently across a mixed batch", () => {
    const gated = gateFindingsForPlan([failing, passing], "free");
    expect(gated[0]!.upgradeRequired).toBe(true);
    expect(gated[1]!.upgradeRequired).toBe(false);
    expect(gated.every((g) => g.fixSuggestion === null)).toBe(true);
  });
});
