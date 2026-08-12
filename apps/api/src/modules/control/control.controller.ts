/**
 * File: apps/api/src/modules/control/control.controller.ts
 * Purpose: The endpoints that give ADR-0014's row-level scope a caller.
 * Category: modules
 * Scope: Phase W06 (M1 slice 3)
 * Owner: docs/14-adr/0014-row-level-entity-scope-and-per-command-policies.md
 *
 * Description:
 *   Copies risk.controller.ts, which copies policy.controller.ts. The three
 *   behaviours that were required rather than chosen there are required here for
 *   the same reasons and are not re-argued:
 *
 *     1. 404, never 403, for anything outside the scope
 *     2. the scope is never read from the request
 *     3. the caller's bad data is 4xx, not 500
 *
 *   ⭐ WHAT IS NEW IS THAT `GET` RETURNS ROWS THE CALLER DOES NOT OWN. Every
 *   other list endpoint answers "your entity's records"; this one answers "yours,
 *   plus the group-shared library". Nothing here implements that — the read
 *   policy does (ADR-0014) — but a reader of this file should not have to guess
 *   whether the widening is deliberate.
 *
 *   ⚠️ There is no `appliesToScope` in the request body and no way to create a
 *   group-shared control through this endpoint. That is the decision, not a gap
 *   in the DTO: the insert policy refuses the value outright, so a field for it
 *   would be a field that always fails. See control.repository.ts.
 *
 * Key Components:
 *   - GET /controls — own entities' controls plus every group-shared one
 *   - POST /controls — validated write; server issues ref_code, scope stays entity-local
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06)
 *
 * Related:
 *   - apps/api/src/modules/risk/risk.controller.ts — the shape being copied
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
import { ControlRepository } from '../../core-model/control.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';

/** 02a:122 / 02a:123 / 02a:124, verbatim — the same lists the enums carry. */
const CONTROL_TYPES = ['preventive', 'detective', 'corrective'] as const;
const CONTROL_NATURES = ['manual', 'automated', 'hybrid'] as const;
const CONTROL_FREQUENCIES = [
  'continuous',
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
  'event_driven',
] as const;

type ControlTypeValue = (typeof CONTROL_TYPES)[number];
type ControlNatureValue = (typeof CONTROL_NATURES)[number];
type ControlFrequencyValue = (typeof CONTROL_FREQUENCIES)[number];

interface CreateControlBody {
  orgEntityId?: unknown;
  title?: unknown;
  type?: unknown;
  nature?: unknown;
  frequency?: unknown;
  description?: unknown;
  frameworkRefs?: unknown;
  extensions?: unknown;
}

@Controller('controls')
export class ControlController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly controls: ControlRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.controls.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateControlBody) {
    for (const key of ['orgEntityId', 'title'] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    if (!isOneOf(body.type, CONTROL_TYPES)) {
      throw new BadRequestException(`type must be one of: ${CONTROL_TYPES.join(', ')}`);
    }
    if (!isOneOf(body.nature, CONTROL_NATURES)) {
      throw new BadRequestException(`nature must be one of: ${CONTROL_NATURES.join(', ')}`);
    }
    if (!isOneOf(body.frequency, CONTROL_FREQUENCIES)) {
      throw new BadRequestException(`frequency must be one of: ${CONTROL_FREQUENCIES.join(', ')}`);
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.controls.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        title: body.title as string,
        type: body.type as ControlTypeValue,
        nature: body.nature as ControlNatureValue,
        frequency: body.frequency as ControlFrequencyValue,
        description: typeof body.description === 'string' ? body.description : undefined,
        frameworkRefs: readFrameworkRefs(body.frameworkRefs),
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
      // The caller named an entity it cannot see. Whether that entity exists is
      // not something it gets to learn.
      if (error instanceof ScopeRefusedError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Read the clause references out of an untyped body.
 *
 * ⚠️ A non-array is REFUSED rather than coerced. `frameworkRefs: "A.5.9"` is a
 * plausible mistake, and silently wrapping it into `["A.5.9"]` would make the
 * next one — `"A.5.9, A.8.1"` as a single string — invisible the same way.
 */
function readFrameworkRefs(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new BadRequestException('frameworkRefs must be an array of strings when present');
  }
  return value as string[];
}
