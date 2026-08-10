/**
 * File: apps/api/src/core-model/ref-code.ts
 * Purpose: Issue the human-readable `<TYPE>-<ENTITY_CODE>-<seq>` reference code, atomically.
 * Category: core-model
 * Scope: Phase W04 (M1 slice 1)
 * Owner: docs/02-architecture/02a-data-model-spec.md §1.2
 *
 * Description:
 *   Every domain record carries a ref_code that humans quote (02a:103), and it
 *   is stable once issued (02a:104). Two properties follow from that, and both
 *   are enforced here rather than by convention:
 *
 *   1. THE NUMBER IS ALLOCATED BY THE DATABASE, IN ONE STATEMENT.
 *      `upsert` with `{ increment: 1 }` compiles to a single INSERT ... ON
 *      CONFLICT DO UPDATE ... RETURNING, so two concurrent callers serialise on
 *      the counter row instead of both reading the same value. A read-then-write
 *      in application code would look identical in a single-threaded test and
 *      fail under any real load — which is why W04 owes a test that ATTEMPTS a
 *      duplicate rather than one that merely runs.
 *
 *   2. THE CALLER NEVER SUPPLIES IT.
 *      A caller who can choose a ref_code can probe for another entity's
 *      records: the unique index sits beneath RLS, so a collision would answer
 *      "does POL-HK1-000007 exist?" to a principal that cannot see HK1 at all.
 *      There is no parameter here that accepts a finished code.
 *
 *   ⚠️ The counter is entity-scoped, so this function inherits the refusal for
 *   free: issuing a code for an entity outside the client's scope is refused by
 *   the same RLS policy that refuses writing that entity's records. The 42501 is
 *   translated by the caller (policy.repository.ts), not swallowed here.
 *
 * Key Components:
 *   - issueRefCode(): allocate the next number and format the code
 *   - formatRefCode(): the format itself, separated so tests can assert it
 *
 * Created: 2026-08-10 (Phase W04)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W04) — counter table, not a sequence
 *
 * Related:
 *   - prisma/migrations/20260810185500_user_and_base_fields/migration.sql
 *   - docs/01-planning/W04-m1-user-and-base-fields/plan.md §3.1 D3
 */
import type { ScopedRefCodeClient } from './scoped-client.types';

/**
 * Width of the sequence segment. Six digits matches 02a:89's `RISK-SG-000123`.
 * Numbers past 999999 are not truncated — they simply render wider, because a
 * silently wrapped reference code is worse than an ugly one.
 */
const SEQ_WIDTH = 6;

export interface IssueRefCodeInput {
  readonly orgEntityId: string;
  /**
   * The catalog key for the record type, e.g. `policy`. This is the counter's
   * partition, NOT the string that appears in the code.
   */
  readonly entityType: string;
  /**
   * The uppercase abbreviation that appears in the code, e.g. `POL`.
   *
   * ⚠️ Supplied by the caller on purpose. 02a specifies the SHAPE
   * (`<TYPE>-<ENTITY_CODE>-<seq>`) but never fixes the abbreviations — 02a:89
   * shows `RISK` while the design handoff's sample data shows `RSK` (03:110).
   * Rather than invent a registry here and make it look authoritative, each
   * repository names its own prefix and the ambiguity stays visible.
   */
  readonly prefix: string;
}

/** The format, alone. Extracted so a test can assert it without a database. */
export function formatRefCode(prefix: string, entityCode: string, seq: number): string {
  return `${prefix}-${entityCode}-${String(seq).padStart(SEQ_WIDTH, '0')}`;
}

export class UnknownOrgEntityError extends Error {
  constructor(readonly orgEntityId: string) {
    super(`no org entity ${orgEntityId} is visible for reference-code issuance`);
    this.name = 'UnknownOrgEntityError';
  }
}

/**
 * Allocate the next number for (entity, type) and render the code.
 *
 * The counter write happens FIRST. If the entity is outside the client's scope,
 * RLS refuses it here — before anything reads the entity's name — so the failure
 * path never depends on the lookup below having been skipped.
 */
export async function issueRefCode(
  client: ScopedRefCodeClient,
  input: IssueRefCodeInput,
): Promise<string> {
  const counter = await client.refCodeCounter.upsert({
    where: {
      orgEntityId_entityType: {
        orgEntityId: input.orgEntityId,
        entityType: input.entityType,
      },
    },
    create: {
      orgEntityId: input.orgEntityId,
      entityType: input.entityType,
      lastSeq: 1,
    },
    update: { lastSeq: { increment: 1 } },
  });

  // org_entities is global and readable by every principal (it defines scope, so
  // filtering it would make the hierarchy unresolvable). Reaching it here is a
  // lookup of a code the caller could already see, not a widening of scope.
  // No `select`: the declared shape says OrgEntity, and narrowing the query
  // without narrowing the type is the sort of small lie that costs an hour when
  // someone later reads a field the query never fetched. The table holds one row
  // per organisational node — a few dozen at full scope.
  const entity = await client.orgEntity.findUnique({
    where: { id: input.orgEntityId },
  });

  if (!entity) {
    throw new UnknownOrgEntityError(input.orgEntityId);
  }

  return formatRefCode(input.prefix, entity.code, counter.lastSeq);
}
