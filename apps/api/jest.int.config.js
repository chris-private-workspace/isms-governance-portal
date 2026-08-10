/**
 * File: apps/api/jest.int.config.js
 * Purpose: Runs the tests that need a real PostgreSQL, separately from the ones
 *   that must not.
 * Category: Tooling
 * Scope: Phase W02
 *
 * Description:
 *   Two configs rather than one, because the two suites answer different
 *   questions and fail for different reasons. `npm test` must stay runnable
 *   with no database — it covers logic, and a suite that needs docker running
 *   is a suite people stop running. This one covers the claim that the database
 *   refuses things, which no double can stand in for.
 *
 *   No coverage thresholds here: these tests exist to prove isolation holds, and
 *   scoring them by lines executed would reward the wrong thing. Coverage stays
 *   the unit config's job.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'src/.*\\.int\\.spec\\.ts$',
  // rootDir is the package, not src/, because globalSetup lives in test/. That
  // puts dist/ in scope too, and the compiled Prisma client's package.json
  // collides by name with the source one — jest printed a haste-map warning on
  // every run (PR #25, run 31322279179). Harmless, and that is the problem: a
  // warning on every green run is how people learn to skim past jest's output.
  //
  // ⚠️ It only reproduces with a cold haste map. `npm run test:int` locally is
  // silent whether or not this line is present, because the cache is warm —
  // which is exactly how it reached CI unnoticed. Verify with
  // `npx jest --config jest.int.config.js --listTests --no-cache`.
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  globalSetup: '<rootDir>/test/int-global-setup.js',
  setupFiles: ['<rootDir>/test/int-env.js'],
  // Connecting, migrating and seeding a fresh database costs more than the 5s
  // default allows on a cold container.
  testTimeout: 30_000,
  // One worker: the suite asserts on rows in a shared database, and parallel
  // files would interleave writes. Cheap here (three files) and it removes an
  // entire class of flake that would otherwise be blamed on RLS.
  //
  // ⚠️ W03 showed this is necessary but not sufficient. policy.int.spec.ts is
  // the first suite that WRITES, and its first run failed a test in
  // entity-scope.int.spec.ts by leaving a row behind. Serial execution decides
  // the order; it does not undo the write. A writing suite must retire its own
  // rows in afterAll.
  maxWorkers: 1,
};
