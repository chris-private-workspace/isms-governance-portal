/**
 * File: apps/api/src/modules/control-test/control-test.controller.ts
 * Purpose: The endpoints that give the trigger-guarded parent reference a caller.
 * Category: modules
 * Scope: Phase W07 (M1 slice 4)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §5.1
 *
 * Description:
 *   Copies control.controller.ts, which copies risk.controller.ts. The three
 *   behaviours that were required rather than chosen there are required here for
 *   the same reasons and are not re-argued:
 *
 *     1. 404, never 403, for anything outside the scope
 *     2. the scope is never read from the request
 *     3. the caller's bad data is 4xx, not 500
 *
 *   ⚠️ `POST` accepts a control this entity does not own, and that is deliberate:
 *   group-shared controls are readable group-wide (ADR-0014), and an OpCo testing
 *   the group password standard at its own site is what publishing one is for.
 *   What it cannot accept is another entity's private control — refused by the
 *   database, with the identical error an id that exists nowhere produces.
 *
 *   ⚠️ There is no `status` in the request body, and no way to record a test as
 *   passed. See control-test.repository.ts: the review transition carries 02a:416's
 *   segregation-of-duties rule and does not exist in this slice, so a settable
 *   terminal state would be a way to self-certify.
 *
 * Key Components:
 *   - GET /control-tests — this entity's tests
 *   - POST /control-tests — schedule a test; server issues ref_code
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07)
 *
 * Related:
 *   - apps/api/src/modules/control/control.controller.ts — the shape being copied
 *   - apps/api/src/modules/policy/dev-principal.ts — what M4 removes
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
import { ControlTestRepository } from '../../core-model/control-test.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

interface CreateControlTestBody {
  orgEntityId?: unknown;
  controlId?: unknown;
  scheduledFor?: unknown;
  testerUserId?: unknown;
  extensions?: unknown;
}

@Controller('control-tests')
export class ControlTestController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly controlTests: ControlTestRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.controlTests.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateControlTestBody) {
    for (const key of ['orgEntityId', 'controlId'] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    if (body.testerUserId !== undefined && typeof body.testerUserId !== 'string') {
      throw new BadRequestException('testerUserId must be a string when present');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.controlTests.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        controlId: body.controlId as string,
        scheduledFor: readTimestamp(body.scheduledFor, 'scheduledFor'),
        testerUserId: typeof body.testerUserId === 'string' ? body.testerUserId : undefined,
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
      // Two different refusals, one answer. The caller named an entity, or a
      // control, it cannot see; which of those it was — and whether the thing
      // exists at all — is not something it gets to learn.
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
