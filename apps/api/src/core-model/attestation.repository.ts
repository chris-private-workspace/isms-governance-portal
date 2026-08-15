/**
 * File: apps/api/src/core-model/attestation.repository.ts
 * Purpose: The attestation write path — the second polymorphic reference, and the first with two live parents.
 * Category: core-model
 * Scope: Phase W14 (M1 slice 9)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md guardrail 5
 *
 * Description:
 *   Thirteenth consumer of the scoped-client shape, and the closest sibling of
 *   EvidenceRepository: `subject_id` is polymorphic (02a:235) and carries no
 *   foreign key, so the database does the reference checking a constraint cannot.
 *
 *   ⛔ ONE THING IS TRUE HERE THAT IS NOT TRUE OF EVIDENCE, and it was measured
 *   in Day 0 rather than assumed. Evidence points at ONE table today, so its
 *   trigger either finds the parent or refuses. Attestation points at two, and
 *   `controls_read` widens for `applies_to_scope = 'group'` (ADR-0014) — a
 *   group-shared control is reachable from any entity, deliberately (02a:434).
 *   So the refusal this repository relies on is total for `policy` subjects and
 *   conditional for `control` ones. That is a property of the data model, not a
 *   hole to plug here; what it forbids is a test or a caller that treats the two
 *   subject types as interchangeable.
 *
 *   As in EvidenceRepository, nothing here reads the parent first.
 *   ScopedAttestationClient can name neither `policy` nor `control`, which is
 *   what makes the existence oracle unwritable rather than merely discouraged.
 *
 *   ⚠️ `subjectType` IS an input, unlike `Evidence.linkedType`. There the enum
 *   has one legal value, so accepting it would be accepting a constant; here both
 *   values are legal from day one and the caller is the only party that knows
 *   which it means.
 *
 * Key Components:
 *   - AttestationRepository.list(): this entity's attestations
 *   - AttestationRepository.create(): validate -> catalog -> issueRefCode -> insert
 *
 * Created: 2026-08-15 (Phase W14)
 * Last Modified: 2026-08-15
 *
 * Modification History (newest-first):
 *   - 2026-08-15: Initial creation (Phase W14) — polymorphic subject, two live parents
 *
 * Related:
 *   - apps/api/src/core-model/evidence.repository.ts — the shape this follows
 *   - apps/api/prisma/migrations/20260815083338_attestation/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { Attestation, AttestationSubjectType } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedAttestationClient } from './scoped-client.types';

const ENTITY_TYPE = 'attestation';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'ATT';

export interface CreateAttestationInput {
  readonly orgEntityId: string;

  /**
   * What is being attested (02a:235). An input, not a constant — both values are
   * legal, which is exactly what Evidence.linkedType is not.
   */
  readonly subjectType: AttestationSubjectType;

  /**
   * The policy or control. Whether it is reachable is the trigger's decision,
   * never this layer's.
   *
   * ⚠️ For `subject_type = 'control'` the answer can legitimately be yes across
   * entities, because a group-shared control is readable everywhere (ADR-0014,
   * 02a:434). Do not read a successful create as proof of same-entity ownership.
   */
  readonly subjectId: string;

  /**
   * Who attested. Optional because M4 owns the only path that could supply a real
   * one — see the model docstring. An attestation without an attester records
   * intent, not proof.
   */
  readonly userId?: string | undefined;

  /** Absent means now. A sign-off recorded later can say when it happened. */
  readonly attestedAt?: Date | undefined;

  /**
   * Free text (02a:235 enumerates nothing), following `Evidence.kind` rather than
   * `StatementOfApplicability.implementationStatus` — the schema docstring
   * records why the two precedents diverge and which one governs here.
   */
  readonly result: string;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class AttestationRepository {
  async list(client: ScopedAttestationClient): Promise<Attestation[]> {
    return client.attestation.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    client: ScopedAttestationClient,
    input: CreateAttestationInput,
  ): Promise<Attestation> {
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

      return await client.attestation.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          userId: input.userId ?? null,
          attestedAt: input.attestedAt ?? new Date(),
          result: input.result,
          extensions: extensions as object,
        },
      });
    } catch (error) {
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // Two references can raise this — `subject_id` via the trigger, and
      // `user_id` via its real foreign key — so unlike evidence.repository.ts:141
      // this cannot name the field without guessing. `subjectId` is the one a
      // caller controls and the one the trigger refuses; naming the other would
      // be a worse guess, and naming neither loses the only useful half.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('subjectId');
      }
      throw error;
    }
  }
}
