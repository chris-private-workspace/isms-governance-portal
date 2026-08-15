/**
 * File: apps/api/src/core-model/evidence.repository.ts
 * Purpose: The evidence write path — the first reference with no foreign key at all.
 * Category: core-model
 * Scope: Phase W07 (M1 slice 4)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md guardrail 5
 *
 * Description:
 *   Fifth consumer of the scoped-client shape, and the one where the database is
 *   doing the most work per line written here.
 *
 *   `linked_id` is polymorphic (02a:227) and therefore carries NO foreign key. W07
 *   Day 1 measured what that means with nothing else watching: a row pointing at
 *   another entity's record was accepted, and so was a row pointing at an id that
 *   exists nowhere (M3, M3b). The same SECURITY INVOKER trigger ControlTest uses
 *   for scope does double duty here — it is also the missing referential
 *   integrity — and it fails closed for a linked_type it cannot check.
 *
 *   As in ControlTestRepository, nothing here reads the parent first.
 *   ScopedEvidenceClient cannot name `controlTest`, which is what makes the
 *   oracle unwritable rather than merely discouraged.
 *
 *   ⭐ **`linkedType` BECAME an input in W14**, under exactly the condition this
 *   header set when it was written: "in the same change that gives the trigger its
 *   second branch, and not before". Migration 20260815090746 adds the
 *   `attestation` value AND the mapping pair that resolves it, in one statement
 *   list. Until then it was a field with one legal answer, which is not a field —
 *   the same reasoning ControlRepository applies to `appliesToScope`.
 *
 *   ⚠️ `assessment` is still not a value, though AssessmentInstance has existed
 *   since W09. Its absence is now a scope decision rather than a missing table.
 *
 * Key Components:
 *   - EvidenceRepository.list(): this entity's evidence
 *   - EvidenceRepository.create(): validate -> catalog -> issueRefCode -> insert
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07) — polymorphic link, trigger-enforced
 *
 * Related:
 *   - apps/api/src/core-model/control-test.repository.ts — the sibling half
 *   - apps/api/prisma/migrations/20260812055744_control_test_and_evidence/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { Evidence, EvidenceLinkedType } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedEvidenceClient } from './scoped-client.types';

const ENTITY_TYPE = 'evidence';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'EVID';

export interface CreateEvidenceInput {
  readonly orgEntityId: string;

  /** Free text (02a:227 enumerates nothing): "screenshot", "export", "log". */
  readonly kind: string;

  /** Where the artefact lives. A pointer, never the bytes. */
  readonly uriOrBlobRef: string;

  /**
   * Integrity anchor (02a:227). REQUIRED — evidence whose contents cannot be shown
   * to be unchanged is not evidence-grade (guardrail 5), and accepting it without
   * one would let the platform hold both kinds while presenting them as one.
   *
   * ⚠️ Not computed here. The artefact lives in a store this layer does not read,
   * so the collector is the only party that can hash the bytes; verifying it is a
   * job for whatever fetches them, and that does not exist yet.
   */
  readonly hash: string;

  /**
   * ⭐ W14: AN INPUT AT LAST. The header's condition was "in the same change that
   * gives the trigger its second branch", and 20260815090746 is that change.
   * Until then a single-valued enum made this a field with one legal answer.
   */
  readonly linkedType: EvidenceLinkedType;

  /**
   * The record this evidences. Whether it is reachable is decided by the
   * trigger, not here — and an id that exists nowhere gives the identical refusal
   * as one belonging to another entity (measured, W07 Day 2).
   *
   * ⚠️ Which TABLE it is looked up in now depends on `linkedType`, and an
   * attestation id paired with `control_test` is simply an unreachable id — the
   * two fields are not independently validated and the caller owns their pairing.
   */
  readonly linkedId: string;

  /** Absent means now. Evidence collected earlier can say so. */
  readonly collectedAt?: Date | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class EvidenceRepository {
  async list(client: ScopedEvidenceClient): Promise<Evidence[]> {
    return client.evidence.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedEvidenceClient, input: CreateEvidenceInput): Promise<Evidence> {
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

      return await client.evidence.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          kind: input.kind,
          uriOrBlobRef: input.uriOrBlobRef,
          hash: input.hash,
          collectedAt: input.collectedAt ?? new Date(),
          // ⭐ W14: passed through, not set. The header's condition was met by
          // 20260815090746, which gave the trigger its second branch.
          linkedType: input.linkedType,
          linkedId: input.linkedId,
          extensions: extensions as object,
        },
      });
    } catch (error) {
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // Only one reference can raise this: `linked_id`, via the trigger, since
      // the column has no foreign key of its own. Naming it is therefore safe —
      // unlike control-test.repository.ts, there is no second candidate whose
      // exclusion would leak which one failed.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('linkedId');
      }
      throw error;
    }
  }
}
