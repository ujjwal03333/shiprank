import { describe, it, expect } from "vitest";
import { renderRegressionEmail } from "../regression-email";

describe("renderRegressionEmail", () => {
  const rendered = renderRegressionEmail({
    projectName: "SaaSly Landing Page",
    previousScore: 74,
    newScore: 67,
    newFindings: ["Hardcoded secret in src/client.ts", "RLS disabled on users table"],
    scanUrl: "https://shiprank.dev/scan/aaaa1111",
  });

  it("subject shows the project name and the new score", () => {
    expect(rendered.subject).toBe(
      "ShipRank: SaaSly Landing Page score dropped to 67 (was 74)",
    );
  });

  it("html shows old score -> new score", () => {
    expect(rendered.html).toContain(">74<");
    expect(rendered.html).toContain(">67<");
  });

  it("html lists every new finding", () => {
    expect(rendered.html).toContain("Hardcoded secret in src/client.ts");
    expect(rendered.html).toContain("RLS disabled on users table");
  });

  it("html links to the full scan page", () => {
    expect(rendered.html).toContain('href="https://shiprank.dev/scan/aaaa1111"');
    expect(rendered.html).toContain("View full scan");
  });

  it("escapes HTML in the project name and finding titles", () => {
    const withHtml = renderRegressionEmail({
      projectName: "<script>alert(1)</script>",
      previousScore: 90,
      newScore: 80,
      newFindings: ["<b>bold</b> finding"],
      scanUrl: "https://shiprank.dev/scan/x",
    });
    expect(withHtml.html).not.toContain("<script>alert(1)</script>");
    expect(withHtml.html).toContain("&lt;script&gt;");
    expect(withHtml.html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("plain-text fallback carries the same core facts", () => {
    expect(rendered.text).toContain("SaaSly Landing Page");
    expect(rendered.text).toContain("74 -> 67");
    expect(rendered.text).toContain("Hardcoded secret in src/client.ts");
    expect(rendered.text).toContain("https://shiprank.dev/scan/aaaa1111");
  });

  it("omits the findings section entirely when there are none", () => {
    const noFindings = renderRegressionEmail({
      projectName: "Quiet Project",
      previousScore: 80,
      newScore: 72,
      newFindings: [],
      scanUrl: "https://shiprank.dev/scan/y",
    });
    expect(noFindings.html).not.toContain("New findings");
  });
});
