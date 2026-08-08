/**
 * File: eslint.config.mjs
 * Purpose: Repo-wide lint config; mechanically enforces the eight scope boundaries.
 * Category: Tooling / Architecture enforcement
 * Scope: Phase W01 (M0)
 * Owner: docs/rules-on-demand/scope-boundaries.md
 *
 * Description:
 *   Two jobs in one file. The ordinary one is TypeScript linting. The one that
 *   matters is `boundaries/element-types`: it implements, rule for rule, the
 *   8x8 import matrix in scope-boundaries.md. CLAUDE.md 約束 1 says every file
 *   belongs to exactly one scope and scopes must not cross-import; ADR-0001:69
 *   chose NestJS specifically so that constraint could be a build failure
 *   rather than a review convention. This file is where that promise is kept.
 *
 *   `default: 'disallow'` is deliberate. A new scope added without a matching
 *   rule is denied everything, which surfaces immediately, rather than being
 *   silently permitted.
 *
 * Key Components:
 *   - boundaries/elements: the nine path zones (eight scopes + composition root)
 *   - boundaries/element-types: the allow matrix, mirroring scope-boundaries.md
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01) — implements the scope matrix
 *
 * Related:
 *   - docs/rules-on-demand/scope-boundaries.md §允許 / 禁止的 import 矩陣
 *   - CLAUDE.md §範疇（Scopes） · §核心約束 1
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

/**
 * The composition root is NOT a scope. `main.ts`, `app.module.ts` and the
 * health endpoint exist to wire scopes together, so by construction they
 * import across all of them. Naming that explicitly is honest; pretending it
 * is a ninth scope would make the matrix lie.
 */
/**
 * Two non-obvious requirements, both learned by watching the rule fail to fire
 * rather than by reading the config back:
 *   - a pattern MUST contain a wildcard; a bare folder path classifies nothing
 *   - `partialMatch: false` anchors the pattern at `boundaries/root-path`,
 *     which is what makes these paths correct no matter which workspace
 *     directory ESLint was invoked from
 */
const el = (type, pattern) => ({ type, pattern, partialMatch: false });

const ELEMENTS = [
  el('bootstrap', ['apps/api/src/bootstrap/**', 'apps/api/src/health/**']),
  el('api', ['apps/api/src/contracts/**', 'packages/types/**']),
  // The generated Prisma client is the core model's persistence surface, so it
  // is classified with it rather than left unknown — an unknown element under
  // `default: 'disallow'` would be denied to everyone including its owner.
  el('core-model', ['apps/api/src/core-model/**', 'apps/api/src/generated/**']),
  el('entity-scope', ['apps/api/src/entity-scope/**']),
  el('audit-trail', ['apps/api/src/audit-trail/**']),
  el('identity', ['apps/api/src/identity/**']),
  el('workflow', ['apps/api/src/workflow/**']),
  el('modules', ['apps/api/src/modules/**']),
  el('ui', ['apps/web/**']),
];

/** Mirrors docs/rules-on-demand/scope-boundaries.md §允許 / 禁止的 import 矩陣. */
const MATRIX = {
  bootstrap: ['bootstrap', 'api', 'core-model', 'entity-scope', 'audit-trail', 'identity', 'workflow', 'modules'],
  api: ['api'],
  'core-model': ['api', 'core-model'],
  'entity-scope': ['api', 'core-model', 'entity-scope'],
  // audit-trail deliberately cannot reach core-model: an audit trail that
  // depends on domain shape needs editing every time an entity is added, and
  // guardrail 5's no-bypass property erodes as the domain grows.
  'audit-trail': ['api', 'audit-trail'],
  identity: ['api', 'core-model', 'entity-scope', 'identity'],
  workflow: ['api', 'core-model', 'entity-scope', 'audit-trail', 'identity', 'workflow'],
  modules: ['api', 'core-model', 'entity-scope', 'audit-trail', 'identity', 'workflow', 'modules'],
  ui: ['api', 'ui'],
};

const POLICIES = [
  // Third-party packages are out of scope for this rule; it governs the
  // internal graph. Without this every `import { Module } from '@nestjs/common'`
  // would be denied by `default: 'disallow'`.
  { allow: { to: { module: { origin: 'external' } } } },
  ...Object.entries(MATRIX).map(([from, to]) => ({
    from: { element: { type: from } },
    allow: { to: { element: { types: { anyOf: to } } } },
  })),
];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      'apps/api/src/generated/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    // No `files` key on purpose: a scoped config object does not apply when
    // ESLint is invoked from inside a workspace, which left `boundaries/elements`
    // empty and every file classified as unknown — the rule then passed
    // everything. Plugin and settings are global; only the rule is scoped.
    plugins: { boundaries },
    settings: {
      // Without this, patterns resolve against ESLint's cwd. CI invokes
      // `npm run lint -w apps/api -w apps/web`, which sets cwd to each
      // workspace, so `apps/api/src/**` would never match and every rule would
      // silently pass. That failure mode was caught by the deliberate
      // cross-scope import in the W01 checklist, not by reading the config.
      'boundaries/root-path': import.meta.dirname.replace(/\\/g, '/'),
      'boundaries/elements': ELEMENTS,
      // Without a TypeScript-aware resolver the plugin cannot follow an
      // extension-less import, so every dependency resolves to "unknown" and
      // the matrix is enforced against nothing. Files classify correctly the
      // whole time, which is why this reads as working until you deliberately
      // violate a boundary and watch the lint stay green.
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
  },

  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.ts'],
    rules: {
      // `default: 'disallow'` — an unlisted pair is denied, not permitted.
      'boundaries/dependencies': ['error', { default: 'disallow', policies: POLICIES }],
    },
  },

  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      // Test doubles legitimately reach for internals the production matrix denies.
      'boundaries/dependencies': 'off',
    },
  },
);
