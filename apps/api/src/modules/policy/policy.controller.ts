/**
 * File: apps/api/src/modules/policy/policy.controller.ts
 * Purpose: The platform's first business endpoint — and the only place that sees both scopes.
 * Category: modules
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0005-governed-extension-storage.md
 *
 * Description:
 *   This is the layer the boundary matrix permits to import BOTH core-model and
 *   entity-scope, which is what makes the W03 split work: it resolves a scope,
 *   obtains a scoped client, and hands that client to a repository that could
 *   never have named its type.
 *
 *   Three behaviours here are required rather than chosen:
 *
 *   1. **404, never 403, for a record outside the scope.** 403 confirms the id
 *      exists, which tells a caller they guessed right (CLAUDE.md 約束 8). The
 *      scoped client cannot see the row at all, so "denied" and "absent" reach
 *      this code as the same thing — which is the point, not a limitation.
 *   2. **The scope is never read from the request.** No header, no query
 *      parameter, no body field. Today it comes from a dev stub that announces
 *      itself; at M4 it comes from the token, and this file changes by one line.
 *   3. **Extension failures are 422, not 500.** They are the caller's data, not
 *      an outage — ExtensionValidationError carries the offending key.
 *
 * Key Components:
 *   - GET /policies — scoped list
 *   - GET /policies/:id — the 404-not-403 case
 *   - POST /policies — catalog-validated write
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W03)
 *
 * Related:
 *   - docs/rules-on-demand/multi-tenant-data.md — 404-not-403
 *   - apps/api/src/modules/policy/dev-principal.ts — what M4 removes
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { PolicyRepository } from '../../core-model/policy.repository';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from './dev-principal';

interface CreatePolicyBody {
  orgEntityId?: unknown;
  title?: unknown;
  extensions?: unknown;
}

@Controller('policies')
export class PolicyController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly policies: PolicyRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.policies.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    const all = await this.policies.list(await this.client());
    const found = all.find((p) => p.id === id);

    // Absent and out-of-scope are indistinguishable here BECAUSE the scoped
    // client never returned the row. Returning 403 would require knowing the row
    // exists — which would mean querying outside the scope to find out.
    if (!found) {
      throw new NotFoundException(`policy ${id} not found`);
    }

    return { data: found, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreatePolicyBody) {
    if (typeof body?.orgEntityId !== 'string' || typeof body?.title !== 'string') {
      throw new BadRequestException('orgEntityId and title are required strings');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.policies.create(await this.client(), {
        orgEntityId: body.orgEntityId,
        title: body.title,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      // The caller's data was wrong, not the service. 422 carries the key so a
      // form can mark the field; a 500 here would read as an outage.
      if (error instanceof ExtensionValidationError) {
        throw new UnprocessableEntityException({
          message: error.message,
          key: error.key,
        });
      }
      throw error;
    }
  }
}
