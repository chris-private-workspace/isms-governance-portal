/**
 * File: apps/api/jest.config.js
 * Purpose: Test runner config for the API workspace.
 * Category: Tooling
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   Jest + ts-jest rather than Vitest, because NestJS DI needs
 *   `emitDecoratorMetadata`, which esbuild-based runners do not emit without
 *   an extra swc layer. apps/web uses Vitest for the same reason inverted —
 *   each workspace runs its ecosystem's default instead of fighting one
 *   runner into both. The cost is two runners; the benefit is no toolchain
 *   workaround on day one.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  collectCoverageFrom: ['**/*.ts', '!**/generated/**', '!bootstrap/**'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
