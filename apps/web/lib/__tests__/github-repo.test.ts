import { describe, it, expect } from "vitest";
import { parseGithubRepoUrl } from "../github-repo";

describe("parseGithubRepoUrl", () => {
  it("parses a bare github.com/user/repo", () => {
    expect(parseGithubRepoUrl("github.com/ujjwal03333/shiprank")).toEqual({
      owner: "ujjwal03333",
      repo: "shiprank",
      url: "https://github.com/ujjwal03333/shiprank",
    });
  });

  it("parses https URLs and strips .git / extra path", () => {
    expect(parseGithubRepoUrl("https://github.com/foo/bar.git")).toMatchObject({
      owner: "foo",
      repo: "bar",
    });
    expect(parseGithubRepoUrl("https://github.com/foo/bar/tree/main")).toMatchObject({
      owner: "foo",
      repo: "bar",
    });
  });

  it("rejects non-GitHub strings", () => {
    expect(parseGithubRepoUrl("https://gitlab.com/foo/bar")).toBeNull();
    expect(parseGithubRepoUrl("not a url")).toBeNull();
    expect(parseGithubRepoUrl("")).toBeNull();
  });
});
