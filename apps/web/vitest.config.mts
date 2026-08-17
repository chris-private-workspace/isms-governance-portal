/**
 * File: apps/web/vitest.config.mts
 * Purpose: Test runner config for the web workspace.
 * Category: Tooling
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   Vitest here, Jest in apps/api. Each workspace runs its ecosystem's default
 *   rather than forcing one runner across both — NestJS needs decorator
 *   metadata that esbuild does not emit, and bending Vitest to produce it
 *   means an extra swc layer on day one. Reasoning recorded in
 *   apps/api/jest.config.js as well, so neither file looks arbitrary alone.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-17
 *
 *   `.mts` rather than `.ts`: the closest package.json has no `"type":
 *   "module"`, so Vite's native config loader treats a `.ts` config as
 *   CommonJS and warns about the ESM syntax in it.
 *
 *   `jsdom` globally rather than per-glob: the 10 pre-existing i18n tests are
 *   pure logic and pass under either environment, and one environment is one
 *   less thing to get wrong. Revisit only if suite time becomes a problem.
 *
 *   coverage.include stays at src/i18n/** on purpose. W19 ports ~30 screens,
 *   which would make a repo-wide threshold either meaningless or blocking on
 *   day one. Widening it is AD-WebCoverage-1's job, not this phase's — but
 *   note the gap grows with every screen landed here.
 *
 * Modification History (newest-first):
 *   - 2026-08-17: jsdom + .test.tsx for component tests (Phase W19)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      include: ['src/i18n/**'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
