/**
 * File: apps/api/src/entity-scope/entity-scope.resolver.ts
 * Purpose: Turns a principal's role assignment into the entity ids it may reach.
 * Category: entity-scope
 * Scope: Phase W02 (entity-scoping spike)
 * Owner: docs/rules-on-demand/multi-tenant-data.md §滾升
 *
 * Description:
 *   Resolution has two shapes and no third. Without roll-up a principal sees
 *   exactly the entities named in its assignment. With roll-up it sees those
 *   entities plus their descendants, found by prefix-matching the materialised
 *   `path` column — which is why 02a:146 specified that column at all: a
 *   recursive CTE inside an RLS policy would run per row.
 *
 *   What it never does is `if role == 'regional_iso': return all()`
 *   (multi-tenant-data.md:145). A regional role is a subtree root, not a
 *   bypass; an APAC assignment and a global one differ by which rows come back,
 *   not by whether filtering happens.
 *
 *   EntityScope is branded with a symbol this module does not export, so no
 *   other file can produce one from an object literal. That makes 鐵律 3 —
 *   scope comes from credentials, never from a request parameter — a compile
 *   error rather than a review comment: a query string cannot be cast into a
 *   brand it has no name for.
 *
 * Key Components:
 *   - EntityScope: the branded, resolver-only capability the scoped client takes
 *   - PrincipalAssignment: what an identity provider will supply from M4 on
 *   - EntityScopeResolver.resolve(): assignment -> scope, or throws
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02) — subtree resolution + brand
 *
 * Related:
 *   - docs/02-architecture/02a-data-model-spec.md §146 (materialised path)
 *   - docs/rules-on-demand/multi-tenant-data.md:144-149 (the three roll-up conditions)
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core-model/prisma.service';

// Not exported. Its absence elsewhere is the enforcement: a module that cannot
// name this symbol cannot construct a value of type EntityScope.
declare const entityScopeBrand: unique symbol;

/** An authorised set of entity ids. Only EntityScopeResolver can mint one. */
export interface EntityScope {
  readonly [entityScopeBrand]: 'entity-scope';
  /** Every entity this principal may read or write. Never empty. */
  readonly entityIds: readonly string[];
  /** The assignment roots, kept for audit: "who saw what, under which grant". */
  readonly rootCodes: readonly string[];
  readonly rollUp: boolean;
}

/**
 * What an authenticated principal was granted.
 *
 * ⚠️ There is no identity provider yet (M4 / ADR-0002). Today the only callers
 * that construct this are tests. It is deliberately NOT wired to a request:
 * a stand-in that read HTTP would be indistinguishable from the real thing at
 * a glance, and AP-6 is about exactly that resemblance. When Entra ID lands,
 * this is built from token claims and nothing else changes.
 */
export interface PrincipalAssignment {
  readonly subjectId: string;
  readonly assignedEntityCodes: readonly string[];
  /** Whether the grant extends to descendants — a subtree, never "everything". */
  readonly rollUp: boolean;
}

/**
 * The one place an EntityScope comes into existence. The parameter type still
 * checks the shape; only the brand is asserted, and only here. TypeScript
 * rejecting the direct cast is the mechanism working, not an obstacle to it.
 */
const mintScope = (fields: Omit<EntityScope, typeof entityScopeBrand>): EntityScope =>
  fields as unknown as EntityScope;

/** Distinguishable on purpose: callers must tell "denied" from "nothing there". */
export class EntityScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EntityScopeError';
  }
}

@Injectable()
export class EntityScopeResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(assignment: PrincipalAssignment): Promise<EntityScope> {
    const codes = [...new Set(assignment.assignedEntityCodes)];
    if (codes.length === 0) {
      throw new EntityScopeError(
        `principal ${assignment.subjectId} has no entity assignment — refusing to resolve an empty scope`,
      );
    }

    // org_entities carries no org_entity_id and no RLS policy: it *defines*
    // scope, so filtering it by scope would make the hierarchy unresolvable.
    // multi-tenant-data.md:61 lists it as a legitimate global table, and the
    // migration grants only SELECT on it. Reading organisational structure is
    // not reading another entity's business records.
    const roots = await this.prisma.connection.orgEntity.findMany({
      where: { code: { in: codes }, retiredAt: null },
      select: { id: true, code: true, path: true },
    });

    if (roots.length !== codes.length) {
      const found = new Set(roots.map((r) => r.code));
      const missing = codes.filter((c) => !found.has(c));
      // Refuse the whole assignment rather than silently resolving the part
      // that happened to exist — a typo'd code must not quietly narrow scope.
      throw new EntityScopeError(`unknown or retired org entity code(s): ${missing.join(', ')}`);
    }

    const entityIds = assignment.rollUp
      ? await this.expandSubtrees(roots.map((r) => r.path))
      : roots.map((r) => r.id);

    if (entityIds.length === 0) {
      throw new EntityScopeError(
        `principal ${assignment.subjectId} resolved to zero entities — refusing to issue an empty scope`,
      );
    }

    return mintScope({ entityIds, rootCodes: codes, rollUp: assignment.rollUp });
  }

  /** A root and its descendants: `/apac/sg` matches itself and `/apac/sg/...`. */
  private async expandSubtrees(paths: string[]): Promise<string[]> {
    const rows = await this.prisma.connection.orgEntity.findMany({
      where: {
        retiredAt: null,
        OR: paths.flatMap((path) => [{ path }, { path: { startsWith: `${path}/` } }]),
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
