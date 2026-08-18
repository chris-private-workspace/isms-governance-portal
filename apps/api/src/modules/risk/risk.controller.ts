/**
 * File: apps/api/src/modules/risk/risk.controller.ts
 * Purpose: The endpoint that gives the scoring rule a caller — without which it is AP-3.
 * Category: modules
 * Scope: Phase W05 (M1 slice 2)
 * Owner: docs/14-adr/0013-risk-scoring-and-calibration.md
 *
 * Description:
 *   Copies policy.controller.ts, which is the point: W04's design note claimed
 *   the shape was reusable and this is the first phase to load-test the claim.
 *   The three behaviours that were required rather than chosen there are
 *   required here for the same reasons, so they are not re-argued:
 *
 *     1. 404, never 403, for anything outside the scope
 *     2. the scope is never read from the request
 *     3. the caller's bad data is 4xx, not 500
 *
 *   What is new is the SHAPE OF THE WRITE. There is no score in the request and
 *   no score in the response DTO's input — the database computes it (ADR-0013)
 *   and returns it. A client that sends `scoreBefore` is not silently ignored:
 *   the field is not read, so its value simply never reaches the database, and
 *   the value that comes back is the computed one. That asymmetry is deliberate
 *   and worth stating, because "the server ignored my field" and "the server
 *   overrode my field" look identical from outside and mean different things.
 *
 * Key Components:
 *   - GET /risks — scoped list
 *   - GET /risks/:id — scoped detail; absent and out-of-scope are one answer
 *   - POST /risks — validated write; server issues ref_code, database scores it
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Add GET /risks/:id (Phase W22) — first API caller on a screen
 *   - 2026-08-11: Initial creation (Phase W05)
 *
 * Related:
 *   - apps/api/src/modules/policy/policy.controller.ts — the shape being copied
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
import { RiskRepository } from '../../core-model/risk.repository';
import { RiskScoreValidationError, type ScoreSet } from '../../core-model/risk-score';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';

/** The seven non-empty combinations of C/I/A (02a:118). */
const CIA_TYPES = ['c', 'i', 'a', 'ci', 'ca', 'ia', 'cia'] as const;
type CiaTypeValue = (typeof CIA_TYPES)[number];

const SCORE_KEYS = ['lkh', 'fin', 'bop', 'lry', 'rep', 'sis'] as const;

interface CreateRiskBody {
  orgEntityId?: unknown;
  title?: unknown;
  assetId?: unknown;
  threatId?: unknown;
  vulnerabilityId?: unknown;
  ciaType?: unknown;
  category?: unknown;
  description?: unknown;
  before?: unknown;
  after?: unknown;
  extensions?: unknown;
}

@Controller('risks')
export class RiskController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly risks: RiskRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get()
  async list() {
    const data = await this.risks.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  // === GET /risks/:id: list-then-find, not findUnique =======================
  // Why: the shape is copied verbatim from policy.controller.ts:89-102, comment
  // and all, because the reason it holds there holds here unchanged.
  //
  // A findUnique would have to fetch the row before deciding whether to refuse
  // it, and a code path that holds an out-of-scope row in memory is one edit
  // away from returning it. Going through the scoped client means the row was
  // never ours to leak.
  //
  // ⚠️ This is O(n) in the entity's risk count and it is meant to expire, not to
  // be optimised on a hunch. Expiry condition (AD in CH-042): the moment a
  // single entity holds more risks than one screen can show, this stops being a
  // list an operator would ever page through and becomes a query — and then the
  // right fix is a scoped findFirst in the repository, not a cache here.
  @Get(':id')
  async byId(@Param('id') id: string) {
    const all = await this.risks.list(await this.client());
    const found = all.find((r) => r.id === id);

    // Absent and out-of-scope are indistinguishable here BECAUSE the scoped
    // client never returned the row. Returning 403 would require knowing the row
    // exists — which would mean querying outside the scope to find out.
    if (!found) {
      throw new NotFoundException(`risk ${id} not found`);
    }

    return { data: found, ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreateRiskBody) {
    const required = ['orgEntityId', 'title', 'assetId', 'threatId', 'vulnerabilityId'] as const;
    for (const key of required) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    if (!isCiaType(body.ciaType)) {
      throw new BadRequestException(`ciaType must be one of: ${CIA_TYPES.join(', ')}`);
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.risks.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        title: body.title as string,
        assetId: body.assetId as string,
        threatId: body.threatId as string,
        vulnerabilityId: body.vulnerabilityId as string,
        ciaType: body.ciaType,
        category: typeof body.category === 'string' ? body.category : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        before: readScoreSet(body.before),
        after: readScoreSet(body.after),
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      // The caller's numbers were wrong, not the service. 422 carries the column
      // so a form can mark the field — the same contract extension failures use.
      if (error instanceof RiskScoreValidationError) {
        throw new UnprocessableEntityException({
          message: error.message,
          key: error.column,
        });
      }
      if (error instanceof ExtensionValidationError) {
        throw new UnprocessableEntityException({
          message: error.message,
          key: error.key,
        });
      }
      // Two different refusals, one answer. The caller named an entity, or an
      // asset, they cannot see; which of those it was — and whether the thing
      // exists at all — is not something they get to learn.
      if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}

function isCiaType(value: unknown): value is CiaTypeValue {
  return typeof value === 'string' && (CIA_TYPES as readonly string[]).includes(value);
}

/**
 * Read a score set out of an untyped body.
 *
 * ⚠️ Non-numbers are passed THROUGH rather than dropped, so `{ lkh: "4" }`
 * reaches validateScoreSet and is refused by name. Dropping it here would turn a
 * typo into a silently absent set — which the all-or-none rule would then report
 * as a different problem entirely.
 */
function readScoreSet(value: unknown): ScoreSet | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'object') {
    throw new BadRequestException('a score set must be an object when present');
  }

  const source = value as Record<string, unknown>;
  const set: Record<string, number | null> = {};
  for (const key of SCORE_KEYS) {
    if (source[key] !== undefined && source[key] !== null) {
      set[key] = source[key] as number;
    }
  }
  return set;
}
