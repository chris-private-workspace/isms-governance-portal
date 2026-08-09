/**
 * File: apps/api/src/audit-trail/__fixtures__/cross-scope-import.ts
 * Purpose: A boundary violation that must stay a violation — the resident negative
 *   case proving eslint-plugin-boundaries still enforces the matrix.
 * Category: audit-trail (by path — that classification is the point)
 * Scope: CH-012
 * Owner: docs/03-implementation/changes/CH-012-resident-negative-gates/spec.md
 *
 * Description:
 *   ⛔ DO NOT "FIX" THIS FILE. The import below is deliberately illegal.
 *
 *   `audit-trail` -> `core-model` is one of three deliberate ❌ cells in the
 *   matrix (eslint.config.mjs:75-78 states why: an audit trail that depends on
 *   domain shape needs editing every time an entity is added). This file exists
 *   so that `npm run lint:negative` can prove the rule still fires.
 *
 *   Why it lives here rather than in a test directory: boundaries classifies by
 *   PATH. Outside `apps/api/src/audit-trail/**` it belongs to no zone and the
 *   rule has nothing to say about it. The fixture has to really be in the scope
 *   it violates.
 *
 *   ⚠️ It must NOT be named *.spec.ts or *.test.ts — eslint.config.mjs:142-147
 *   turns `boundaries/dependencies` off for those, so a fixture named that way
 *   would pass silently forever. That is the exact failure mode CH-012 exists
 *   to close, so reproducing it here would be self-defeating.
 *
 *   Excluded from `npm run lint` via --ignore-pattern and from the production
 *   build via tsconfig.build.json. Prettier still covers it: it is code in the
 *   repo, and there is no reason for it to drift in formatting.
 *
 * Created: 2026-08-09 (CH-012)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (CH-012)
 */
import { PrismaService } from '../../core-model/prisma.service';

/** Referencing the import is what makes it a dependency the rule evaluates. */
export const illegalDependency = PrismaService;
