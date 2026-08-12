/**
 * File: apps/api/src/modules/evidence/evidence.controller.ts
 * Purpose: The endpoints for evidence — the reference with no foreign key behind it.
 * Category: modules
 * Scope: Phase W07 (M1 slice 4)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md guardrail 5
 *
 * Description:
 *   Copies control-test.controller.ts. The three inherited behaviours — 404 never
 *   403, scope never read from the request, bad caller data is 4xx — are not
 *   re-argued.
 *
 *   ⚠️ `linkedType` is absent from the body on purpose. EvidenceLinkedType has one
 *   value, so a field for it would be a field with one legal answer; the
 *   repository sets it. It becomes an input in the same change that teaches the
 *   trigger a second branch.
 *
 *   ⚠️ `hash` is required and is NOT verified here. The bytes live in a store this
 *   layer does not read, so the collector is the only party that can hash them.
 *   Accepting an unverified hash is honest as long as nothing claims otherwise —
 *   what would not be honest is making it optional and still calling the record
 *   evidence-grade (guardrail 5).
 *
 * Key Components:
 *   - GET /evidence — this entity's evidence
 *   - POST /evidence — attach evidence to a control test; server issues ref_code
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07)
 *
 * Related:
 *   - apps/api/src/modules/control-test/control-test.controller.ts — the sibling half
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
import { EvidenceRepository } from '../../core-model/evidence.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

interface CreateEvidenceBody {
  orgEntityId?: unknown;
  kind?: unknown;
  uriOrBlobRef?: unknown;
  hash?: unknown;
  linkedId?: unknown;
  collectedAt?: unknown;
  extensions?: unknown;
}

@Controller('evidence')
export class EvidenceController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly evidence: EvidenceRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.evidence.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateEvidenceBody) {
    for (const key of ['orgEntityId', 'kind', 'uriOrBlobRef', 'hash', 'linkedId'] as const) {
      if (typeof body?.[key] !== 'string' || body[key] === '') {
        throw new BadRequestException(`${key} is required and must be a non-empty string`);
      }
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.evidence.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        kind: body.kind as string,
        uriOrBlobRef: body.uriOrBlobRef as string,
        hash: body.hash as string,
        linkedId: body.linkedId as string,
        collectedAt: readTimestamp(body.collectedAt, 'collectedAt'),
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
      // Two different refusals, one answer. Whether the linked test exists at all
      // is not something the caller gets to learn.
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
