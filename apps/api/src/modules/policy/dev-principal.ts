/**
 * File: apps/api/src/modules/policy/dev-principal.ts
 * Purpose: A DEV-ONLY stand-in for the credential M4 will supply. Refuses to exist in production.
 * Category: modules
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0007-identity-provider.md (what replaces this)
 *
 * Description:
 *   CLAUDE.md 約束 8 鐵律 3: an entity scope may come ONLY from a credential or
 *   session, never from a request parameter. Identity is M4, so today there is
 *   no lawful source — and inventing one that reads a header would be exactly
 *   the violation the rule names.
 *
 *   This file is the honest alternative: a hard-coded assignment that is
 *   obviously not a credential, announced at startup, marked in every response,
 *   and unable to load in production at all.
 *
 *   verification-discipline.md §Mock 的誠實原則 asks for three things and this
 *   provides all three:
 *     1. a startup warning — assertDevPrincipalAllowed() logs on every boot
 *     2. a marker on the result — the controller attaches `_devPrincipal`
 *     3. no leak into the production path — NODE_ENV=production THROWS here
 *
 *   ⚠️ That third one is why this is a function and not a constant. A constant
 *   would be evaluated at import time in every environment; the throw has to
 *   happen where someone can see it, on the request path and at boot, not as an
 *   obscure module-load failure.
 *
 *   ⚠️ It is also why the marker is not optional. CH-012 measured what happens
 *   when a mock marker is added and tested but does not actually fire for one
 *   whole class of case: the passing test certified the gap.
 *
 * Key Components:
 *   - assertDevPrincipalAllowed(): the production guard + the startup warning
 *   - devPrincipal(): the assignment EntityScopeResolver will accept
 *   - DEV_PRINCIPAL_MARKER: what every response carries so nobody reads it as real
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W03) — removed by M4, not extended
 *
 * Related:
 *   - .claude/rules/verification-discipline.md §Mock 的誠實原則
 *   - apps/api/src/entity-scope/entity-scope.resolver.ts — PrincipalAssignment
 */
import { Logger } from '@nestjs/common';
import type { PrincipalAssignment } from '../../entity-scope/entity-scope.resolver';

const logger = new Logger('DevPrincipal');

/** Attached to every response served under the stub, so no reader mistakes it for real. */
export const DEV_PRINCIPAL_MARKER = {
  _devPrincipal: true,
  _warning:
    'Entity scope came from a hard-coded development principal, NOT from a credential. Identity arrives at M4 (ADR-0007).',
} as const;

export class DevPrincipalInProductionError extends Error {
  constructor() {
    super(
      'dev-principal was reached with NODE_ENV=production. Entity scope must come from a credential (CLAUDE.md 約束 8 鐵律 3); this stub is a development affordance and must be removed at M4.',
    );
    this.name = 'DevPrincipalInProductionError';
  }
}

/**
 * Call at startup AND on every use. Cheap, and it means the guard cannot be
 * bypassed by a code path that skipped bootstrap.
 */
export function assertDevPrincipalAllowed(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new DevPrincipalInProductionError();
  }
}

/** Logged once at boot so a running server never silently looks authenticated. */
export function warnDevPrincipalActive(): void {
  assertDevPrincipalAllowed();
  logger.warn(
    `DEV PRINCIPAL ACTIVE — /policies is scoped by a hard-coded assignment (${entityCodes().join(', ')}), not by any credential. This must not reach a deployed environment.`,
  );
}

function entityCodes(): string[] {
  // Overridable so a developer can look at another entity, or at a subtree,
  // without editing source. It is still not a credential and the marker still says so.
  const raw = process.env.DEV_PRINCIPAL_ENTITIES?.trim();
  return raw ? raw.split(',').map((c) => c.trim()) : ['SG1'];
}

export function devPrincipal(): PrincipalAssignment {
  assertDevPrincipalAllowed();
  return {
    subjectId: 'dev-principal',
    assignedEntityCodes: entityCodes(),
    rollUp: process.env.DEV_PRINCIPAL_ROLLUP === 'true',
  };
}
