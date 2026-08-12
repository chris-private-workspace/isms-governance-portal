/**
 * File: apps/api/src/core-model/asset.repository.spec.ts
 * Purpose: Two refusal detectors on the asset path, one on the group path — and why.
 * Category: Test (unit)
 * Scope: Phase W06
 *
 * Description:
 *   asset.int.spec.ts proves the database refuses. This file proves the layer
 *   above TRANSLATES both refusals, which is the half that surfaces as HTTP 500
 *   when it is missing — W03 found that on policies, W05 found the second
 *   detector on risks, and an asset has the same two.
 *
 *   The group path deliberately has ONE detector. If a later slice gives asset
 *   groups a scoped reference of their own, the second must arrive with it.
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 */
import { AssetRepository } from './asset.repository';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedAssetClient, ScopedAssetGroupClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const GROUP = '00000000-0000-0000-0000-000000000a10';

const GROUP_INPUT = {
  orgEntityId: SG1,
  name: 'SG1 customer-facing services',
  assetCategory: 'services' as const,
};

const ASSET_INPUT = {
  orgEntityId: SG1,
  name: 'SG1 settlement service',
  assetGroupId: GROUP,
  assetCategory: 'services' as const,
  classification: 'restricted' as const,
};

function stubs(table: 'assetGroup' | 'asset', createThrows?: unknown) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};

  const client = {
    refCodeCounter: {
      upsert: async () => {
        calls.push('issueRefCode');
        return { lastSeq: 3 };
      },
    },
    orgEntity: { findUnique: async () => ({ id: SG1, code: 'SG1' }) },
    extensionField: {
      findMany: async (args: { where: { entityType: string } }) => {
        calls.push(`catalog:${args.where.entityType}`);
        return [];
      },
    },
    [table]: {
      findMany: async () => [],
      create: async (args: { data: Record<string, unknown> }) => {
        calls.push('insert');
        inserted = args.data;
        if (createThrows) {
          throw createThrows;
        }
        return { id: 'created', ...args.data };
      },
    },
  };

  return { client, calls, insert: () => inserted };
}

describe('AssetRepository.createGroup', () => {
  it('issues an AGRP ref_code and reads the asset_group catalog', async () => {
    const { client, calls, insert } = stubs('assetGroup');

    await new AssetRepository().createGroup(
      client as unknown as ScopedAssetGroupClient,
      GROUP_INPUT,
    );

    expect(insert()['refCode']).toBe('AGRP-SG1-000003');
    expect(calls).toEqual(['catalog:asset_group', 'issueRefCode', 'insert']);
  });

  it('translates 42501 into a domain refusal', async () => {
    const { client } = stubs('assetGroup', { code: '42501' });

    await expect(
      new AssetRepository().createGroup(client as unknown as ScopedAssetGroupClient, GROUP_INPUT),
    ).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('does not translate a foreign-key violation it has no reference for', async () => {
    const fk = { code: '23503' };
    const { client } = stubs('assetGroup', fk);

    // A group names no other scoped record. Translating 23503 here would map a
    // genuine schema fault onto "not found" and hide it.
    await expect(
      new AssetRepository().createGroup(client as unknown as ScopedAssetGroupClient, GROUP_INPUT),
    ).rejects.toBe(fk);
  });
});

describe('AssetRepository reads', () => {
  it.each([
    ['listGroups', 'assetGroup'],
    ['list', 'asset'],
  ] as const)('%s applies no entity filter — the policy decides', async (method, table) => {
    let args: unknown;
    const client = {
      [table]: {
        findMany: async (a: unknown) => {
          args = a;
          return [];
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (new AssetRepository() as any)[method](client);

    // ⚠️ An `orgEntityId` filter here would be an application-layer copy of what
    // RLS already does — and the copy is what stays green when the policy stops
    // working. Same reason ControlRepository.list carries no filter.
    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});

describe('AssetRepository.create', () => {
  it('issues an AST ref_code and reads the asset catalog', async () => {
    const { client, calls, insert } = stubs('asset');

    await new AssetRepository().create(client as unknown as ScopedAssetClient, ASSET_INPUT);

    expect(insert()['refCode']).toBe('AST-SG1-000003');
    expect(calls).toEqual(['catalog:asset', 'issueRefCode', 'insert']);
  });

  it('translates 42501 — the row’s own entity was out of scope', async () => {
    const { client } = stubs('asset', { code: '42501' });

    await expect(
      new AssetRepository().create(client as unknown as ScopedAssetClient, ASSET_INPUT),
    ).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('translates 23503 — the GROUP it named was out of reach', async () => {
    const { client } = stubs('asset', { code: '23503' });

    const error = await new AssetRepository()
      .create(client as unknown as ScopedAssetClient, ASSET_INPUT)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // The field name, never the id, and never which of the two causes it was.
    expect((error as UnknownReferenceError).field).toBe('asset group');
  });

  it('does not translate errors it has no detector for', async () => {
    const boom = new Error('connection reset');
    const { client } = stubs('asset', boom);

    await expect(
      new AssetRepository().create(client as unknown as ScopedAssetClient, ASSET_INPUT),
    ).rejects.toBe(boom);
  });

  it('never reaches the group DELEGATE on the asset path', () => {
    // ⚠️ The type already forbids it; what this catches is the edit the type
    // cannot — `(client as any).assetGroup.findMany(...)` to "improve the error
    // message". Reading the group first would make "does not exist" and "not
    // yours" distinguishable, which is the oracle 約束 8 forbids.
    //
    // Matched as `assetGroup.` — a DELEGATE access, with the trailing dot. The
    // body legitimately contains `assetGroupId`, and asserting on the bare name
    // fails on that (measured: it did).
    const source = AssetRepository.prototype.create.toString();

    expect(source).toContain('assetGroupId');
    expect(source).not.toContain('assetGroup.');
  });
});
