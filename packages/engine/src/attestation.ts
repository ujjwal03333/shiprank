import { createHash } from "node:crypto";

export interface HashableFile {
  path: string;
  content: string;
}

/**
 * Deterministic SHA-256 over a scanned file tree.
 *
 * Guarantees: identical trees ALWAYS produce identical hashes, regardless of
 * the order files were discovered in.
 *
 *   1. sort files by path (stable, byte-wise ascending)
 *   2. per-file digest = sha256(path + NUL + content)  — NUL separates the
 *      path from the content so ("ab","c") and ("a","bc") can never collide
 *   3. content_hash    = sha256(concatenation of the per-file hex digests,
 *      in sorted order)
 *
 * The content used is whatever the profiler captured for each file (paths are
 * project-root-relative), so the hash is stable across machines as long as the
 * tree is identical.
 */
export function computeContentHash(files: HashableFile[]): string {
  const sorted = [...files].sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );

  const perFile = sorted.map((f) =>
    createHash("sha256")
      .update(f.path)
      .update("\0")
      .update(f.content)
      .digest("hex"),
  );

  return createHash("sha256").update(perFile.join("")).digest("hex");
}
