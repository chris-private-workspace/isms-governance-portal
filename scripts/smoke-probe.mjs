/**
 * File: scripts/smoke-probe.mjs
 * Purpose: Prove a running container actually serves what it is supposed to —
 *   not merely that it answered.
 * Category: Tooling / CI
 * Scope: CH-013
 * Owner: docs/03-implementation/changes/CH-013-image-build-and-run-smoke/spec.md
 *
 * Description:
 *   `docker build` exiting 0 says the image assembled. `docker run` staying up
 *   says a process is alive. Neither says the artifact works, and W01 shipped
 *   both of those greens over a `start` script pointing at a file nest never
 *   emitted. This probes the running thing.
 *
 *   ⭐ WHY THE WEB PROBE FETCHES TWICE. Day-0 measured it: an image built
 *   without the `.next/static` COPY (apps/web/Dockerfile:48) still builds
 *   green, still starts, and still answers `GET /` with HTTP 200 — at
 *   *identical byte length* (5824), with every zh-Hant string present. The
 *   only observable difference is that the chunk URLs the HTML references
 *   return 404. So asserting on the page body cannot detect it; the probe has
 *   to follow what the page asked for.
 *
 *   ⭐ WHY THE API PROBE DEMANDS db:"up". Day-0 also measured that the API
 *   starts fine against an unreachable database — `$connect()` failing does
 *   not abort the Nest bootstrap, and /health reports {"status":"up",
 *   "db":"down"}. That makes `db:"down"` the *healthy-looking* answer when no
 *   database is present, which is exactly the shape a broken Prisma engine
 *   produces too. Requiring "up" is what separates those two.
 *
 *   Expected copy is read from a dictionary rather than hard-coded, so
 *   rewording the UI does not turn this into a false red — and WHICH dictionary
 *   is derived from DEFAULT_LOCALE, because pinning one is the same mistake one
 *   level up (CH-040 proved it: the default moved and this went red in CI while
 *   the image was fine).
 *
 * Key Components:
 *   - extractChunkPaths(html): the one piece of parsing, self-tested below
 *   - probeApi / probeWeb: one target each
 *   - retryUntil: waiting without hiding what it last saw
 *
 * Usage:
 *     node scripts/smoke-probe.mjs api http://127.0.0.1:3210
 *     node scripts/smoke-probe.mjs web http://127.0.0.1:3200
 *     node scripts/smoke-probe.mjs --self-test
 *
 * Created: 2026-08-09 (CH-013)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Derive the dictionary from DEFAULT_LOCALE (CH-040) — was pinned to zh-Hant
 *   - 2026-08-09: Initial creation (CH-013)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..."
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const I18N_INDEX = join(ROOT, 'apps', 'web', 'src', 'i18n', 'index.ts');

/*
 * Which dictionary to expect is derived, not named.
 *
 * The header below already says the copy is read from a dictionary rather than
 * hard-coded, so rewording the UI cannot turn this red. That defence was real
 * but partial: it hard-coded WHICH dictionary. CH-040 changed the default
 * locale from zh-Hant to en, the page started serving English, and this probe
 * failed in CI for a reason that had nothing to do with the image being broken.
 *
 * Reading DEFAULT_LOCALE keeps the probe pointed at whatever the app actually
 * serves. Parsing TypeScript with a regex is not lovely, but the alternatives
 * are worse: importing the TS module from a plain .mjs needs a build step this
 * script deliberately avoids, and accepting EITHER dictionary would destroy the
 * very discrimination the probe exists for — serving the wrong language would
 * then pass.
 *
 * If the declaration is ever reshaped, the match fails loudly rather than
 * falling back to a guess.
 */
function defaultLocale() {
  const source = readFileSync(I18N_INDEX, 'utf8');
  const match = source.match(/export const DEFAULT_LOCALE\s*:\s*Locale\s*=\s*'([^']+)'/);
  if (!match) {
    fail(
      'web',
      `could not read DEFAULT_LOCALE from ${I18N_INDEX}.\n` +
        '  The probe derives which dictionary to expect from that declaration.\n' +
        '  If its shape changed, update the pattern here rather than pinning a locale.',
    );
  }
  return match[1];
}

const DEFAULT_LOCALE = defaultLocale();
const DICTIONARY = join(ROOT, 'apps', 'web', 'src', 'i18n', `${DEFAULT_LOCALE}.json`);
// 90s covers a cold container plus a cold database. Overridable because the
// meta-verification runs deliberately-broken images, where the whole point is
// that nothing will ever answer and waiting the full window is dead time.
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 90_000);
const INTERVAL_MS = 1_000;

function fail(target, message) {
  console.error(`\n[smoke:${target}] FAIL — ${message}\n`);
  process.exit(1);
}

/**
 * Pull every distinct Next.js static chunk the page references.
 *
 * A zero-length result is a FAILURE, never a pass. If Next changes its asset
 * path layout this regex stops matching, and treating "nothing to check" as
 * "nothing wrong" would recreate the exact silent-green defect this whole
 * change exists to remove (AD-NegativeGate-1).
 */
function extractChunkPaths(html) {
  const matches = html.match(/\/_next\/static\/[A-Za-z0-9_\-./]+\.js/g) ?? [];
  return [...new Set(matches)];
}

async function retryUntil(check, { target, what }) {
  const deadline = Date.now() + TIMEOUT_MS;
  let lastReason = 'never got a response';

  while (Date.now() < deadline) {
    try {
      const outcome = await check();
      if (outcome.ok) return outcome;
      lastReason = outcome.why;
    } catch (error) {
      // Node's fetch reports every transport failure as the same
      // "TypeError: fetch failed" and hides the useful part in `cause`.
      // ECONNREFUSED (nothing listening) and ECONNRESET (died mid-request)
      // point at completely different problems, so surface the distinction.
      const cause = error.cause?.code ?? error.cause?.message;
      lastReason = `${error.name}: ${error.message}${cause ? ` (${cause})` : ''}`;
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  fail(
    target,
    `timed out after ${TIMEOUT_MS / 1000}s waiting for ${what}.\n  Last seen: ${lastReason}`,
  );
}

async function probeApi(base) {
  const url = new URL('/health', base).toString();

  const { body } = await retryUntil(
    async () => {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return { ok: false, why: `HTTP ${response.status} from ${url}` };

      const text = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        return { ok: false, why: `body was not JSON: ${text.slice(0, 200)}` };
      }
      if (parsed.status !== 'up')
        return { ok: false, why: `status was ${JSON.stringify(parsed.status)}` };
      // Retried rather than failed outright: on a cold start the database can
      // still be accepting connections a second or two after the API is up.
      if (parsed.db !== 'up') return { ok: false, why: `db was ${JSON.stringify(parsed.db)}` };
      return { ok: true, body: parsed };
    },
    { target: 'api', what: `${url} to report status=up and db=up` },
  );

  console.log(`[smoke:api] PASS — ${url} -> ${JSON.stringify(body)}`);
  console.log('[smoke:api]   db:"up" is the load-bearing half: it proves the Prisma engine in');
  console.log(
    '[smoke:api]   the image can actually reach PostgreSQL, not just that a port answers.',
  );
}

async function probeWeb(base) {
  const root = new URL('/', base).toString();
  const dictionary = JSON.parse(readFileSync(DICTIONARY, 'utf8'));
  const expectedCopy = dictionary['app.title'];

  if (!expectedCopy) {
    fail('web', `the ${DEFAULT_LOCALE} dictionary has no "app.title" key — ${DICTIONARY}`);
  }

  const { html } = await retryUntil(
    async () => {
      const response = await fetch(root, { cache: 'no-store' });
      if (!response.ok) return { ok: false, why: `HTTP ${response.status} from ${root}` };
      return { ok: true, html: await response.text() };
    },
    { target: 'web', what: `${root} to answer 200` },
  );

  if (!html.includes(expectedCopy)) {
    fail(
      'web',
      `${root} answered 200 but the page does not contain the ${DEFAULT_LOCALE} title.\n` +
        `  Expected (from ${DICTIONARY}): ${expectedCopy}\n` +
        '  Either the app is serving something else, or the dictionary is not the one it built with.',
    );
  }

  const chunks = extractChunkPaths(html);
  if (chunks.length === 0) {
    fail(
      'web',
      `${root} answered 200 with the right copy, but references no /_next/static asset at all.\n` +
        '  That is not a pass. Either the page shipped without its client bundle, or Next changed\n' +
        '  its asset path layout and this probe stopped looking in the right place. Both need a human.',
    );
  }

  for (const path of chunks) {
    const assetUrl = new URL(path, base).toString();
    const response = await fetch(assetUrl, { cache: 'no-store' });
    if (!response.ok) {
      fail(
        'web',
        `the page references an asset the server does not serve.\n` +
          `  ${path} -> HTTP ${response.status}\n` +
          '  This is what a missing `.next/static` COPY in apps/web/Dockerfile looks like.\n' +
          '  Measured in Day-0: GET / still returns 200 with byte-identical content, so probing\n' +
          '  the page alone cannot see it.',
      );
    }
    const size = (await response.arrayBuffer()).byteLength;
    if (size === 0) fail('web', `${path} answered 200 but was empty`);
  }

  console.log(
    `[smoke:web] PASS — ${root} serves the ${DEFAULT_LOCALE} page and all ${chunks.length} referenced assets.`,
  );
  console.log(`[smoke:web]   assets checked: ${chunks.join(', ')}`);
}

/**
 * Guards the one piece of parsing in this file. `extractChunkPaths` returning
 * nothing is treated as a failure by the probe, so a silently-broken regex
 * would surface as a confusing red rather than a false green — but it would
 * still cost someone an hour. This makes it obvious instead.
 */
function selfTest() {
  const cases = [
    {
      name: 'finds and de-duplicates chunk paths',
      html:
        '<script src="/_next/static/chunks/abc123.js"></script>' +
        '"/_next/static/chunks/abc123.js"',
      expect: (out) => out.length === 1 && out[0] === '/_next/static/chunks/abc123.js',
    },
    {
      name: 'finds several distinct chunks',
      html: '<script src="/_next/static/chunks/a.js"></script><script src="/_next/static/chunks/b.js"></script>',
      expect: (out) => out.length === 2,
    },
    {
      name: 'returns empty for a page with no static assets',
      html: '<html><body>沒有資源</body></html>',
      expect: (out) => out.length === 0,
    },
  ];

  let failed = 0;
  for (const testCase of cases) {
    const out = extractChunkPaths(testCase.html);
    const ok = testCase.expect(out);
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${testCase.name}${ok ? '' : ` -> ${JSON.stringify(out)}`}`,
    );
    if (!ok) failed += 1;
  }

  if (failed > 0) {
    console.error(`\n[smoke:self-test] FAIL — ${failed} of ${cases.length} cases failed.\n`);
    process.exit(1);
  }
  console.log(`[smoke:self-test] PASS — ${cases.length} cases.`);
}

const [target, base] = process.argv.slice(2);

if (target === '--self-test') {
  selfTest();
} else if (target === 'api') {
  await probeApi(base);
} else if (target === 'web') {
  await probeWeb(base);
} else {
  console.error('usage: node scripts/smoke-probe.mjs <api|web> <base-url>');
  console.error('       node scripts/smoke-probe.mjs --self-test');
  process.exit(2);
}
