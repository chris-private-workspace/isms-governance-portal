/**
 * File: apps/api/src/modules/attestation/attestation.controller.ts
 * Purpose: The endpoints for attestations — the second polymorphic reference.
 * Category: modules
 * Scope: Phase W14 (M1 slice 9)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md guardrail 5
 *
 * Description:
 *   Copies evidence.controller.ts. The three inherited behaviours — 404 never
 *   403, scope never read from the request, bad caller data is 4xx — are not
 *   re-argued.
 *
 *   ⚠️ `subjectType` IS in the body, unlike `linkedType` next door. There the enum
 *   has one legal value so a field for it would have one legal answer; here both
 *   values are legal from the first migration and only the caller knows which it
 *   means.
 *
 *   ⚠️ There is no PATCH and there will not be one without a migration: the table
 *   has neither an UPDATE policy nor an UPDATE grant. A correction is a new
 *   attestation, a withdrawal is `retired_at` — the reasoning 02a:260 applies to
 *   version rows.
 *
 *   ⛔ A 201 DOES NOT MEAN THE SUBJECT BELONGS TO THIS ENTITY. For
 *   `subject_type = 'control'` a group-shared control is readable from every
 *   entity by design (ADR-0014, 02a:434), so the trigger accepts it. Anything
 *   downstream that needs "same entity" must check it, not infer it from a
 *   successful create.
 *
 * Key Components:
 *   - GET /attestations — this entity's attestations
 *   - POST /attestations — record a sign-off; server issues ref_code
 *
 * Created: 2026-08-15 (Phase W14)
 * Last Modified: 2026-08-15
 *
 * Modification History (newest-first):
 *   - 2026-08-15: Initial creation (Phase W14)
 *
 * Related:
 *   - apps/api/src/modules/evidence/evidence.controller.ts — the shape this copies
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AttestationRepository } from '../../core-model/attestation.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { AttestationSubjectType } from '../../generated/prisma';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

/**
 * The two values of the enum, restated for a runtime check.
 *
 * ⚠️ Duplicated from the Prisma enum deliberately: that one is erased at compile
 * time, and a body arrives as unknown. The cost is that the two can drift; the
 * compensation is that adding a third value without touching this line makes the
 * new value 400 rather than reach the database — a visible refusal, not a silent
 * accept of something the trigger has no branch for.
 */
const SUBJECT_TYPES = ['policy', 'control'] as const;

interface CreateAttestationBody {
  orgEntityId?: unknown;
  subjectType?: unknown;
  subjectId?: unknown;
  userId?: unknown;
  result?: unknown;
  attestedAt?: unknown;
  extensions?: unknown;
}

@Controller('attestations')
export class AttestationController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly attestations: AttestationRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.attestations.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateAttestationBody) {
    for (const key of ['orgEntityId', 'subjectId', 'result'] as const) {
      if (typeof body?.[key] !== 'string' || body[key] === '') {
        throw new BadRequestException(`${key} is required and must be a non-empty string`);
      }
    }
    if (!SUBJECT_TYPES.includes(body.subjectType as (typeof SUBJECT_TYPES)[number])) {
      throw new BadRequestException(`subjectType must be one of: ${SUBJECT_TYPES.join(', ')}`);
    }
    if (body.userId !== undefined && typeof body.userId !== 'string') {
      throw new BadRequestException('userId must be a string when present');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.attestations.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        subjectType: body.subjectType as AttestationSubjectType,
        subjectId: body.subjectId as string,
        userId: body.userId as string | undefined,
        result: body.result as string,
        attestedAt: readTimestamp(body.attestedAt, 'attestedAt'),
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      if (error instanceof ExtensionValidationError) {
        throw new UnprocessableEntityException({
          message: error.message,
          key: error.key,
        });
      }
      // Two different refusals, one answer. Whether the subject exists at all is
      // not something the caller gets to learn.
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
