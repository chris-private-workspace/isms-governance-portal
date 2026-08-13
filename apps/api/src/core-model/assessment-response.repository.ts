/**
 * File: apps/api/src/core-model/assessment-response.repository.ts
 * Purpose: The write path for one answer to one question of one assignment.
 * Category: core-model
 * Scope: Phase W09 (M1 slice 6)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 (02a:333)
 *
 * Description:
 *   Ninth consumer of the scoped-client shape, and the one whose cost is worth
 *   stating before anybody measures it in production.
 *
 *   **Every answer takes a reference code.** §1.1 grants no exemption, and the
 *   one documented exemption in this codebase (User, 02a:286-292) is a per-field
 *   justification somebody wrote down — not a convenience somebody took. So a
 *   40-question submission makes 40 round trips through `ref_code_counters`,
 *   which W04 made a per-entity serialisation point. That is a real cost of
 *   building to the specification, and it is recorded rather than dodged.
 *
 *   ⛔ `questionId` is checked by nothing. It is a key into the template's
 *   `definition` document, and 02a specifies no questions table for it to point
 *   at, so an answer to a question that was never asked inserts cleanly. Not
 *   validated here either: this repository cannot read templates (see
 *   ScopedAssessmentResponseClient), and validating against a structure 02a never
 *   specified would be enforcing a guess.
 *
 * Key Components:
 *   - AssessmentResponseRepository.list(): this entity's answers
 *   - AssessmentResponseRepository.create(): validate -> catalog -> refCode -> insert
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W09) — the answer half of the engine
 *
 * Related:
 *   - apps/api/src/core-model/assessment-template.repository.ts — why definition is opaque
 */
import { Injectable } from '@nestjs/common';
import type { AssessmentResponse } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedAssessmentResponseClient } from './scoped-client.types';

const ENTITY_TYPE = 'assessment_response';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'ASRP';

export interface CreateAssessmentResponseInput {
  readonly orgEntityId: string;

  /**
   * The assignment being answered. Guarded by the composite foreign key, which
   * gives the identical error for another entity's instance and for one that does
   * not exist.
   */
  readonly instanceId: string;

  /** ⛔ A key into the template definition, not a foreign key. See the file header. */
  readonly questionId: string;

  /**
   * 02a:333 names the column and no type. The three question types (02a:327) have
   * a boolean-ish, a number and a string as answers, so this stays JSON rather
   * than becoming three nullable columns of which two are always empty.
   */
  readonly answer: unknown;

  /**
   * Optional (02a:333). ⚠️ Must belong to the same entity — the composite foreign
   * key `assessment_responses_evidence_id_org_entity_id_fkey` refuses otherwise,
   * using the anchor W09 added to `evidence`.
   */
  readonly evidenceId?: string | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class AssessmentResponseRepository {
  /** This entity's answers only; no widening. */
  async list(client: ScopedAssessmentResponseClient): Promise<AssessmentResponse[]> {
    return client.assessmentResponse.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    client: ScopedAssessmentResponseClient,
    input: CreateAssessmentResponseInput,
  ): Promise<AssessmentResponse> {
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

      return await client.assessmentResponse.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          instanceId: input.instanceId,
          questionId: input.questionId,
          answer: input.answer as object,
          evidenceId: input.evidenceId ?? null,
          extensions: extensions as object,
        },
      });
    } catch (error) {
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // ⚠️ ONE error for the instance and the evidence alike. Naming which of the
      // two was unreachable would tell a caller that the other one WAS reachable,
      // which is the oracle by instalments.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('instance');
      }
      throw error;
    }
  }
}
