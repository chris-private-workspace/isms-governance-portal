/**
 * File: apps/api/src/entity-scope/scoped-prisma.provider.ts
 * Purpose: The only sanctioned query surface — every operation carries an entity scope.
 * Category: entity-scope
 * Scope: Phase W02 (entity-scoping spike)
 * Owner: docs/14-adr/0004-entity-scoping-enforcement.md
 *
 * Description:
 *   Wraps PrismaClient in an extension whose `$allOperations` hook enlists each
 *   operation into a transaction that first sets `app.entity_scope`. The RLS
 *   policy reads that setting, so the scope arrives with the query on the same
 *   connection rather than as a WHERE clause someone has to remember to write.
 *
 *   Two things about this shape were measured on 2026-08-09 rather than assumed
 *   (both are recorded in the W02 progress notes, and both would have passed a
 *   green test suite while being wrong):
 *
 *   1. `query(args)` really does execute inside the same transaction as the
 *      set_config. 120 interleaved reads under two different scopes, at pool
 *      sizes 1 and 10, produced zero cross-scope rows. Had the operation run on
 *      a second connection, the scope would simply not have been there and the
 *      database would have refused — noisily, not silently.
 *   2. The empty-scope guard below is NOT redundant with the database. It was
 *      nearly dropped on that assumption: Day-0 measured that an unset
 *      `app.entity_scope` raises 42704, so the database appeared to fail closed
 *      for free. It only does so on a connection that has never been scoped —
 *      afterwards the parameter is left defined as '', current_setting stops
 *      raising, and the query returns zero rows. The 20260809171812 migration
 *      closed that at the database; this guard is the independent second layer,
 *      and it refuses BEFORE `operation()` is ever called.
 *
 *   ⚠️ `base.$executeRaw`, not the extended client — otherwise the set_config
 *   would itself be intercepted by this hook and recurse. Top-level
 *   `$allOperations` does intercept raw queries (measured), which is what makes
 *   `$queryRaw` through the scoped client scoped too.
 *
 * Key Components:
 *   - runScoped(): the wrapper, extracted so its ordering is unit-testable
 *   - ScopedPrismaFactory.forScope(): EntityScope -> a client that carries it
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02) — the load-bearing extension
 *
 * Related:
 *   - docs/14-adr/0001-backend-framework.md:103-105 · §可證偽條件 #1
 *   - apps/api/prisma/migrations/20260809171812_entity_scope_fail_closed
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core-model/prisma.service';
import { EntityScopeError, type EntityScope } from './entity-scope.resolver';
import type { PrismaClient } from '../generated/prisma';

/**
 * The two methods the wrapper needs. Declared structurally so the unit test can
 * substitute a recording double and assert the ordering without PostgreSQL.
 */
export interface ScopeCarrier {
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): unknown;
  $transaction(operations: unknown[]): Promise<unknown[]>;
}

const EMPTY_SCOPE_MESSAGE =
  'refusing to query with an empty entity scope — an empty scope is not "no records"';

export async function runScoped(
  carrier: ScopeCarrier,
  entityIds: readonly string[],
  operation: () => unknown,
): Promise<unknown> {
  // Before operation(), deliberately: nothing may reach the database without a
  // scope, not even to be refused there.
  if (entityIds.length === 0) {
    throw new EntityScopeError(EMPTY_SCOPE_MESSAGE);
  }

  // TRUE = transaction-local. The value is gone at COMMIT, so a pooled
  // connection never carries one request's scope into the next (measured: the
  // setting reads back as '' afterwards, and '' is what the migration turned
  // from a silent empty result into an error).
  const [, result] = await carrier.$transaction([
    carrier.$executeRaw`SELECT set_config('app.entity_scope', ${entityIds.join(',')}, TRUE)`,
    operation(),
  ]);

  return result;
}

function buildScopedClient(base: PrismaClient, scope: EntityScope) {
  // PrismaClient's $transaction is generic over a tuple of PrismaPromise, which
  // `unknown[]` cannot satisfy, while the extension API types query() as
  // Promise<unknown> even though it returns a PrismaPromise at runtime — which
  // is precisely why it can be enlisted. One cast, confined to this line.
  const carrier = base as unknown as ScopeCarrier;

  return base.$extends({
    query: {
      $allOperations: ({ args, query }) => runScoped(carrier, scope.entityIds, () => query(args)),
    },
  });
}

/** A Prisma client that cannot issue an unscoped query. */
export type ScopedPrismaClient = ReturnType<typeof buildScopedClient>;

@Injectable()
export class ScopedPrismaFactory {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The scope is an EntityScope, not a string or an id list, and only
   * EntityScopeResolver can produce one. A caller holding a request parameter
   * has nothing it can pass here.
   */
  forScope(scope: EntityScope): ScopedPrismaClient {
    if (scope.entityIds.length === 0) {
      throw new EntityScopeError(EMPTY_SCOPE_MESSAGE);
    }
    return buildScopedClient(this.prisma.connection, scope);
  }
}
