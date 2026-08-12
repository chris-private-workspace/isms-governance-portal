/**
 * File: apps/api/src/core-model/asset.repository.ts
 * Purpose: Write paths for the asset chain — the tables W05 created and could not exercise.
 * Category: core-model
 * Scope: Phase W06 (M1 slice 3)
 * Owner: docs/02-architecture/design-notes/W04-user-and-base-fields.md
 *
 * Description:
 *   W05 built `asset_groups` and `assets` because `risks` needed something to
 *   point at, and left both without a write path. That left their RLS and their
 *   composite foreign key asserted-but-unexercised — W05's own checklist item 2.4
 *   is blocked on exactly this file existing. Nothing here is a new idea; the
 *   value is that four claims stop being static.
 *
 *   ⭐ THE TWO METHODS TAKE DIFFERENT CLIENT SHAPES, AND THAT IS THE DESIGN.
 *   `createGroup` receives a client that can reach `assetGroup`; `create`
 *   receives one that cannot. At runtime both are the same object. What differs
 *   is what the TYPE permits, and it is load-bearing rather than tidy:
 *
 *     An asset names its group by id. The composite foreign key refuses another
 *     entity's group with the byte-identical error it gives for a group that does
 *     not exist (measured, W05 Day 2). If `create` could read the group table
 *     first, it could tell those two apart — and telling them apart is the oracle
 *     約束 8 forbids. Not being able to NAME the delegate is what makes that
 *     unwritable rather than merely discouraged.
 *
 *   ⚠️ So the shapes must not be merged into one convenience interface, however
 *   much it would shorten this file. That merge is the whole bug.
 *
 * Key Components:
 *   - AssetRepository.listGroups() / createGroup(): the parent table
 *   - AssetRepository.list() / create(): the child, refused by a composite FK
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06) — unblocks W05 checklist 2.4
 *
 * Related:
 *   - apps/api/src/core-model/risk.repository.ts — the same two-refusal shape
 *   - apps/api/prisma/migrations/20260811024841_asset_and_risk_chain/migration.sql:214
 */
import { Injectable } from '@nestjs/common';
import type { Asset, AssetCategory, AssetClassification, AssetGroup } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedAssetClient, ScopedAssetGroupClient } from './scoped-client.types';

const GROUP_ENTITY_TYPE = 'asset_group';
const ASSET_ENTITY_TYPE = 'asset';

/** Self-declared, like every prefix but Risk's (02a:91). */
const GROUP_REF_CODE_PREFIX = 'AGRP';
const ASSET_REF_CODE_PREFIX = 'AST';

export interface CreateAssetGroupInput {
  readonly orgEntityId: string;
  readonly name: string;
  readonly assetCategory: AssetCategory;
  readonly description?: string | undefined;
  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

export interface CreateAssetInput {
  readonly orgEntityId: string;
  readonly name: string;

  /**
   * The group this asset is assessed with.
   *
   * ⚠️ Never checked here. The composite FK (`assets_asset_group_id_org_entity_id_fkey`)
   * decides, and it decides for both halves at once: a group that does not exist
   * and a group belonging to another entity are the same answer.
   */
  readonly assetGroupId: string;

  /**
   * Repeated from the group on purpose — 02a:208 lists it on Asset too, and an
   * asset may be categorised differently from the group it is assessed with.
   */
  readonly assetCategory: AssetCategory;
  readonly classification: AssetClassification;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class AssetRepository {
  async listGroups(client: ScopedAssetGroupClient): Promise<AssetGroup[]> {
    return client.assetGroup.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGroup(
    client: ScopedAssetGroupClient,
    input: CreateAssetGroupInput,
  ): Promise<AssetGroup> {
    const extensions = input.extensions ?? {};

    const catalog = await client.extensionField.findMany({
      where: { entityType: GROUP_ENTITY_TYPE, retiredAt: null },
    });
    validateExtensions(extensions, catalog);

    try {
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: GROUP_ENTITY_TYPE,
        prefix: GROUP_REF_CODE_PREFIX,
      });

      return await client.assetGroup.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          name: input.name,
          assetCategory: input.assetCategory,
          description: input.description ?? null,
          extensions: extensions as object,
        },
      });
    } catch (error) {
      // A group names nothing else scoped — one refusal point, like policies.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      throw error;
    }
  }

  async list(client: ScopedAssetClient): Promise<Asset[]> {
    return client.asset.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedAssetClient, input: CreateAssetInput): Promise<Asset> {
    const extensions = input.extensions ?? {};

    const catalog = await client.extensionField.findMany({
      where: { entityType: ASSET_ENTITY_TYPE, retiredAt: null },
    });
    validateExtensions(extensions, catalog);

    try {
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: ASSET_ENTITY_TYPE,
        prefix: ASSET_REF_CODE_PREFIX,
      });

      return await client.asset.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          name: input.name,
          assetGroupId: input.assetGroupId,
          assetCategory: input.assetCategory,
          classification: input.classification,
          extensions: extensions as object,
        },
      });
    } catch (error) {
      // TWO refusal points, and they fire in different places. The asset's own
      // entity is checked by RLS at the counter (42501); the group it names is
      // checked by the composite FK after the row is already accepted (23503).
      // W05 measured that assuming one detector covers both surfaces as a 500.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('asset group');
      }
      throw error;
    }
  }
}
