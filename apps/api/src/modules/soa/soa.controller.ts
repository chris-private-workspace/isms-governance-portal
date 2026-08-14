/**
 * File: apps/api/src/modules/soa/soa.controller.ts
 * Purpose: The endpoints that make the Statement of Applicability live data rather
 *   than an offline spreadsheet.
 * Category: modules
 * Scope: Phase W11 (M1 slice 8)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3
 *
 * Description:
 *   Copies issue.controller.ts, which is the single-table shape. Nothing about
 *   404-never-403, the scope never coming from the request, or an enum guarded
 *   before it reaches Prisma is re-argued here — issue.controller.ts records all
 *   three, and this file would only paraphrase them.
 *
 *   ⭐ TWO THINGS ARE NEW.
 *
 *   1. `applicable` is a BOOLEAN, and it is the first required non-string in any
 *      body in this codebase. The `typeof x !== 'string'` loop every controller
 *      opens with would reject `false` — the value that carries the whole point of
 *      an SoA row — so it gets its own check rather than joining the loop.
 *
 *   2. A duplicate is a 409 here, only the second endpoint that has one (W10's is
 *      the first). It does NOT collapse into the 404 family, because the row it
 *      collides with is one the caller already owns: the unique key carries
 *      org_entity_id, so a probe bearing the caller's own entity cannot collide
 *      with anyone else's rows. soa.repository.ts's header records why that is
 *      safe rather than assuming W10's finding transfers.
 *
 * Key Components:
 *   - GET /soa — this entity's statements
 *   - POST /soa — record one; server issues ref_code
 *
 * Created: 2026-08-14 (Phase W11)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W11)
 *
 * Related:
 *   - apps/api/src/modules/issue/issue.controller.ts — the shape being copied
 *   - apps/api/src/modules/rm-report/rm-report.controller.ts — the other 409
 *   - apps/api/src/modules/policy/dev-principal.ts — what M4 removes
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import {
  DuplicateKeyError,
  ScopeRefusedError,
  UnknownReferenceError,
} from '../../core-model/scope-refusal';
import { SoaRepository } from '../../core-model/soa.repository';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { SoaImplementationStatus } from '../../generated/prisma';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

/**
 * Derived from the generated client, never restated — issue.controller.ts records
 * why a hand-written copy is a docstring that can lie.
 */
const STATUSES = Object.values(SoaImplementationStatus) as string[];

interface CreateSoaBody {
  orgEntityId?: unknown;
  framework?: unknown;
  clauseRef?: unknown;
  applicable?: unknown;
  implementationStatus?: unknown;
  justification?: unknown;
  approvedBy?: unknown;
  approvedAt?: unknown;
  ownerUserId?: unknown;
  extensions?: unknown;
}

@Controller('soa')
export class SoaController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly soa: SoaRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.soa.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateSoaBody) {
    for (const key of ['orgEntityId', 'framework', 'clauseRef', 'implementationStatus'] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    // ⭐ Separate from the loop above, and it has to be. `applicable: false` is a
    // legitimate — arguably the more interesting — value, and any check shaped
    // like "falsy means missing" would reject an exclusion while accepting an
    // inclusion. Absent and false are different answers to the auditor's question.
    if (typeof body.applicable !== 'boolean') {
      throw new BadRequestException('applicable is required and must be a boolean');
    }
    if (!STATUSES.includes(body.implementationStatus as string)) {
      throw new BadRequestException(`implementationStatus must be one of: ${STATUSES.join(', ')}`);
    }
    for (const key of ['justification', 'approvedBy', 'ownerUserId'] as const) {
      if (body[key] !== undefined && typeof body[key] !== 'string') {
        throw new BadRequestException(`${key} must be a string when present`);
      }
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.soa.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        framework: body.framework as string,
        clauseRef: body.clauseRef as string,
        applicable: body.applicable,
        implementationStatus: body.implementationStatus as SoaImplementationStatus,
        justification: typeof body.justification === 'string' ? body.justification : undefined,
        approvedBy: typeof body.approvedBy === 'string' ? body.approvedBy : undefined,
        approvedAt: readTimestamp(body.approvedAt, 'approvedAt'),
        ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      if (error instanceof ExtensionValidationError) {
        throw new UnprocessableEntityException({ message: error.message, key: error.key });
      }
      // Two different refusals, one answer — the caller named an entity, or an
      // owner, it cannot see, and which of those is not something it gets to learn.
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      // ⭐ The one that does NOT collapse. See the file header.
      if (error instanceof DuplicateKeyError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
