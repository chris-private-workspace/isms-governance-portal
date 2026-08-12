/**
 * File: apps/api/src/modules/issue/issue.controller.ts
 * Purpose: The endpoints that give the finding record a caller.
 * Category: modules
 * Scope: Phase W08 (M1 slice 5)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §4
 *
 * Description:
 *   Copies control-test.controller.ts. The three behaviours that were required
 *   rather than chosen there are required here for the same reasons and are not
 *   re-argued: 404 never 403, the scope is never read from the request, and the
 *   caller's bad data is 4xx rather than 500.
 *
 *   ⭐ ONE THING IS NEW: this is the first endpoint whose body carries ENUM values.
 *   Every earlier one took uuids, timestamps and free text, where an unusable
 *   value fails at a foreign key and arrives as a domain error. An enum does not:
 *   Prisma rejects an unknown variant before any SQLSTATE this app recognises, so
 *   without the check below `{"severity": "urgent"}` would be a 500 — an outage
 *   reported for a typo. The valid sets are read from the generated client rather
 *   than restated, so adding a variant to the schema cannot leave this file behind.
 *
 *   ⚠️ There is no `status` in the request body. See issue.repository.ts: every
 *   value in 02a §4 other than `open` is reached by a transition, and 02a:409
 *   attaches a rule to one of them (">=1 action before Remediated") that nothing
 *   in this slice could enforce.
 *
 * Key Components:
 *   - GET /issues — this entity's findings
 *   - POST /issues — raise one; server issues ref_code
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08)
 *
 * Related:
 *   - apps/api/src/modules/control-test/control-test.controller.ts — the shape being copied
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
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { IssueRepository } from '../../core-model/issue.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { IssueSeverity, IssueSource } from '../../generated/prisma';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

/**
 * Derived from the generated client, never restated.
 *
 * A hand-written copy is a docstring that can lie: the day `audit` becomes a
 * buildable source (02a:229 names it, its table does not exist yet), a literal
 * list here would keep rejecting it with no test failing to say so.
 */
const SOURCES = Object.values(IssueSource) as string[];
const SEVERITIES = Object.values(IssueSeverity) as string[];

interface CreateIssueBody {
  orgEntityId?: unknown;
  title?: unknown;
  source?: unknown;
  severity?: unknown;
  description?: unknown;
  dueDate?: unknown;
  ownerUserId?: unknown;
  extensions?: unknown;
}

@Controller('issues')
export class IssueController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly issues: IssueRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.issues.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateIssueBody) {
    for (const key of ['orgEntityId', 'title', 'source', 'severity'] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    // The enum guards. Naming the accepted values is safe — they are a published
    // part of the contract, unlike anything read from the database.
    if (!SOURCES.includes(body.source as string)) {
      throw new BadRequestException(`source must be one of: ${SOURCES.join(', ')}`);
    }
    if (!SEVERITIES.includes(body.severity as string)) {
      throw new BadRequestException(`severity must be one of: ${SEVERITIES.join(', ')}`);
    }
    for (const key of ['description', 'ownerUserId'] as const) {
      if (body[key] !== undefined && typeof body[key] !== 'string') {
        throw new BadRequestException(`${key} must be a string when present`);
      }
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.issues.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        title: body.title as string,
        source: body.source as IssueSource,
        severity: body.severity as IssueSeverity,
        description: typeof body.description === 'string' ? body.description : undefined,
        dueDate: readTimestamp(body.dueDate, 'dueDate'),
        ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
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
      // Two different refusals, one answer. The caller named an entity, or an
      // owner, it cannot see; which of those it was — and whether the thing
      // exists at all — is not something it gets to learn.
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
