import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cardUrlFromScanId,
  describeUploadFailure,
} from "../uploader.js";
import {
  emitGithubCheck,
  githubAnnotation,
  githubCheckSummary,
} from "../github-check.js";

const API = "https://shiprank-web-cqm7.vercel.app/api/scan";

describe("cardUrlFromScanId()", () => {
  it("strips /api/scan and points at /s/:id", () => {
    expect(cardUrlFromScanId("abc-123", API)).toBe(
      "https://shiprank-web-cqm7.vercel.app/s/abc-123",
    );
  });

  it("accepts a trailing slash and encodes the id", () => {
    expect(cardUrlFromScanId("a/b", "https://example.com/api/scan/")).toBe(
      "https://example.com/s/a%2Fb",
    );
  });
});

describe("describeUploadFailure()", () => {
  it("names a timeout", () => {
    const err = new Error("The operation was aborted due to timeout");
    err.name = "TimeoutError";
    expect(describeUploadFailure(err, API)).toContain("timed out");
    expect(describeUploadFailure(err, API)).toContain("did not get a Card");
  });

  it("names a network failure", () => {
    const msg = describeUploadFailure(new TypeError("fetch failed"), API);
    expect(msg).toContain("Cannot reach the ShipRank API");
    expect(msg).toContain("fetch failed");
  });

  it("keeps an already-specific Card failure", () => {
    const raw = "ShipRank API at https://x did not return a scan id (200). The Ship License Check did not get a Card.";
    expect(describeUploadFailure(new Error(raw), API)).toBe(raw);
  });
});

describe("GitHub Check", () => {
  it("annotates Hold as an error", () => {
    expect(githubAnnotation({ license: "Hold", grade: "C", score: 67 })).toBe(
      "::error title=Ship License::Hold · Grade C (67/100)",
    );
  });

  it("annotates Licensed as a notice and includes the Card", () => {
    expect(
      githubAnnotation({
        license: "Licensed",
        grade: "A",
        score: 90,
        cardUrl: "https://shiprank-web-cqm7.vercel.app/s/abc",
      }),
    ).toBe(
      "::notice title=Ship License::Licensed · Grade A (90/100) · https://shiprank-web-cqm7.vercel.app/s/abc",
    );
  });

  it("summarizes a failure reason and the Card link", () => {
    const summary = githubCheckSummary({
      license: "Licensed",
      grade: "A",
      score: 90,
      failureReason: "Cannot reach the ShipRank API.",
      cardUrl: "https://shiprank-web-cqm7.vercel.app/s/abc",
    });
    expect(summary).toContain("## Ship License");
    expect(summary).toContain("Cannot reach the ShipRank API.");
    expect(summary).toContain("[Open the Card](https://shiprank-web-cqm7.vercel.app/s/abc)");
  });

  const prevActions = process.env["GITHUB_ACTIONS"];
  const prevSummary = process.env["GITHUB_STEP_SUMMARY"];

  afterEach(() => {
    if (prevActions === undefined) delete process.env["GITHUB_ACTIONS"];
    else process.env["GITHUB_ACTIONS"] = prevActions;
    if (prevSummary === undefined) delete process.env["GITHUB_STEP_SUMMARY"];
    else process.env["GITHUB_STEP_SUMMARY"] = prevSummary;
    vi.restoreAllMocks();
  });

  it("writes the annotation and step summary only in GitHub Actions", () => {
    const dir = mkdtempSync(join(tmpdir(), "shiprank-check-"));
    const summary = join(dir, "summary.md");
    process.env["GITHUB_ACTIONS"] = "true";
    process.env["GITHUB_STEP_SUMMARY"] = summary;
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    try {
      emitGithubCheck({ license: "Licensed", grade: "A", score: 91 });
      expect(write).toHaveBeenCalled();
      const written = write.mock.calls.map((c) => String(c[0])).join("");
      expect(written).toContain("::notice title=Ship License::Licensed · Grade A (91/100)");
      expect(readFileSync(summary, "utf8")).toContain("**Licensed** · Grade **A** (91/100)");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does nothing outside GitHub Actions", () => {
    delete process.env["GITHUB_ACTIONS"];
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    emitGithubCheck({ license: "Hold", grade: "F", score: 10 });
    expect(write).not.toHaveBeenCalled();
  });
});
