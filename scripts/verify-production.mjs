#!/usr/bin/env node
/**
 * Post-deploy check: origin, one Dare, /s Card chrome, OG === /api/card PNG.
 *
 *   node scripts/verify-production.mjs --host https://shiprank-web-cqm7.vercel.app
 *   node scripts/verify-production.mjs --host http://localhost:3000 --secret "$CRON_SECRET"
 */
import {
  CONTROLLED_HOST,
  fetchJson,
  hasFlag,
  isForeignShiprankHost,
  lockedTweet,
  pngSize,
  pollDare,
  resolveHost,
  resolveSecret,
  seedHeaders,
} from "./host.mjs";

const FAIL = [];
const WARN = [];
const PASS = [];

function pass(msg) {
  PASS.push(msg);
  console.log(`  ok  ${msg}`);
}
function warn(msg) {
  WARN.push(msg);
  console.log(`  warn  ${msg}`);
}
function fail(msg) {
  FAIL.push(msg);
  console.log(`  FAIL  ${msg}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const origin = resolveHost(argv);
  const secret = resolveSecret(argv);
  const skipDare = hasFlag(argv, "--skip-dare");

  console.log(`ShipRank production verify`);
  console.log(`host: ${origin}`);
  if (isForeignShiprankHost(origin)) {
    fail("Host is shiprank.dev — that is a different product. Stop.");
    return exit();
  }

  const { res: healthRes, data: health } = await fetchJson(`${origin}/api/health`);
  if (!healthRes.ok || !health?.ok) {
    fail(`/api/health returned ${healthRes.status}. Is this host deployed?`);
    return exit();
  }
  pass(`/api/health ok (supabase=${health.supabase === true})`);

  if (typeof health.origin !== "string") {
    warn(
      "Health payload has no origin field — this host is not running the current commit yet. Deploy, then re-run.",
    );
  } else if (health.rawIsForeign || isForeignShiprankHost(health.origin)) {
    fail(
      `NEXT_PUBLIC_APP_URL resolves to a shiprank.dev host (raw=${health.rawAppUrl}, origin=${health.origin})`,
    );
  } else if (health.originSafe === false) {
    fail(`originSafe is false (raw=${health.rawAppUrl}, origin=${health.origin})`);
  } else {
    pass(`origin is safe: ${health.origin}`);
  }

  if (health.origin != null && !health.rawAppUrl) {
    warn(
      `NEXT_PUBLIC_APP_URL is unset; falling back to ${health.controlledHost ?? CONTROLLED_HOST}`,
    );
  }

  const originHost = new URL(origin).host;
  const configuredHost = health.origin ? new URL(health.origin).host : "";
  if (configuredHost && originHost !== configuredHost) {
    warn(
      `You hit ${originHost} but the app will print ${configuredHost} on Cards/tweets`,
    );
  }

  if (health.supabase !== true) {
    fail("Supabase is not configured on this host. Dare cannot persist a Card.");
  }

  if (skipDare) {
    warn("Skipped Dare (--skip-dare). Card/OG checks not run.");
    return exit();
  }

  console.log(`  …  daring octocat/Hello-World`);
  const { res: dareRes, data: dare } = await fetchJson(`${origin}/api/dare`, {
    method: "POST",
    headers: seedHeaders(secret),
    body: JSON.stringify({ repoUrl: "https://github.com/octocat/Hello-World" }),
  });
  if (dareRes.status === 429) {
    fail(
      "Dare rate-limited (3/IP/hour). Re-run with --secret $CRON_SECRET (must match Vercel CRON_SECRET).",
    );
    return exit();
  }
  if (!dareRes.ok || !dare?.jobId) {
    fail(`POST /api/dare failed (${dareRes.status}): ${dare?.error ?? "no jobId"}`);
    return exit();
  }
  pass(`Dare job created: ${dare.jobId}`);

  const polled = await pollDare(origin, dare.jobId, { secret });
  if (!polled.ok) {
    fail(`Dare did not complete: ${polled.error}`);
    if (polled.job?.status) fail(`last status: ${polled.job.status}`);
    return exit();
  }
  const job = polled.job;
  const scanId = job.scan_id;
  const score = job.progress?.score;
  const grade = job.progress?.grade;
  const name = job.progress?.projectName ?? "octocat/Hello-World";
  if (scanId == null) {
    fail(
      "Dare completed but scan_id is null — board write failed (database / scan_jobs / service role).",
    );
  } else {
    pass(`Dare complete: ${name} ${grade} (${score}) scan_id=${scanId}`);
  }

  if (scanId) {
    const cardRes = await fetch(`${origin}/s/${scanId}`);
    const html = await cardRes.text();
    if (!cardRes.ok) {
      fail(`/s/${scanId} returned ${cardRes.status}`);
    } else {
      pass(`/s/${scanId} ${cardRes.status}`);
      if (/<header[\s>]/i.test(html) || /<footer[\s>]/i.test(html)) {
        fail(`/s/${scanId} still has header or footer chrome`);
      } else {
        pass(`/s/${scanId} has no header/footer`);
      }
      if (!html.includes("SHIPRANK") && !html.includes("ShipRank")) {
        fail(`/s/${scanId} is missing the Card wordmark`);
      }
      if (grade && !html.includes(String(grade))) {
        warn(`/s/${scanId} HTML did not include grade ${grade} (could be client-stamped)`);
      }
    }

    const ogBuf = Buffer.from(await (await fetch(`${origin}/s/${scanId}/opengraph-image`)).arrayBuffer());
    const apiBuf = Buffer.from(
      await (await fetch(`${origin}/api/card/${scanId}?size=og`)).arrayBuffer(),
    );
    let ogSize;
    let apiSize;
    try {
      ogSize = pngSize(ogBuf);
      pass(`OG PNG ${ogSize.width}×${ogSize.height} (${ogBuf.length} bytes)`);
    } catch {
      fail("OG image is not a PNG");
    }
    try {
      apiSize = pngSize(apiBuf);
      pass(`/api/card PNG ${apiSize.width}×${apiSize.height} (${apiBuf.length} bytes)`);
    } catch {
      fail("/api/card?size=og is not a PNG");
    }
    if (ogSize && (ogSize.width !== 1200 || ogSize.height !== 630)) {
      fail(`OG is ${ogSize.width}×${ogSize.height}, expected 1200×630`);
    }
    if (apiSize && (apiSize.width !== 1200 || apiSize.height !== 630)) {
      fail(`/api/card is ${apiSize.width}×${apiSize.height}, expected 1200×630`);
    }
    if (ogBuf.equals(apiBuf)) {
      pass("OG image bytes === /api/card?size=og");
    } else {
      fail("OG image and /api/card?size=og differ");
    }

    console.log("");
    console.log("Ready-to-post (this Dare):");
    console.log(`  Card  ${origin}/s/${scanId}`);
    console.log("  Tweet");
    console.log(
      lockedTweet({
        name,
        score,
        grade,
        origin: health.origin ?? origin,
      })
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n"),
    );
  }

  return exit();
}

function exit() {
  console.log("");
  console.log(`${PASS.length} ok  ${WARN.length} warn  ${FAIL.length} fail`);
  if (FAIL.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
