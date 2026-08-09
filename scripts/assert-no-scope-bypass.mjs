/**
 * File: scripts/assert-no-scope-bypass.mjs
 * Purpose: Fail the build when application code can reach the database without
 *   an entity scope — and prove, every run, that it can still tell.
 * Category: Tooling / lint
 * Scope: Phase W02
 * Owner: docs/01-planning/W02-entity-scope-rls-spike/plan.md §3.5
 *
 * Description:
 *   ADR-0001:112-113 says the paths that go around the client extension must be
 *   detected "mechanically, not by review". This is that detector.
 *
 *   Three rules, each naming a way to hold a client the extension never wrapped:
 *     - raw-query            $queryRaw / $executeRaw (+Unsafe): raw SQL is
 *                            invisible to the extension, so nothing sets the scope
 *     - unscoped-connection  PrismaService.connection: the one named door to the
 *                            unwrapped client
 *     - new-client           `new PrismaClient(`: a second pool nothing wraps
 *
 *   The allowlist is four entries and each is the implementation of the thing
 *   being enforced, not an exception to it. Growing it is the failure mode to
 *   watch: every addition is one more place the guarantee does not hold.
 *
 *   ⚠️ The self-test runs unconditionally before the scan, not behind a flag. A
 *   detector that reports "0 violations" because its patterns went stale reads
 *   exactly like a clean repo — that is the AD-NegativeGate-1 shape, and this
 *   project has now hit it seven times. __fixtures__/scope-bypass.ts is skipped
 *   by the scan and required to fail the self-test.
 *
 *   Test files are excluded and the count is printed rather than passed over in
 *   silence: doubles legitimately name `.connection`, and a silent exclusion is
 *   indistinguishable from coverage.
 *
 * Usage:
 *     npm run lint:negative          # self-test, then scan
 *     node scripts/assert-no-scope-bypass.mjs --self-test   # meta-verification only
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..."
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_ROOT = join(ROOT, 'apps', 'api', 'src');
const FIXTURE = 'apps/api/src/entity-scope/__fixtures__/scope-bypass.ts';

const RULES = [
  {
    id: 'raw-query',
    pattern: /\$(?:queryRaw|executeRaw)(?:Unsafe)?\b/,
    why: 'raw SQL never passes through the client extension, so app.entity_scope is never set',
  },
  {
    id: 'unscoped-connection',
    pattern: /\.connection\b/,
    why: 'that is the unwrapped client; inject ScopedPrismaFactory and query through forScope()',
  },
  {
    id: 'new-client',
    pattern: /new\s+PrismaClient\s*\(/,
    why: 'a second pool that no extension wraps; the one client is owned by PrismaService',
  },
];

/**
 * Each entry is the code that implements scoping, not an escape from it.
 * Anything added here is a place the guarantee stops holding — say why, in the
 * file, where the next reader will see it.
 */
const ALLOW = new Map([
  // Owns the connection and the liveness probe. `SELECT 1` reads no table.
  ['apps/api/src/core-model/prisma.service.ts', ['raw-query', 'unscoped-connection', 'new-client']],
  // Issues the set_config that every other query depends on.
  ['apps/api/src/entity-scope/scoped-prisma.provider.ts', ['raw-query', 'unscoped-connection']],
  // Reads org_entities, a global table with no RLS policy: it *defines* scope,
  // so scope-filtering it would make the hierarchy unresolvable
  // (multi-tenant-data.md:61).
  ['apps/api/src/entity-scope/entity-scope.resolver.ts', ['unscoped-connection']],
]);

const IGNORED_DIRS = new Set(['generated', 'node_modules', 'dist']);
const isTest = (p) => /\.spec\.ts$/.test(p) || /\.test\.ts$/.test(p);
const isFixture = (p) => p.includes(`${sep}__fixtures__${sep}`) || p.includes('/__fixtures__/');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!IGNORED_DIRS.has(entry)) walk(full, out);
    } else if (entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Comments are stripped before matching, and the first version of this file did
 * not do that. It reported health.service.ts twice — for two doc comments that
 * *explain* why `$queryRaw` no longer appears there. A detector that fires on
 * prose about itself teaches people either to stop writing the explanation or
 * to weaken the rule, and both are worse than the false negative this trades
 * away: commented-out code is not a live bypass, and uncommenting it brings the
 * detector straight back.
 *
 * Known limit: a `//` inside a string literal truncates the rest of that line.
 * A bypass would have to sit after a URL on the same line to hide there.
 */
function stripComments(source) {
  let inBlock = false;
  return source.split(/\r?\n/).map((line) => {
    let out = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', i);
        if (end === -1) return out;
        inBlock = false;
        i = end + 2;
        continue;
      }
      if (line.startsWith('//', i)) return out;
      if (line.startsWith('/*', i)) {
        inBlock = true;
        i += 2;
        continue;
      }
      out += line[i];
      i += 1;
    }
    return out;
  });
}

/** Line-level, so the report can point at something a reader can open. */
function findingsIn(file) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const allowed = ALLOW.get(rel) ?? [];
  const found = [];

  stripComments(readFileSync(file, 'utf8')).forEach((line, i) => {
    for (const rule of RULES) {
      if (allowed.includes(rule.id)) continue;
      if (rule.pattern.test(line)) {
        found.push({ file: rel, line: i + 1, rule: rule.id, why: rule.why, text: line.trim() });
      }
    }
  });

  return found;
}

function fail(message) {
  console.error(`\n[no-scope-bypass] FAIL — ${message}\n`);
  process.exit(1);
}

// === Self-test: does the detector still detect? ==============================
const fixtureFindings = findingsIn(join(ROOT, FIXTURE));
const fixtureRules = new Set(fixtureFindings.map((f) => f.rule));
const missing = RULES.filter((r) => !fixtureRules.has(r.id)).map((r) => r.id);

if (missing.length > 0) {
  fail(
    `the self-test fixture no longer triggers: ${missing.join(', ')}\n` +
      `Fixture: ${FIXTURE}\n` +
      'Either a pattern went stale, or the fixture was "cleaned up". Both end the\n' +
      'same way: the scan below reports 0 violations and looks exactly like a repo\n' +
      'with no bypasses in it.',
  );
}

if (process.argv.includes('--self-test')) {
  console.log(
    `[no-scope-bypass] SELF-TEST PASS — fixture rejected by all ${RULES.length} rules ` +
      `(${fixtureFindings.length} findings).`,
  );
  process.exit(0);
}

// === Scan ====================================================================
const all = walk(SCAN_ROOT);
const skippedTests = all.filter(isTest).length;
const skippedFixtures = all.filter(isFixture).length;
const scanned = all.filter((f) => !isTest(f) && !isFixture(f));
const violations = scanned.flatMap(findingsIn);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]  ${v.text}`);
    console.error(`      ${v.why}`);
  }
  fail(
    `${violations.length} path(s) can reach the database without an entity scope.\n` +
      'guardrail 4 has no grace period. Either route the call through\n' +
      'ScopedPrismaFactory.forScope(), or — if it genuinely belongs to the scoping\n' +
      'mechanism itself — add it to ALLOW with the reason written in the file.',
  );
}

console.log(
  `[no-scope-bypass] PASS — ${scanned.length} file(s) scanned, 0 bypasses; ` +
    `${ALLOW.size} allowlisted; skipped ${skippedTests} test + ${skippedFixtures} fixture file(s).`,
);
