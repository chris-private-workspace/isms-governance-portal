/**
 * File: scripts/assert-boundary-gate.mjs
 * Purpose: Prove eslint-plugin-boundaries still enforces the scope matrix, by
 *   running it against a file that is deliberately illegal.
 * Category: Tooling / lint
 * Scope: CH-012
 * Owner: docs/03-implementation/changes/CH-012-resident-negative-gates/spec.md
 *
 * Description:
 *   W01 shipped a boundaries config that was valid, produced a green lint, and
 *   enforced nothing — six separate ways, each of which looked exactly like
 *   success. `npm run lint` passing says nothing about whether the rule is
 *   alive, because a rule with no elements to classify passes everything.
 *
 *   So this asserts the inverse: point ESLint at a known-illegal import and
 *   require it to complain, by name.
 *
 *   Three assertions, and the second is the one that matters:
 *     1. the fixture exists (a deleted fixture makes ESLint exit non-zero for
 *        an unrelated reason, which a naive exit-code check would accept)
 *     2. the output names `boundaries/dependencies` — not merely a non-zero
 *        exit, because a syntax error in the fixture also exits 1 while the
 *        boundaries rule sits dead
 *     3. the output names both scopes, so a rule firing for some other pair
 *        cannot stand in for the one under test
 *
 *   ESLint is spawned through `process.execPath` against its bin script rather
 *   than via a shell, so the same command works on Windows and Linux without
 *   `shell: true`.
 *
 * Usage:
 *     npm run lint:negative
 *
 * Created: 2026-08-09 (CH-012)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (CH-012)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..."
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const FIXTURE = 'apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts';
const EXPECTED_RULE = 'boundaries/dependencies';
const EXPECTED_FROM = 'audit-trail';
const EXPECTED_TO = 'core-model';

function fail(message) {
  console.error(`\n[lint:negative] FAIL — ${message}\n`);
  process.exit(1);
}

if (!existsSync(join(ROOT, FIXTURE))) {
  fail(
    `the fixture is missing: ${FIXTURE}\n` +
      'It is not disposable. Without it nothing proves the boundaries rule is alive,\n' +
      'and a green `npm run lint` would mean exactly as much as it did in W01: nothing.',
  );
}

const eslint = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const result = spawnSync(process.execPath, [eslint, FIXTURE], {
  cwd: ROOT,
  encoding: 'utf8',
});

if (result.error) fail(`could not run ESLint: ${result.error.message}`);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

if (result.status === 0) {
  fail(
    `ESLint accepted a deliberate ${EXPECTED_FROM} -> ${EXPECTED_TO} import.\n` +
      'The scope matrix is not being enforced. Likely causes, all seen in W01:\n' +
      '  - `settings` moved into a config object that has a `files` key\n' +
      '  - eslint-import-resolver-typescript missing, so imports resolve to unknown\n' +
      '  - the rule renamed, or `policies` reverted to the removed `rules` key\n' +
      `Output was:\n${output}`,
  );
}

if (!output.includes(EXPECTED_RULE)) {
  fail(
    `ESLint exited ${result.status}, but never mentioned ${EXPECTED_RULE}.\n` +
      'A non-zero exit is not the assertion — a syntax error in the fixture would\n' +
      'also exit non-zero while the boundaries rule sits dead.\n' +
      `Output was:\n${output}`,
  );
}

if (!output.includes(EXPECTED_FROM) || !output.includes(EXPECTED_TO)) {
  fail(
    `${EXPECTED_RULE} fired, but not for ${EXPECTED_FROM} -> ${EXPECTED_TO}.\n` +
      `Output was:\n${output}`,
  );
}

console.log(
  `[lint:negative] PASS — ${EXPECTED_RULE} rejected ${EXPECTED_FROM} -> ${EXPECTED_TO}, as it must.`,
);
