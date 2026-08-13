/**
 * File: apps/api/src/core-model/assessment-instance.repository.ts
 * Purpose: The write path for an assessment assignment — template, subject, period, duties.
 * Category: core-model
 * Scope: Phase W09 (M1 slice 6)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §4 · docs/02-architecture/05-...md §Shared assessment engine
 *
 * Description:
 *   Eighth consumer of the scoped-client shape, and the first whose input type is
 *   narrower than its table on purpose.
 *
 *   **`templateVersion` is not accepted.** 02a:330 puts it on the row so later
 *   edits to a template cannot silently rewrite what an assignment was answered
 *   against — which only holds if it is a snapshot of truth. A caller-supplied
 *   integer is an assertion wearing the word "snapshot". A BEFORE INSERT trigger
 *   fills it from the referenced template under the caller's own RLS, so this
 *   file neither reads templates nor trusts the caller. Measured on 2026-08-13:
 *   an insert claiming version 99 against a version-1 template stores 1.
 *
 *   **Segregation of duties is a CHECK, not an `if`.** guardrail 6 makes it a
 *   platform obligation, and 02a:336 states it: the reviewer must not be the
 *   assignee. Enforcing it here as well would produce a friendlier message and a
 *   second place to forget — the database refuses it on every write path,
 *   including UPDATEs this repository does not have.
 *
 *   ⛔ Half of 05:47's rule is NOT enforced anywhere: "for vendor audits the
 *   auditor must be independent of the relationship manager" needs a `vendors`
 *   table, which 02a:59 puts in Wave 2.
 *
 * Key Components:
 *   - AssessmentInstanceRepository.list(): this entity's assignments
 *   - AssessmentInstanceRepository.create(): validate -> catalog -> refCode -> insert
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W09) — the assignment half of the engine
 *
 * Related:
 *   - apps/api/prisma/migrations/20260813033104_assessment_template_version_snapshot/migration.sql
 *   - apps/api/src/core-model/action.repository.ts — the composite-key parent guard
 */
import { Injectable } from '@nestjs/common';
import type { AssessmentInstance, AssessmentSubjectType } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isCheckViolation,
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedAssessmentInstanceClient } from './scoped-client.types';

const ENTITY_TYPE = 'assessment_instance';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'ASIN';

export interface CreateAssessmentInstanceInput {
  readonly orgEntityId: string;

  /**
   * The question set being assigned. Guarded by the composite foreign key, which
   * refuses another entity's template with the same error it gives for a template
   * that does not exist — that identity is what keeps the pair from answering
   * "does this id exist elsewhere?" (約束 8).
   */
  readonly templateId: string;

  /**
   * ⛔ NO `templateVersion` field, deliberately. See the file header: the database
   * takes the snapshot, so there is nothing here for a caller to get wrong or to
   * forge.
   */

  /**
   * What is being assessed (02a:330).
   *
   * ⚠️ Unchecked at every layer. The subject is polymorphic across four tables, of
   * which `vendors` does not exist yet, so there is no foreign key and no lookup —
   * the Evidence.linkedId shape, for the reason its docstring gives.
   */
  readonly subjectType: AssessmentSubjectType;
  readonly subjectId: string;

  readonly period: Date;

  readonly assigneeUserId?: string | undefined;

  /**
   * ⚠️ Must differ from `assigneeUserId` when both are present — enforced by the
   * `assessment_instances_sod` CHECK, not by this file.
   */
  readonly reviewerUserId?: string | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Raised when the SoD CHECK refuses the row.
 *
 * ⚠️ Deliberately NOT collapsed into a 404 the way ScopeRefusedError and
 * UnknownReferenceError are. Those two hide whether an id exists, because saying
 * so is the oracle 約束 8 forbids. This one hides nothing: the caller supplied
 * both user ids and is being told that a rule it can read forbids that pairing.
 * A silent 404 here would be the platform refusing to explain a control it
 * exists to enforce (guardrail 6).
 */
export class SegregationOfDutiesError extends Error {
  constructor() {
    super('reviewer must not be the assignee');
    this.name = 'SegregationOfDutiesError';
  }
}

@Injectable()
export class AssessmentInstanceRepository {
  /** This entity's assignments only; no widening (the template repository's reasoning). */
  async list(client: ScopedAssessmentInstanceClient): Promise<AssessmentInstance[]> {
    return client.assessmentInstance.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    client: ScopedAssessmentInstanceClient,
    input: CreateAssessmentInstanceInput,
  ): Promise<AssessmentInstance> {
    const extensions = input.extensions ?? {};

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

      return await client.assessmentInstance.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          templateId: input.templateId,
          // Present only because Prisma requires the column; the BEFORE INSERT
          // trigger overwrites it unconditionally. 0 is the value the trigger
          // itself leaves behind when the template is unreachable, so writing it
          // here means this file never states a version it did not observe.
          templateVersion: 0,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          period: input.period,
          assigneeUserId: input.assigneeUserId ?? null,
          reviewerUserId: input.reviewerUserId ?? null,
          extensions: extensions as object,
          // status defaults to `scheduled` — every other value in §4 is reached by
          // a transition this slice does not have.
        },
      });
    } catch (error) {
      // First, because it is the only one of the three that is safe to explain.
      // `assessment_instances` has exactly one CHECK — see isCheckViolation for
      // what a second one would break.
      if (isCheckViolation(error)) {
        throw new SegregationOfDutiesError();
      }
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // In scope, but named a template or a person it cannot reach. ⚠️ ONE error
      // for both: distinguishing "another entity's template" from "no such
      // template" is the oracle 約束 8 forbids.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('template');
      }
      throw error;
    }
  }
}
