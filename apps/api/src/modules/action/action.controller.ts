/**
 * File: apps/api/src/modules/action/action.controller.ts
 * Purpose: The endpoints that give the composite-key-guarded parent reference a caller.
 * Category: modules
 * Scope: Phase W08 (M1 slice 5)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §5.1
 *
 * Description:
 *   Copies control-test.controller.ts. 404 never 403, the scope never comes from
 *   the request, bad caller data is 4xx — all three for the reasons recorded there.
 *
 *   ⚠️ Unlike control-tests, `POST` accepts NO parent outside this entity. A
 *   group-shared control is a library entry any OpCo may test at its own site; a
 *   finding at HK1 is not something SG1 opens actions against, because that would
 *   make one entity accountable for another's remediation. The composite foreign
 *   key on (issue_id, org_entity_id) is what says so, and it gives the identical
 *   error for an issue that does not exist at all.
 *
 *   ⚠️ There is no `status`, `completedAt` or `verifiedBy` in the request body.
 *   02a:398 makes Completed and Verified separate states; a caller able to set
 *   both would be signing off their own work.
 *
 * Key Components:
 *   - GET /actions — this entity's actions
 *   - POST /actions — open one under an issue; server issues ref_code
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08)
 *
 * Related:
 *   - apps/api/src/modules/issue/issue.controller.ts — its parent's endpoints
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
import { ActionRepository } from '../../core-model/action.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

interface CreateActionBody {
  orgEntityId?: unknown;
  issueId?: unknown;
  description?: unknown;
  assigneeUserId?: unknown;
  dueDate?: unknown;
  extensions?: unknown;
}

@Controller('actions')
export class ActionController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly actions: ActionRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.actions.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateActionBody) {
    for (const key of ['orgEntityId', 'issueId', 'description'] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    if (body.assigneeUserId !== undefined && typeof body.assigneeUserId !== 'string') {
      throw new BadRequestException('assigneeUserId must be a string when present');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.actions.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        issueId: body.issueId as string,
        description: body.description as string,
        assigneeUserId: typeof body.assigneeUserId === 'string' ? body.assigneeUserId : undefined,
        dueDate: readTimestamp(body.dueDate, 'dueDate'),
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
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
