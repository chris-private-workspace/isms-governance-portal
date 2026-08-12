/**
 * File: apps/api/src/core-model/control-test.repository.ts
 * Purpose: The control-test write path — the first child whose parent reference no
 *   foreign key can secure.
 * Category: core-model
 * Scope: Phase W07 (M1 slice 4)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §5.1
 *
 * Description:
 *   Fourth consumer of the scoped-client shape. The write order is unchanged from
 *   W05/W06 — validate -> catalog -> issueRefCode -> insert -> translate — and is
 *   not re-argued here. Two things are new.
 *
 *   1. **The parent guard is a trigger, and this file must not duplicate it.**
 *      Every earlier child closed cross-entity references with a composite foreign
 *      key. `controls` refuses the anchor that needs, so W07 Day 1 measured what a
 *      plain key leaves open: the referential-integrity check is not subject to
 *      RLS, and an entity could name a control it cannot read. A BEFORE INSERT OR
 *      UPDATE trigger running SECURITY INVOKER closes it, raising 23503 for an
 *      unreadable parent and an absent one alike. Nothing here checks the control
 *      first — doing so is exactly the oracle 約束 8 forbids, and
 *      ScopedControlTestClient is deliberately unable to express it.
 *
 *   2. **The input carries no lifecycle.** `status` is absent for the reason W06's
 *      `effectiveness` is: 02a §4 moves a test through Scheduled -> InProgress ->
 *      Passed | Partial | Failed, and 02a:416 puts the segregation-of-duties check
 *      on the review transition. That transition does not exist in this slice, so
 *      accepting a terminal state here would let the tester record its own pass
 *      with no reviewer — the platform asserting a governance claim it was never
 *      given (guardrail 1). `performed_at`, `reviewer_user_id` and `conclusion`
 *      are absent for the same reason: they describe a test that has run, and
 *      running one is the transition's job.
 *
 *      ⚠️ This is a real product gap, not an implementation detail. This slice
 *      delivers SCHEDULING a control test, not performing one.
 *
 * Key Components:
 *   - ControlTestRepository.list(): this entity's tests; no widening, unlike controls
 *   - ControlTestRepository.create(): validate -> catalog -> issueRefCode -> insert
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07) — trigger-guarded parent reference
 *
 * Related:
 *   - apps/api/src/core-model/control.repository.ts — the shape being copied
 *   - apps/api/prisma/migrations/20260812055744_control_test_and_evidence/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { ControlTest } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedControlTestClient } from './scoped-client.types';

const ENTITY_TYPE = 'control_test';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'CTST';

export interface CreateControlTestInput {
  /**
   * Which entity the test belongs to. RLS decides whether that was allowed; there
   * is no check here (約束 8: scope travels with the connection, not the argument).
   */
  readonly orgEntityId: string;

  /**
   * The control under test (02a:410 — N:1, required).
   *
   * ⚠️ May legitimately name a control this entity does not OWN: a group-shared
   * control is readable group-wide (ADR-0014), and each OpCo testing the group
   * password standard at its own site is the point of publishing one. What it may
   * not name is another entity's private control, and the database decides that.
   */
  readonly controlId: string;

  /** When the test is due. Absent means unscheduled, which is a fact, not a gap. */
  readonly scheduledFor?: Date | undefined;

  readonly testerUserId?: string | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class ControlTestRepository {
  /**
   * This entity's tests only.
   *
   * ⚠️ No group widening, unlike ControlRepository.list(). A group-shared control
   * is a library entry everyone may consult; a test OF it happened at one entity
   * and belongs to that entity's record. Reading another OpCo's results is a
   * roll-up question, and roll-up is an authorised scope expansion rather than a
   * property of the row. The read policy says the same thing; this method simply
   * does not contradict it.
   */
  async list(client: ScopedControlTestClient): Promise<ControlTest[]> {
    return client.controlTest.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    client: ScopedControlTestClient,
    input: CreateControlTestInput,
  ): Promise<ControlTest> {
    const extensions = input.extensions ?? {};

    // Validate before allocating a number: a rejected payload should not consume
    // a reference code (policy.repository.ts records the reasoning).
    const catalog = await client.extensionField.findMany({
      where: { entityType: ENTITY_TYPE, retiredAt: null },
    });
    validateExtensions(extensions, catalog);

    try {
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: ENTITY_TYPE,
        prefix: REF_CODE_PREFIX,
      });

      return await client.controlTest.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          controlId: input.controlId,
          scheduledFor: input.scheduledFor ?? null,
          testerUserId: input.testerUserId ?? null,
          extensions: extensions as object,
          // status / performed_at / reviewer_user_id / conclusion are absent on
          // purpose — see the file header. created_by / updated_by stay NULL
          // until M4 supplies a credential.
        },
      });
    } catch (error) {
      // The row's own entity was out of scope: RLS refused, at the counter or at
      // the insert.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // The row was in scope but named a control or a user it cannot reach.
      // Which of the two is not disclosed, for the reason risk.repository.ts
      // records: naming the constraint would answer "does this id exist
      // elsewhere?" by omission.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('control or tester');
      }
      throw error;
    }
  }
}
