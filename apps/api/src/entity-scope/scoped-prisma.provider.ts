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
 *   ⭐ W12 adds a THIRD statement to that transaction: the audit row. It is built
 *   through contracts/audit-hook.ts rather than by calling audit-trail, because
 *   the matrix forbids this scope from importing it (eslint.config.mjs:74) —
 *   ADR-0004's "the interception point is inside this extension" holds, but only
 *   through a contract it never mentioned.
 *
 * Key Components:
 *   - runScoped(): the wrapper, extracted so its ordering is unit-testable
 *   - ScopedPrismaFactory.forScope(): EntityScope -> a client that carries it
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Enlist the audit row in the same transaction (W12) — via a contract
 *   - 2026-08-09: Initial creation (Phase W02) — the load-bearing extension
 *
 * Related:
 *   - docs/14-adr/0001-backend-framework.md:103-105 · §可證偽條件 #1
 *   - apps/api/prisma/migrations/20260809171812_entity_scope_fail_closed
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AUDIT_HOOK, type AuditHook, type AuditLogWriter } from '../contracts/audit-hook';
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
  audit: () => unknown | null = () => null,
): Promise<unknown> {
  // Before operation(), deliberately: nothing may reach the database without a
  // scope, not even to be refused there.
  if (entityIds.length === 0) {
    throw new EntityScopeError(EMPTY_SCOPE_MESSAGE);
  }

  // ⭐ W12: called BEFORE the write is built, and allowed to throw. A write that
  // cannot be attributed to an entity does not happen — the same stance as the
  // guard above, applied to auditing rather than to scoping.
  const auditEntry = audit();

  // TRUE = transaction-local. The value is gone at COMMIT, so a pooled
  // connection never carries one request's scope into the next (measured: the
  // setting reads back as '' afterwards, and '' is what the migration turned
  // from a silent empty result into an error).
  const steps: unknown[] = [
    carrier.$executeRaw`SELECT set_config('app.entity_scope', ${entityIds.join(',')}, TRUE)`,
    operation(),
  ];

  // ⭐ Last, and in the SAME transaction. Last because strategy A's trigger takes
  // a per-entity advisory lock, and holding it across the domain write would
  // serialise more than it has to. Same transaction because 05:24 asks for "a
  // write path that no domain write can bypass": a second transaction could
  // commit the write and lose the audit row to a crash in between.
  //
  // ⚠️ This is also the ceiling on what the row can say. $transaction takes an
  // ARRAY of unstarted promises, so nothing here can read the result of the
  // write above — see audit.recorder.ts for the three consequences.
  if (auditEntry !== null) steps.push(auditEntry);

  const [, result] = await carrier.$transaction(steps);

  return result;
}

function buildScopedClient(base: PrismaClient, scope: EntityScope, hook: AuditHook | null) {
  // PrismaClient's $transaction is generic over a tuple of PrismaPromise, which
  // `unknown[]` cannot satisfy, while the extension API types query() as
  // Promise<unknown> even though it returns a PrismaPromise at runtime — which
  // is precisely why it can be enlisted. One cast, confined to this line.
  const carrier = base as unknown as ScopeCarrier;
  // The audit row is written through the UNEXTENDED client, for the same reason
  // $executeRaw above is: going back through the extension would re-enter this
  // hook and recurse.
  const writer = base as unknown as AuditLogWriter;

  return base.$extends({
    query: {
      $allOperations: ({ model, operation, args, query }) =>
        runScoped(
          carrier,
          scope.entityIds,
          () => query(args),
          () =>
            hook === null
              ? null
              : hook.intercept(writer, { model, operation, args }, { entityIds: scope.entityIds }),
        ),
    },
  });
}

/** A Prisma client that cannot issue an unscoped query. */
export type ScopedPrismaClient = ReturnType<typeof buildScopedClient>;

@Injectable()
export class ScopedPrismaFactory {
  /**
   * ⚠️ THE HOOK IS OPTIONAL, AND THAT IS A FAIL-OPEN THIS PHASE ACCEPTS RATHER
   * THAN HIDES. Required injection would be safer, and it is not available:
   * AuditModule is global (entity-scope may not import it), so it is only in
   * the graph when something has pulled it in, and every existing integration
   * suite builds a TestingModule from one module rather than from AppModule.
   * Making it required would fail eleven suites that have nothing to do with
   * auditing.
   *
   * What compensates is where the audit test builds its graph: audit.int.spec.ts
   * composes AppModule, not SoaModule, so it exercises the wiring that actually
   * ships. A missing import there is red, not silently unaudited.
   *
   * Recorded as an open item rather than resolved here — the durable fix is a
   * trigger per domain table, which cannot be unwired from TypeScript at all.
   */
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(AUDIT_HOOK) private readonly auditHook: AuditHook | null = null,
  ) {}

  /**
   * The scope is an EntityScope, not a string or an id list, and only
   * EntityScopeResolver can produce one. A caller holding a request parameter
   * has nothing it can pass here.
   */
  forScope(scope: EntityScope): ScopedPrismaClient {
    if (scope.entityIds.length === 0) {
      throw new EntityScopeError(EMPTY_SCOPE_MESSAGE);
    }
    return buildScopedClient(this.prisma.connection, scope, this.auditHook);
  }
}
