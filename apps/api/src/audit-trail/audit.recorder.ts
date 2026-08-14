/**
 * File: apps/api/src/audit-trail/audit.recorder.ts
 * Purpose: Turn an intercepted domain write into an audit row enlisted in the same transaction.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 * Owner: docs/14-adr/0003-audit-trail-hash-chain.md
 *
 * Description:
 *   Implements contracts/audit-hook.ts. The client extension in entity-scope
 *   already wraps every operation in a transaction that sets app.entity_scope;
 *   this adds one more statement to that transaction, so the audit row and the
 *   domain write commit together or not at all.
 *
 *   ⭐ FAIL-CLOSED, DELIBERATELY. If the entity a write belongs to cannot be
 *   determined, this throws and the write never reaches the database. That
 *   mirrors the empty-scope guard next door — "nothing may reach the database
 *   without a scope, not even to be refused there" — applied to auditing: a
 *   write that cannot be audited does not happen.
 *
 *   ⛔ WHAT THIS CANNOT DO, MEASURED RATHER THAN GUESSED. runScoped hands
 *   $transaction an ARRAY of unstarted promises, so every value in the audit row
 *   must be computable BEFORE the domain write runs. Three consequences follow,
 *   and all three are ADR-0003 inputs rather than defects to patch here:
 *
 *     1. `before` is always NULL. Reading the prior state would need a query
 *        whose result this layer never sees.
 *     2. `after` is the payload as REQUESTED, not the row as stored. Defaults,
 *        triggers and database-side generation are not reflected.
 *     3. `resource_id` is unavailable for a create, because Prisma assigns the
 *        id after this point. A reference code is used when the caller supplied
 *        one, and null otherwise.
 *
 *   The single statement that WOULD capture true before/after is an
 *   `INSERT ... SELECT` naming the domain table — and that is precisely what
 *   eslint.config.mjs:75-77 forbids this scope, on the stated grounds that an
 *   audit trail depending on domain shape needs editing whenever an entity is
 *   added. The boundary rule predicted this limit before it was hit. What
 *   resolves it is a trigger on each domain table, which sees OLD and NEW for
 *   free — the same move strategy A makes for the chain.
 *
 * Key Components:
 *   - AuditLogRecorder: the AuditHook implementation
 *   - WRITE_OPERATIONS: which Prisma operations produce an audit row
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W12) — one module connected, on purpose
 *
 * Related:
 *   - apps/api/src/contracts/audit-hook.ts — the interface and why it exists
 *   - apps/api/src/entity-scope/scoped-prisma.provider.ts — the caller
 */
import {
  type AuditContext,
  type AuditHook,
  type AuditLogWriter,
  type AuditWrite,
} from '../contracts/audit-hook';
import { GENESIS_HASH, contentHash, type AuditRowContent } from './chain';

/**
 * Which strategy fills the hash columns — the choice ADR-0003 exists to make.
 *
 * `db-trigger` (A) leaves them to audit_log_chain(), which takes a per-entity
 * advisory lock, reads the previous row and hashes in PL/pgSQL.
 *
 * `app-chain` (B) computes the content hash here and writes it with the row, so
 * the database does no extra work — at the cost of no per-row link, which is
 * what the periodic anchors exist to make up for.
 *
 * ⚠️ Both are REAL write paths, not benchmark scaffolding. Measuring B by
 * simulating it in a test would measure the simulation.
 */
export type ChainMode = 'db-trigger' | 'app-chain';

/**
 * The operations that change something. Reads are absent rather than filtered
 * later, so adding a Prisma operation does not silently start auditing it.
 *
 * ⚠️ `findMany` and friends are NOT here even though guardrail 4 wants roll-up
 * READS audited (multi-tenant-data.md:161). Auditing every read on every model
 * is a different cost profile and a different decision; there is no roll-up
 * endpoint to audit until M8, and building the switch now would be AP-5.
 */
const WRITE_OPERATIONS: ReadonlySet<string> = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'upsert',
  'delete',
  'deleteMany',
]);

export class UnattributableWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnattributableWriteError';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export class AuditLogRecorder implements AuditHook {
  /**
   * @param auditedModels Prisma model names to audit. ⚠️ An allowlist, and W12
   *   deliberately puts exactly one name in it. The phase's job is to produce
   *   numbers from a real write path, not to connect eleven modules before
   *   ADR-0003 has chosen a strategy — connecting them is the next phase and it
   *   is a wiring change, not a redesign. The list is passed in rather than
   *   hard-coded here so the neutralisation in Day 3 can empty it.
   */
  constructor(
    private readonly auditedModels: ReadonlySet<string>,
    private readonly mode: ChainMode = 'db-trigger',
    private readonly clock: () => Date = () => new Date(),
  ) {}

  intercept(writer: AuditLogWriter, write: AuditWrite, context: AuditContext): unknown | null {
    // ⚠️ A raw query has no model and is therefore NOT audited. That is a real
    // hole and it is named rather than hidden: $queryRaw through the scoped
    // client is scoped (W02 measured it) but invisible here. Closing it needs
    // statement parsing, which is a worse cure than the disease at this stage.
    if (write.model === undefined) return null;
    if (!this.auditedModels.has(write.model)) return null;
    if (!WRITE_OPERATIONS.has(write.operation)) return null;

    const args = asRecord(write.args);
    const data = asRecord(args?.['data']);
    const where = asRecord(args?.['where']);

    const row = {
      orgEntityId: this.resolveEntity(data, context, write),
      actorId: null,
      actorScope: context.entityIds.join(','),
      operation: `${write.model}.${write.operation}`,
      resourceType: write.model,
      resourceId: this.resolveResource(data, where),
      accessAllowed: true,
      attemptedEntity: null,
      before: null,
      after: data,
    };

    return writer.auditLog.create({
      data: {
        ...this.chainColumns(row),
        // ⛔ `before` and `after` are OMITTED rather than set to null, and this
        // is not a style preference — it is what makes the row verifiable.
        // Passing null to a Json? field stores JSON null, which is a VALUE:
        // `before::text` reads back as the four characters `null` and the hash
        // covers them. Read back through Prisma, JSON null and SQL NULL are both
        // `null` in JavaScript, so verify cannot tell which one the row holds
        // and recomputes the wrong bytes. Measured, W12 Day 2: the first
        // integration run reported every row broken at the first row.
        //
        // Omitting the key leaves the column at SQL NULL. The database also
        // refuses the ambiguous state outright — see audit_log_before_not_json_
        // null in the migration — so this is belt and braces on purpose: one
        // writer forgetting would otherwise silently un-verify a chain.
        ...(data === null ? {} : { after: data }),
        orgEntityId: row.orgEntityId,
        // Null until M4 supplies an identity model. A placeholder user id here
        // would answer "who did this" with a lie, which is worse than an
        // unanswered question on a table auditors read.
        actorId: row.actorId,
        // What the caller was authorised to reach at the time — the part of
        // "source context" that is available, and the part roll-up
        // accountability needs (multi-tenant-data.md:161).
        actorScope: row.actorScope,
        operation: row.operation,
        resourceType: row.resourceType,
        resourceId: row.resourceId,
        // Always true here: this hook only ever runs on a write the scope
        // resolver already admitted. Refusals are recorded by a path that does
        // not exist yet — see the model docstring.
        accessAllowed: row.accessAllowed,
        attemptedEntity: row.attemptedEntity,
        // `before` is absent from this object entirely — see the note above. This
        // layer cannot read prior state, so the column stays SQL NULL.
      },
    });
  }

  /**
   * The columns that differ between the two strategies, and nothing else.
   *
   * ⚠️ `app-chain` has to send `occurred_at` as well, because the hash covers it
   * and the value must be the one that lands in the row — the column default
   * would be assigned by PostgreSQL after this hash was computed. That makes the
   * timestamp the APPLICATION's clock rather than the database's, which is a
   * real difference and not an implementation detail: several app instances have
   * several clocks, and skew between them becomes skew in the audit trail's
   * ordering. Strategy A has one clock by construction. ADR-0003 says so.
   */
  private chainColumns(row: Omit<AuditRowContent, 'occurredAt'>): Record<string, unknown> {
    // A: the BEFORE INSERT trigger fills both columns. Sending values here would
    // be pointless — it overwrites them — and misleading to read.
    if (this.mode === 'db-trigger') return {};

    const occurredAt = this.clock();
    return {
      occurredAt,
      prevHash: GENESIS_HASH,
      rowHash: contentHash({ ...row, occurredAt }),
    };
  }

  /**
   * Which entity the audit row belongs to.
   *
   * The payload wins when it carries one, because that is the row being written.
   * A single-entity scope is unambiguous, so it stands in. Anything else throws:
   * guessing between two entities would file the evidence under the wrong one,
   * and an audit trail that is confidently wrong is worse than a missing row.
   */
  private resolveEntity(
    data: Record<string, unknown> | null,
    context: AuditContext,
    write: AuditWrite,
  ): string {
    const fromPayload = asString(data?.['orgEntityId']);
    if (fromPayload !== null) return fromPayload;

    const [only] = context.entityIds;
    if (context.entityIds.length === 1 && only !== undefined) return only;

    throw new UnattributableWriteError(
      `refusing ${write.model}.${write.operation}: no org_entity_id in the payload and ` +
        `the scope names ${context.entityIds.length} entities, so the audit row would guess`,
    );
  }

  /**
   * ⚠️ Null for a create, and that is not an oversight — Prisma assigns the id
   * after this point. A server-issued reference code is used where the caller
   * has one, which covers every module in this repo, but it is a convention and
   * not a guarantee.
   */
  private resolveResource(
    data: Record<string, unknown> | null,
    where: Record<string, unknown> | null,
  ): string | null {
    return asString(where?.['id']) ?? asString(data?.['id']) ?? asString(data?.['refCode']);
  }
}
