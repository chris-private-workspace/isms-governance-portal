/**
 * File: apps/api/src/core-model/soa.repository.ts
 * Purpose: Read and write Statement of Applicability rows — one per framework clause per entity.
 * Category: core-model
 * Scope: Phase W11 (M1 slice 8)
 *
 * Description:
 *   The write order every repository in this layer uses, unchanged: validate ->
 *   catalog -> issueRefCode -> insert -> translate. What is specific here is the
 *   TRANSLATION, because this table is the first whose unique key can be hit by a
 *   caller supplying both halves.
 *
 *   scope-refusal.ts:183 states the condition for surfacing 23505: the predicate
 *   is safe for keys whose tuple is scoped or server-issued, and unsafe for a
 *   caller-supplied tuple that spans entities. This key is
 *   (org_entity_id, framework, clause_ref) — org_entity_id is in it, and a caller
 *   cannot put another entity's id there without RLS refusing the insert outright.
 *   So a 23505 reaching this code can only mean "you already have a row for this
 *   clause", which is safe to say. That question was asked because the docstring
 *   demands it be asked, not because the answer was assumed.
 *
 * Key Components:
 *   - SoaRepository.list(): this entity's rows only — no group widening
 *   - SoaRepository.create(): validate -> catalog -> issueRefCode -> insert -> translate
 *
 * Created: 2026-08-14 (Phase W11)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W11) — 02a:215, M1 slice 8
 *
 * Related:
 *   - docs/02-architecture/02a-data-model-spec.md §3 (StatementOfApplicability)
 *   - apps/api/prisma/migrations/20260814023210_soa/migration.sql
 *   - apps/api/src/core-model/issue.repository.ts (the single-table shape this follows)
 */
import { Injectable } from '@nestjs/common';
import type { SoaImplementationStatus, StatementOfApplicability } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  DuplicateKeyError,
  isScopeRefusal,
  isUniqueViolation,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedSoaClient } from './scoped-client.types';

const ENTITY_TYPE = 'statement_of_applicability';

/** Self-declared, as every prefix in this layer is (02a:91 fixes the rule, not the value). */
const REF_CODE_PREFIX = 'SOA';

export interface CreateSoaInput {
  /**
   * Which entity this statement belongs to. RLS decides whether that was allowed;
   * there is no check here (約束 8: scope travels with the connection, not the argument).
   */
  readonly orgEntityId: string;

  /**
   * e.g. `ISO 27001`. Free text, NOT a foreign key — `Framework` does not exist
   * and 02a never says what one would contain (see the model docstring).
   */
  readonly framework: string;

  /** e.g. `A.5.9` (02a:215). */
  readonly clauseRef: string;

  readonly applicable: boolean;

  readonly implementationStatus: SoaImplementationStatus;

  readonly justification?: string | undefined;

  /**
   * Free text, not a user id — 02a:215 says `approved_by` without saying it is
   * one, and SoA approval is frequently a committee. W10 read prepared_by /
   * approved_by the same way.
   */
  readonly approvedBy?: string | undefined;

  readonly approvedAt?: Date | undefined;

  readonly ownerUserId?: string | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class SoaRepository {
  /**
   * This entity's statements only.
   *
   * ⚠️ No group widening, unlike ControlRepository.list(). A group-shared control
   * is a library entry every entity may consult; an SoA row is one entity's
   * decision about one clause, and reading another OpCo's decisions is a roll-up
   * question — an authorised scope expansion, not a property of the row.
   */
  async list(client: ScopedSoaClient): Promise<StatementOfApplicability[]> {
    return client.statementOfApplicability.findMany({
      where: { retiredAt: null },
      orderBy: [{ framework: 'asc' }, { clauseRef: 'asc' }],
    });
  }

  async create(client: ScopedSoaClient, input: CreateSoaInput): Promise<StatementOfApplicability> {
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

      return await client.statementOfApplicability.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          framework: input.framework,
          clauseRef: input.clauseRef,
          applicable: input.applicable,
          implementationStatus: input.implementationStatus,
          justification: input.justification ?? null,
          approvedBy: input.approvedBy ?? null,
          approvedAt: input.approvedAt ?? null,
          ownerUserId: input.ownerUserId ?? null,
          extensions: extensions as object,
          // created_by / updated_by stay NULL until M4 supplies a credential.
        },
      });
    } catch (error) {
      // The row's own entity was out of scope: RLS refused, at the counter or at
      // the insert.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // Safe to surface HERE and not everywhere — see the file header and
      // scope-refusal.ts:183. The key carries org_entity_id, so a collision can
      // only be with a row the caller can already read.
      if (isUniqueViolation(error)) {
        throw new DuplicateKeyError('framework + clauseRef');
      }
      // In scope, but named an owner it cannot reach.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('owner');
      }
      throw error;
    }
  }
}
