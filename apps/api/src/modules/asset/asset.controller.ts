/**
 * File: apps/api/src/modules/asset/asset.controller.ts
 * Purpose: The write paths that turn W05's asset-chain claims into behaviour.
 * Category: modules
 * Scope: Phase W06 (M1 slice 3)
 * Owner: docs/01-planning/W05-m1-risk-and-asset-chain/checklist.md §2.4
 *
 * Description:
 *   Two resources in one controller, because they are one chain: an asset cannot
 *   exist without a group, and a group with no way to create assets is furniture.
 *   The shape is risk.controller.ts's, unchanged.
 *
 *   ⭐ WHAT THIS FILE IS ACTUALLY FOR is the second half of W05: `asset_groups`
 *   and `assets` were built with RLS and a composite foreign key that nothing
 *   could exercise, and W05's checklist 2.4 was blocked on that. The endpoints
 *   are the load. The refusals they make reachable are the deliverable.
 *
 *   ⚠️ POST /assets has TWO ways to be refused and they are different mechanisms:
 *   naming an entity outside scope is stopped by RLS at the reference-code
 *   counter (42501); naming a group inside scope but belonging to another entity
 *   is stopped by the composite FK (23503), after the row itself was accepted.
 *   Both answer 404, and the answers are byte-identical on purpose — one of them
 *   being subtly different is how an existence oracle gets built by accident.
 *
 * Key Components:
 *   - GET/POST /asset-groups — the parent table
 *   - GET/POST /assets — the child; two refusal points, one answer
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06)
 *
 * Related:
 *   - apps/api/src/core-model/asset.repository.ts — why the two client shapes differ
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
import { AssetRepository } from '../../core-model/asset.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';

/** 02a:202 — `physical_and_virtual` is one category, not two. */
const ASSET_CATEGORIES = [
  'services',
  'people',
  'intangible',
  'physical_and_virtual',
  'software',
  'information',
] as const;

/** 02a:208. */
const ASSET_CLASSIFICATIONS = ['internal', 'restricted', 'confidential'] as const;

type AssetCategoryValue = (typeof ASSET_CATEGORIES)[number];
type AssetClassificationValue = (typeof ASSET_CLASSIFICATIONS)[number];

interface CreateAssetGroupBody {
  orgEntityId?: unknown;
  name?: unknown;
  assetCategory?: unknown;
  description?: unknown;
  extensions?: unknown;
}

interface CreateAssetBody {
  orgEntityId?: unknown;
  name?: unknown;
  assetGroupId?: unknown;
  assetCategory?: unknown;
  classification?: unknown;
  extensions?: unknown;
}

@Controller()
export class AssetController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly assets: AssetRepository,
  ) {}

  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get('asset-groups')
  async listGroups() {
    const data = await this.assets.listGroups(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('asset-groups')
  async createGroup(@Body() body: CreateAssetGroupBody) {
    requireStrings(body, ['orgEntityId', 'name']);
    if (!isOneOf(body.assetCategory, ASSET_CATEGORIES)) {
      throw new BadRequestException(`assetCategory must be one of: ${ASSET_CATEGORIES.join(', ')}`);
    }
    requireObjectOrAbsent(body.extensions);

    try {
      const data = await this.assets.createGroup(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        name: body.name as string,
        assetCategory: body.assetCategory as AssetCategoryValue,
        description: typeof body.description === 'string' ? body.description : undefined,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      throw translate(error);
    }
  }

  @Get('assets')
  async list() {
    const data = await this.assets.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('assets')
  async create(@Body() body: CreateAssetBody) {
    requireStrings(body, ['orgEntityId', 'name', 'assetGroupId']);
    if (!isOneOf(body.assetCategory, ASSET_CATEGORIES)) {
      throw new BadRequestException(`assetCategory must be one of: ${ASSET_CATEGORIES.join(', ')}`);
    }
    if (!isOneOf(body.classification, ASSET_CLASSIFICATIONS)) {
      throw new BadRequestException(
        `classification must be one of: ${ASSET_CLASSIFICATIONS.join(', ')}`,
      );
    }
    requireObjectOrAbsent(body.extensions);

    try {
      const data = await this.assets.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        name: body.name as string,
        assetGroupId: body.assetGroupId as string,
        assetCategory: body.assetCategory as AssetCategoryValue,
        classification: body.classification as AssetClassificationValue,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      throw translate(error);
    }
  }
}

function requireStrings(body: object, keys: readonly string[]): void {
  const record = body as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record?.[key] !== 'string') {
      throw new BadRequestException(`${key} is required and must be a string`);
    }
  }
}

function requireObjectOrAbsent(value: unknown): void {
  if (value !== undefined && typeof value !== 'object') {
    throw new BadRequestException('extensions must be an object when present');
  }
}

function isOneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * One translation for both resources.
 *
 * ⚠️ `ScopeRefusedError` and `UnknownReferenceError` deliberately land in the
 * same branch. They come from different mechanisms at different moments, and a
 * caller able to tell them apart could ask "does this asset group exist
 * somewhere I cannot see?" and get an answer.
 */
function translate(error: unknown): unknown {
  if (error instanceof ExtensionValidationError) {
    return new UnprocessableEntityException({ message: error.message, key: error.key });
  }
  if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
    return new NotFoundException(error.message);
  }
  return error;
}
