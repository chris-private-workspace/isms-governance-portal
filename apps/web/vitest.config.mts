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
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The `@/*` alias is declared in tsconfig.json, which the type checker and
  // Next both read and Vitest does not. The 10 pre-existing tests all import
  // relatively, so nothing had ever asked Vitest to resolve it.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Next compiles JSX for the app; Vitest does not inherit that. tsconfig sets
  // `jsx: preserve` because Next wants the raw syntax, so a .test.tsx reaches
  // the import analyser untransformed and fails to parse.
  //
  // The plugin rather than an `esbuild: { jsx }` option: Vitest 4 does not run
  // the transform this config could reach, so that setting was accepted and
  // did nothing — the identical parse error came back. A setting that is read
  // and ignored is worse than none, which is the reason this note exists.
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      include: ['src/i18n/**'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
