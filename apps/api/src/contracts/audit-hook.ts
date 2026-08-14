/**
 * File: apps/api/src/contracts/audit-hook.ts
 * Purpose: The interface that lets entity-scope call the audit trail without importing it.
 * Category: api (contracts)
 * Scope: Phase W12 (M3 spike, ADR-0003)
 * Owner: docs/14-adr/0003-audit-trail-hash-chain.md
 *
 * Description:
 *   ADR-0004 §Consequences says three times that the audit interception point
 *   sits inside the same client extension as entity scoping. W12 Day 0 measured
 *   that it cannot do so directly: eslint.config.mjs:74 forbids entity-scope
 *   from importing audit-trail, and :78 forbids audit-trail from importing
 *   core-model — which is where the generated Prisma client is classified. Both
 *   directions are closed, and the matrix is not negotiable: it is held in place
 *   by CH-012's standing negative fixture.
 *
 *   So the dependency is inverted through this file. Both scopes may import
 *   `api`, so entity-scope depends on the interface and audit-trail implements
 *   it, with bootstrap wiring the two. ADR-0004's claim survives intact — the
 *   interception really does happen inside the extension — but it never
 *   mentioned that a contract layer is required to get there, which is why
 *   ADR-0003 says so explicitly.
 *
 *   ⚠️ NOTHING IS IMPORTED HERE, AND NOTHING CAN BE. `api` is a leaf in the
 *   matrix (api -> ['api']), so a Prisma type cannot be named in this file. The
 *   writer below is therefore declared STRUCTURALLY — the W03 ruling recorded as
 *   AD-ScopedClientDI-1, applied one scope over.
 *
 * Key Components:
 *   - AuditHook: what entity-scope calls; returns a promise to enlist, or null
 *   - AuditLogWriter: the one table method the implementation needs, structurally
 *   - AUDIT_HOOK: the DI token, since neither side may name the other's class
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W12) — the inversion Day 0 forced
 *
 * Related:
 *   - eslint.config.mjs:70-83 — the matrix this file exists to satisfy
 *   - docs/rules-on-demand/scope-boundaries.md §允許 / 禁止的 import 矩陣
 */

/**
 * The audit_log write surface, declared as a shape rather than imported.
 *
 * ⚠️ The return type is `unknown` on purpose and it is load-bearing: at runtime
 * this is a PrismaPromise, which is what allows the caller to enlist it in the
 * SAME transaction as the domain write. Typing it as Promise would be more
 * comfortable and would lose the property the whole design rests on — a Promise
 * has already started, a PrismaPromise has not.
 */
export interface AuditLogWriter {
  readonly auditLog: {
    create(args: { data: Record<string, unknown> }): unknown;
  };
}

/** The domain write being intercepted, as the client extension sees it. */
export interface AuditWrite {
  /** Prisma model name, e.g. `StatementOfApplicability`. Absent for raw queries. */
  readonly model: string | undefined;
  /** Prisma operation name, e.g. `create`, `findMany`. */
  readonly operation: string;
  /** The operation's arguments, unread by this layer. */
  readonly args: unknown;
}

/** What the caller knows about who is asking. */
export interface AuditContext {
  /** The entity scope in force, exactly as the RLS policy will see it. */
  readonly entityIds: readonly string[];
}

export interface AuditHook {
  /**
   * Build the audit row for a write, or return null if this operation records
   * nothing (reads, and models not yet connected).
   *
   * ⛔ MUST NOT AWAIT. The returned value is enlisted in the caller's
   * transaction alongside the domain write, so it has to be an unstarted
   * promise. Awaiting here would put the audit row in its own transaction, and a
   * crash between the two would lose it — which is the one thing 05:24's "a
   * write path that no domain write can bypass" forbids.
   *
   * ⛔ THROWING IS A SUPPORTED OUTCOME, not a failure to handle. If a write
   * cannot be audited, the write must not happen; refusing here is what makes
   * that true rather than aspirational.
   */
  intercept(writer: AuditLogWriter, write: AuditWrite, context: AuditContext): unknown | null;
}

/**
 * DI token. A symbol rather than a string so two providers cannot collide
 * silently, and declared here because neither scope is allowed to name the
 * other's class.
 */
export const AUDIT_HOOK = Symbol('AUDIT_HOOK');
