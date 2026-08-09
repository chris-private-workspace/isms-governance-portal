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
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  globalSetup: '<rootDir>/test/int-global-setup.js',
  setupFiles: ['<rootDir>/test/int-env.js'],
  // Connecting, migrating and seeding a fresh database costs more than the 5s
  // default allows on a cold container.
  testTimeout: 30_000,
  // One worker: the suite asserts on rows in a shared database, and parallel
  // files would interleave writes. Cheap here (two files) and it removes an
  // entire class of flake that would otherwise be blamed on RLS.
  maxWorkers: 1,
};
