import { describe, it, expect } from "vitest";
import { dareRateLimitBypassed } from "../seed-guard";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/dare", { headers });
}

describe("dareRateLimitBypassed", () => {
  it("is false without a secret", () => {
    expect(dareRateLimitBypassed(req({ authorization: "Bearer x" }), undefined)).toBe(
      false,
    );
    expect(dareRateLimitBypassed(req({ authorization: "Bearer x" }), "")).toBe(false);
  });

  it("accepts Bearer CRON_SECRET", () => {
    expect(
      dareRateLimitBypassed(req({ authorization: "Bearer s3cret" }), "s3cret"),
    ).toBe(true);
  });

  it("accepts x-shiprank-seed", () => {
    expect(
      dareRateLimitBypassed(req({ "x-shiprank-seed": "s3cret" }), "s3cret"),
    ).toBe(true);
  });

  it("rejects a mismatched secret", () => {
    expect(
      dareRateLimitBypassed(req({ authorization: "Bearer nope" }), "s3cret"),
    ).toBe(false);
  });
});

describe("seed-repos.json", () => {
  const repos = JSON.parse(
    readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../../../scripts/seed-repos.json"),
      "utf8",
    ),
  ) as string[];

  it("lists exactly 10 public repos", () => {
    expect(repos).toHaveLength(10);
  });

  it("starts with octocat/Hello-World", () => {
    expect(repos[0]).toBe("octocat/Hello-World");
  });

  it("uses owner/repo slugs", () => {
    for (const slug of repos) {
      expect(slug).toMatch(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    }
  });
});
