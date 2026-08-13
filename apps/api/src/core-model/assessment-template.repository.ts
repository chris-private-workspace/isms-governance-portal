/**
 * File: apps/api/src/core-model/assessment-template.repository.ts
 * Purpose: The write path for versioned question sets — the engine 05 says to build once.
 * Category: core-model
 * Scope: Phase W09 (M1 slice 6)
 * Owner: docs/02-architecture/05-platform-foundation-services.md §Shared assessment engine
 *
 * Description:
 *   Seventh consumer of the scoped-client shape. The write order is unchanged
 *   from W05-W08 — validate -> catalog -> issueRefCode -> insert -> translate —
 *   and is not re-argued here.
 *
 *   What is worth reading is `definition`. It arrives as an opaque JSON document
 *   and is stored as one. 02a specifies no AssessmentQuestion entity and gives no
 *   shape for the sections-and-questions structure, so there is nothing to
 *   validate against. A validator here would be asserting a shape this file
 *   invented, and it would read to every later caller as a guarantee — the worst
 *   of both. `extensions` on the same row IS validated, because the extension
 *   catalog declares what may appear there (ADR-0005). Nothing declares this.
 *
 *   ⚠️ The consequence, stated once so it is not discovered later: an assessment
 *   response names a question by id, and that id is a key into this document
 *   rather than a foreign key. Nothing at any layer refuses an answer to a
 *   question that was never asked.
 *
 * Key Components:
 *   - AssessmentTemplateRepository.list(): this entity's templates; no widening
 *   - AssessmentTemplateRepository.create(): validate -> catalog -> refCode -> insert
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W09) — the template half of the engine
 *
 * Related:
 *   - apps/api/src/core-model/issue.repository.ts — the shape being copied
 *   - apps/api/prisma/migrations/20260813032048_assessment_engine/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { AssessmentSubjectType, AssessmentTemplate } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedAssessmentTemplateClient } from './scoped-client.types';

const ENTITY_TYPE = 'assessment_template';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'ASTM';

export interface CreateAssessmentTemplateInput {
  /**
   * Which entity owns the question set. RLS decides whether that was allowed;
   * there is no check here (約束 8: scope travels with the connection).
   */
  readonly orgEntityId: string;

  readonly name: string;

  /** risk / control / vendor / entity (02a:326, 05:43). See the enum's docstring. */
  readonly subjectType: AssessmentSubjectType;

  /**
   * Sections and questions, as one opaque document.
   *
   * ⛔ Not validated — see the file header. The type is `unknown` rather than a
   * hand-written interface for exactly that reason: an interface here would be a
   * specification this file made up, and TypeScript would then enforce it as
   * though 02a had said so.
   */
  readonly definition: unknown;

  readonly ownerUserId?: string | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class AssessmentTemplateRepository {
  /**
   * This entity's templates only.
   *
   * ⚠️ No group widening, unlike ControlRepository.list(). 05:39 calls this engine
   * shared across three CONSUMERS — RCSA, control testing, vendor audits — and
   * that is reuse of a mechanism, not sharing of rows. A template belongs to the
   * entity that wrote it. Group-standard templates would be ADR-0014's row-level
   * shape and a deliberate migration, not a default nobody chose.
   */
  async list(client: ScopedAssessmentTemplateClient): Promise<AssessmentTemplate[]> {
    return client.assessmentTemplate.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    client: ScopedAssessmentTemplateClient,
    input: CreateAssessmentTemplateInput,
  ): Promise<AssessmentTemplate> {
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

      return await client.assessmentTemplate.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          name: input.name,
          subjectType: input.subjectType,
          definition: input.definition as object,
          ownerUserId: input.ownerUserId ?? null,
          extensions: extensions as object,
          // `version` is absent on purpose. It defaults to 1, and nothing in this
          // codebase increments it yet — no repository writes `version` on any
          // table. Accepting one here would let a caller publish "version 9" of a
          // template that has been edited once, and AssessmentInstance snapshots
          // this number as provenance. An honest 1 beats a caller's claim.
          // status: this table has none — §4 gives the lifecycle to the instance.
          // created_by / updated_by stay NULL until M4 supplies a credential.
        },
      });
    } catch (error) {
      // The row's own entity was out of scope: RLS refused, at the counter or at
      // the insert.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // In scope, but named an owner it cannot reach.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('owner');
      }
      throw error;
    }
  }
}
