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
 *   - 2026-08-08: Phase W01 — branches 80 -> 70, see below (D3-4)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  // `*.int.spec.ts` needs a real PostgreSQL and lives in jest.int.config.js.
  // The suffix still ends in `.spec.ts` on purpose: eslint.config.mjs:142 keys
  // its test exemptions off that pattern, and a name it did not recognise would
  // put integration tests under the production import matrix.
  testPathIgnorePatterns: ['\\.int\\.spec\\.ts$'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  // __fixtures__ holds files that exist to be REJECTED by another tool, never
  // executed — counting them drags the total down by design, and by more with
  // each one added (CH-012).
  // `!**/*.int.spec.ts` is not tidiness: those files are excluded from this
  // run, so counting them scores two never-executed files at 0% and drags the
  // total under the threshold. Adding the first integration test dropped
  // statements from 100% to 39.91% without a single line of production code
  // changing.
  collectCoverageFrom: [
    '**/*.ts',
    '!**/generated/**',
    '!bootstrap/**',
    '!**/__fixtures__/**',
    '!**/*.int.spec.ts',
  ],
  coverageDirectory: '../coverage',
  // === Why branches is 70 while everything else is 80 ===
  // Why: `emitDecoratorMetadata` — which Nest's DI requires — emits a ternary
  // per decorated constructor and return type:
  //     typeof PrismaService !== "undefined" ? PrismaService : Object
  // The `Object` arm runs only if the type is undefined at decoration time, so
  // no test can reach it. Verified, not assumed: lcov records BRDA:31,0,1,0 on
  // health.service.ts:31 and BRDA:25,0,1,0 on health.controller.ts:25, both
  // constructor/return-type metadata lines. With every real branch covered the
  // ceiling is 78.57%, so 80 is a gate no correct work can pass — and a gate
  // that cannot be passed teaches people to skip the command.
  // Alternative considered:
  //   - coverageProvider: 'v8' — totals 80.00% and passes, but scores
  //     health.controller.ts at 60%; one more decorated method breaks it.
  //     Rejected: passing by arithmetic coincidence is not a better measurement.
  //   - Leaving 80 and not running it in CI — that is how coverage reached 45%
  //     unnoticed in the first place.
  // Re-tighten when: decorator metadata is no longer needed (Nest DI without
  // reflect-metadata), or the artifact branches become excludable.
  coverageThreshold: {
    global: { statements: 80, branches: 70, functions: 80, lines: 80 },
  },
};
