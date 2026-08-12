/**
 * File: apps/api/src/modules/asset/asset.int.spec.ts
 * Purpose: Close W05 checklist 2.4 — the four scope tests its own tables could not carry.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W06 (M1 slice 3)
 * Owner: docs/01-planning/W05-m1-risk-and-asset-chain/checklist.md §2.4
 *
 * Description:
 *   W05 created `asset_groups` and `assets` so `risks` had something to point at,
 *   and marked its own four-scope-test item 🚧 because neither table had a write
 *   path. This file is the unblocking event, so the tests are written against
 *   what was UNVERIFIABLE then, not against what is convenient now:
 *
 *     - the composite FK actually refuses (4, 5) — W05 could only assert it existed
 *     - and refuses identically for a group that does not exist (5) — no oracle
 *     - each table's WITH CHECK refuses on its own, with the counter bypassed
 *       (3b, 6b) — AD-BorrowedRefusal-1, third occurrence prevented rather than
 *       found afterwards
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { AssetRepository } from '../../core-model/asset.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { AssetModule } from './asset.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_GROUP = '00000000-0000-0000-0000-000000000a10';
const HK1_GROUP = '00000000-0000-0000-0000-000000000a11';
const FICTIONAL = '11111111-2222-3333-4444-555555555555';

describe('asset module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: AssetRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AssetModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(AssetRepository);
  });

  const createdGroups: { id: string; entity: 'SG1' | 'HK1' }[] = [];
  const createdAssets: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const groupBase = (over: Record<string, unknown> = {}) => ({
    orgEntityId: SG1,
    name: 'SG1 customer-facing services',
    assetCategory: 'services' as const,
    ...over,
  });

  const assetBase = (over: Record<string, unknown> = {}) => ({
    orgEntityId: SG1,
    name: 'SG1 settlement service',
    assetGroupId: SG1_GROUP,
    assetCategory: 'services' as const,
    classification: 'restricted' as const,
    ...over,
  });

  const createGroup = async (codes: string[], over: Record<string, unknown> = {}) => {
    const row = await repo.createGroup(await clientFor(codes), groupBase(over));
    createdGroups.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  const createAsset = async (codes: string[], over: Record<string, unknown> = {}) => {
    const row = await repo.create(await clientFor(codes), assetBase(over));
    createdAssets.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  afterAll(async () => {
    // Children first: retiring a group with live assets under it would leave the
    // suite's own fixtures in a state the domain does not permit.
    for (const { id, entity } of createdAssets) {
      const client = await clientFor([entity]);
      await client.asset.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    for (const { id, entity } of createdGroups) {
      const client = await clientFor([entity]);
      await client.assetGroup.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === asset_groups ==========================================================

  it('1. the server issues both ref_codes; neither caller supplies one', async () => {
    const group = await createGroup(['SG1']);
    const asset = await createAsset(['SG1'], { assetGroupId: group.id });

    expect(group.refCode).toMatch(/^AGRP-SG1-\d{6}$/);
    expect(asset.refCode).toMatch(/^AST-SG1-\d{6}$/);
  });

  it('2. cross-entity read: each entity sees only its own groups and assets', async () => {
    await createGroup(['SG1'], { name: 'SG1 only group' });
    await createGroup(['HK1'], { orgEntityId: HK1, name: 'HK1 only group' });

    const sg1Groups = await repo.listGroups(await clientFor(['SG1']));
    const hk1Groups = await repo.listGroups(await clientFor(['HK1']));

    expect(sg1Groups.every((g) => g.orgEntityId === SG1)).toBe(true);
    expect(hk1Groups.every((g) => g.orgEntityId === HK1)).toBe(true);
    // Order-independent (AD-JestFileOrder-1).
    expect(hk1Groups.map((g) => g.name)).toContain('HK1 only group');
    expect(hk1Groups.map((g) => g.name)).not.toContain('SG1 only group');
  });

  it('3. cross-entity group write is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.listGroups(await clientFor(['HK1']))).length;

    await expect(
      repo.createGroup(sg1, groupBase({ orgEntityId: HK1, name: 'planted by SG1' })),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    const after = await repo.listGroups(await clientFor(['HK1']));
    expect(after).toHaveLength(before);
    expect(after.map((g) => g.name)).not.toContain('planted by SG1');
  });

  it('3b. the asset_groups policy refuses on its own, with the counter bypassed', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.assetGroup.create({
        data: {
          orgEntityId: HK1,
          refCode: 'AGRP-HK1-PLANTED-1',
          name: 'planted straight into the table',
          assetCategory: 'people',
        },
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.listGroups(await clientFor(['HK1']));
    expect(hk1.map((g) => g.refCode)).not.toContain('AGRP-HK1-PLANTED-1');
  });

  // === assets — the composite FK, finally exercised ==========================

  it("4. an asset cannot be filed under another entity's group", async () => {
    const sg1 = await clientFor(['SG1']);

    // Everything here is in scope EXCEPT the group, so RLS passes and the
    // composite FK is what refuses. W05 built this constraint and had no way to
    // make it fire.
    await expect(repo.create(sg1, assetBase({ assetGroupId: HK1_GROUP }))).rejects.toBeInstanceOf(
      UnknownReferenceError,
    );
  });

  it('5. a group that does not exist is refused identically — no existence oracle', async () => {
    const sg1 = await clientFor(['SG1']);

    const othersGroup = await repo
      .create(sg1, assetBase({ assetGroupId: HK1_GROUP }))
      .catch((e) => e);
    const fictional = await repo
      .create(sg1, assetBase({ assetGroupId: FICTIONAL }))
      .catch((e) => e);

    expect(othersGroup).toBeInstanceOf(UnknownReferenceError);
    expect(fictional).toBeInstanceOf(UnknownReferenceError);
    // Byte-identical: the message is what a caller actually sees.
    expect((fictional as Error).message).toBe((othersGroup as Error).message);
  });

  it('6. cross-entity asset write is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(
        sg1,
        assetBase({ orgEntityId: HK1, assetGroupId: HK1_GROUP, name: 'planted by SG1' }),
      ),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    const after = await repo.list(await clientFor(['HK1']));
    expect(after).toHaveLength(before);
    expect(after.map((a) => a.name)).not.toContain('planted by SG1');
  });

  it('6b. the assets policy refuses on its own, with the counter bypassed', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.asset.create({
        data: {
          orgEntityId: HK1,
          refCode: 'AST-HK1-PLANTED-1',
          name: 'planted straight into the table',
          assetGroupId: HK1_GROUP,
          assetCategory: 'software',
          classification: 'internal',
        },
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((a) => a.refCode)).not.toContain('AST-HK1-PLANTED-1');
  });

  /**
   * ⭐⭐ WHAT 3b AND 6b TURNED OUT NOT TO PROVE. Day-3 meta-verification set
   * BOTH tables' WITH CHECK to `true` and the whole suite stayed green — 78/78.
   *
   * Measured immediately after, with WITH CHECK still `true`:
   *   INSERT ... RETURNING          -> refused, "new row violates row-level security"
   *   the same INSERT, no RETURNING -> INSERT 0 1, HK1's row written by SG1
   *
   * Prisma's `create()` always emits RETURNING and PostgreSQL applies the SELECT
   * policy to the returned row, so 3b/6b were pinning the READ half twice.
   * `createMany` emits no RETURNING.
   *
   * ⚠️ This is not a live exposure — the WITH CHECK is correct today. What was
   * broken is the suite's ability to notice if it stopped being.
   */
  it.each([
    [
      'asset_groups',
      (c: Awaited<ReturnType<typeof clientFor>>) =>
        c.assetGroup.createMany({
          data: [
            {
              orgEntityId: HK1,
              refCode: 'AGRP-HK1-PLANTED-2',
              name: 'planted with no RETURNING',
              assetCategory: 'people' as const,
            },
          ],
        }),
    ],
    [
      'assets',
      (c: Awaited<ReturnType<typeof clientFor>>) =>
        c.asset.createMany({
          data: [
            {
              orgEntityId: HK1,
              refCode: 'AST-HK1-PLANTED-2',
              name: 'planted with no RETURNING',
              assetGroupId: HK1_GROUP,
              assetCategory: 'software' as const,
              classification: 'internal' as const,
            },
          ],
        }),
    ],
  ])('6c. the %s WITH CHECK refuses with no RETURNING to hide behind', async (_t, write) => {
    const sg1 = await clientFor(['SG1']);

    await expect(write(sg1)).rejects.toThrow(/row-level security/i);

    const hk1 = await clientFor(['HK1']);
    const planted = [
      ...(await hk1.assetGroup.findMany({ where: { refCode: 'AGRP-HK1-PLANTED-2' } })),
      ...(await hk1.asset.findMany({ where: { refCode: 'AST-HK1-PLANTED-2' } })),
    ];
    expect(planted).toHaveLength(0);
  });

  it('7. RLS holds at the client, independently of the repository', async () => {
    const sg1 = await clientFor(['SG1']);

    expect(await sg1.assetGroup.findMany({ where: { orgEntityId: HK1 } })).toHaveLength(0);
    expect(await sg1.asset.findMany({ where: { orgEntityId: HK1 } })).toHaveLength(0);
  });

  it('8. a roll-up scope sees its authorised subtree and no more', async () => {
    const apac = await clientFor(['APAC'], true);
    const sg = await clientFor(['SG'], true);

    const apacOwners = new Set((await repo.listGroups(apac)).map((g) => g.orgEntityId));
    const sgOwners = new Set((await repo.listGroups(sg)).map((g) => g.orgEntityId));

    expect(apacOwners.has(SG1)).toBe(true);
    expect(apacOwners.has(HK1)).toBe(true);
    expect(sgOwners.has(SG1)).toBe(true);
    expect(sgOwners.has(HK1)).toBe(false);
  });
});
