#!/usr/bin/env node
/**
 * Dare a fixed list of public repos. Does NOT post anywhere.
 * Prints ready-to-copy Cards + locked tweets.
 *
 *   node scripts/seed-cards.mjs --host https://shiprank-web-cqm7.vercel.app --secret "$CRON_SECRET"
 *   node scripts/seed-cards.mjs --limit 1
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fetchJson,
  flagValue,
  lockedTweet,
  pollDare,
  resolveHost,
  resolveSecret,
  seedHeaders,
} from "./host.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPOS = JSON.parse(readFileSync(join(ROOT, "seed-repos.json"), "utf8"));

async function main() {
  const argv = process.argv.slice(2);
  const origin = resolveHost(argv);
  const secret = resolveSecret(argv);
  const limitRaw = flagValue(argv, "--limit");
  const limit = limitRaw ? Math.max(1, Number(limitRaw)) : REPOS.length;
  const list = REPOS.slice(0, limit);

  if (!secret) {
    console.error(
      "Need --secret $CRON_SECRET (or env CRON_SECRET). Without it the host rate-limits at 3 dares/hour and this list will 429.",
    );
    process.exit(1);
  }

  console.log(`ShipRank seed prep  (${list.length} repos)`);
  console.log(`host: ${origin}`);
  console.log("Does not post. Copy the tweets yourself.");
  console.log("");

  const rows = [];

  for (const slug of list) {
    const repoUrl = `https://github.com/${slug}`;
    process.stderr.write(`daring ${slug} … `);
    const { res, data } = await fetchJson(`${origin}/api/dare`, {
      method: "POST",
      headers: seedHeaders(secret),
      body: JSON.stringify({ repoUrl }),
    });
    if (res.status === 429) {
      process.stderr.write("RATE LIMITED\n");
      rows.push({ slug, ok: false, error: "429 rate limit" });
      break;
    }
    if (!res.ok || !data?.jobId) {
      process.stderr.write(`FAIL ${res.status} ${data?.error ?? ""}\n`);
      rows.push({ slug, ok: false, error: data?.error ?? String(res.status) });
      continue;
    }
    const polled = await pollDare(origin, data.jobId, { secret });
    if (!polled.ok) {
      process.stderr.write(`FAIL ${polled.error}\n`);
      rows.push({ slug, ok: false, error: polled.error });
      continue;
    }
    const job = polled.job;
    const name = job.progress?.projectName ?? slug;
    const score = job.progress?.score;
    const grade = job.progress?.grade;
    const scanId = job.scan_id;
    if (scanId == null) {
      process.stderr.write("FAIL no scan_id\n");
      rows.push({ slug, ok: false, error: "complete but scan_id null" });
      continue;
    }
    process.stderr.write(`${grade} (${score})\n`);
    rows.push({
      slug,
      ok: true,
      name,
      score,
      grade,
      scanId,
      cardUrl: `${origin}/s/${scanId}`,
      tweet: lockedTweet({ name, score, grade, origin }),
    });
  }

  console.log("");
  console.log("========== READY TO POST ==========");
  console.log("");
  for (const row of rows) {
    if (!row.ok) {
      console.log(`# ${row.slug}`);
      console.log(`FAILED  ${row.error}`);
      console.log("");
      continue;
    }
    console.log(`# ${row.slug}`);
    console.log(`${row.name}  ${row.grade} (${row.score})`);
    console.log(`Card  ${row.cardUrl}`);
    console.log("Tweet:");
    console.log(row.tweet);
    console.log("");
  }

  const ok = rows.filter((r) => r.ok);
  const bad = rows.filter((r) => !r.ok);
  console.log("========== SUMMARY ==========");
  console.log(`${ok.length} cards  ${bad.length} failed`);
  if (ok.length) {
    console.log("Card URLs:");
    for (const row of ok) console.log(`  ${row.cardUrl}`);
  }
  if (bad.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
