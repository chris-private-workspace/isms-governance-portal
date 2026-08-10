/**
 * File: apps/api/src/modules/policy/policy.int.spec.ts
 * Purpose: The four scope tests plus catalog governance, through the module graph.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0005-governed-extension-storage.md
 *
 * Description:
 *   entity-scope.int.spec.ts already proves scoping at the client. This file
 *   proves it survives the repository and the module wiring, and adds the two
 *   claims W03 introduced:
 *
 *     - catalog governance holds in the DATABASE, not only in the validator.
 *       Every trigger assertion here bypasses validateExtensions() by writing
 *       through the client directly — otherwise it would be testing the
 *       application layer twice and calling the second one "the database".
 *     - concurrent scopes do not contaminate each other. AD-ScopeConcurrency-1
 *       named this the only isolation failure that does not raise; W02 measured
 *       it once in a scratchpad and left nothing running.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Pin RLS-before-FK ordering (W03) — what makes the write 404 safe
 *   - 2026-08-10: Initial creation (Phase W03)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { PolicyRepository } from '../../core-model/policy.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { PolicyModule } from './policy.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const HK1_POLICY = '00000000-0000-0000-0000-0000000000f1';

describe('policy module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: PolicyRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [PolicyModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(PolicyRepository);
  });

  /**
   * Rows this suite creates, retired in afterAll.
   *
   * ⚠️ Necessary because the integration database is shared across suites and
   * this is the first suite that WRITES. entity-scope.int.spec.ts asserts SG1's
   * exact policy list, so a row left behind by this file fails a test in that
   * one — which is precisely what happened on the first run here.
   *
   * Retired, not deleted: isms_app holds no DELETE privilege (guardrail 3), so
   * the cleanup has to use the same soft-delete the domain does. That is the
   * design working, not an obstacle — a test that could hard-delete would be
   * running with rights the application does not have.
   */
  const created: string[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  afterAll(async () => {
    if (created.length > 0) {
      const sg1 = await clientFor(['SG1']);
      for (const id of created) {
        await sg1.policy.update({ where: { id }, data: { retiredAt: new Date() } });
      }
    }
    await moduleRef.close();
  });

  // === 約束 8, through the repository =======================================

  it('1. cross-entity read: the repository returns only in-scope rows', async () => {
    const rows = await repo.list(await clientFor(['SG1']));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.orgEntityId).toBe(SG1);
  });

  it('2. cross-entity write is refused, and the row is unchanged afterwards', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      repo.create(sg1, { orgEntityId: HK1, title: 'planted by SG1' }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    // The refusal is only half the claim. Re-read as HK1 to prove nothing landed.
    const hk1Rows = await repo.list(await clientFor(['HK1']));
    expect(hk1Rows.map((r) => r.title)).toEqual(['HK1 access control policy']);
  });

  /**
   * The ordering this pins is what makes the controller's 404 safe rather than
   * an oracle. Measured against the running API on 2026-08-10: 4 × SQLSTATE
   * 42501, 0 × 23503 — postgres evaluates the RLS WITH CHECK before the foreign
   * key, so a nonexistent entity id never reaches the constraint that would have
   * told the caller it was nonexistent.
   *
   * If a postgres upgrade ever reverses that, this test fails and the write path
   * has silently regained the ability to distinguish "absent" from "not yours".
   */
  it('2b. a nonexistent entity id is refused the same way as a real out-of-scope one', async () => {
    const sg1 = await clientFor(['SG1']);

    const fictional = await repo
      .create(sg1, { orgEntityId: '11111111-2222-3333-4444-555555555555', title: 'x' })
      .catch((e: unknown) => e);
    const realButOthers = await repo
      .create(sg1, { orgEntityId: HK1, title: 'x' })
      .catch((e: unknown) => e);

    expect(fictional).toBeInstanceOf(ScopeRefusedError);
    expect(realButOthers).toBeInstanceOf(ScopeRefusedError);
  });

  it('3. an out-of-scope id is indistinguishable from one that never existed', async () => {
    const rows = await repo.list(await clientFor(['SG1']));

    // Both are simply absent from what the client can see, which is what lets a
    // controller answer 404 for each without having to know which it was.
    expect(rows.find((r) => r.id === HK1_POLICY)).toBeUndefined();
  });

  it('4. roll-up sees the authorised subtree and nothing above it', async () => {
    const sgSubtree = await repo.list(await clientFor(['SG'], true));
    expect(sgSubtree.map((r) => r.orgEntityId)).toEqual([SG1]);

    const apac = await repo.list(await clientFor(['APAC'], true));
    expect(apac.map((r) => r.orgEntityId).sort()).toEqual([SG1, HK1].sort());
  });

  // === catalog governance, enforced by the DATABASE ==========================
  //
  // These write through the client, NOT through the repository, so the
  // application-layer validator is not in the path. If the trigger were absent
  // every one of them would pass.

  it('the database refuses an undeclared key even when the validator is bypassed', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.policy.create({
        data: { orgEntityId: SG1, title: 'bypass', extensions: { notDeclared: 'x' } },
      }),
    ).rejects.toThrow(/not declared/);
  });

  it('the database refuses a declared key of the wrong type', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.policy.create({
        data: { orgEntityId: SG1, title: 'wrong type', extensions: { cycleCount: 'three' } },
      }),
    ).rejects.toThrow(/expects number/);
  });

  it("the database refuses one entity's use of another entity's declared key", async () => {
    const sg1 = await clientFor(['SG1']);

    // hkRegRef is declared, but declared BY HK1. Being real is not enough.
    await expect(
      sg1.policy.create({
        data: { orgEntityId: SG1, title: 'borrowed', extensions: { hkRegRef: 'HKMA-1' } },
      }),
    ).rejects.toThrow(/not declared/);
  });

  it('accepts a global key and the entity own key through the repository', async () => {
    const sg1 = await clientFor(['SG1']);

    const row = await repo.create(sg1, {
      orgEntityId: SG1,
      title: 'governed extensions accepted',
      extensions: { reviewCycle: 'annual', sgRegRef: 'MAS-1' },
    });
    created.push(row.id);

    expect(row.extensions).toEqual({ reviewCycle: 'annual', sgRegRef: 'MAS-1' });
  });

  it('the repository refuses before reaching the database, with the key named', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      repo.create(sg1, { orgEntityId: SG1, title: 'x', extensions: { nope: 1 } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);
  });

  it('the catalog itself is scoped: SG1 sees global + own, never HK1 own', async () => {
    const sg1 = await clientFor(['SG1']);
    const rows = await sg1.extensionField.findMany({ where: { entityType: 'policy' } });

    expect(rows.map((r) => r.key).sort()).toEqual(['cycleCount', 'reviewCycle', 'sgRegRef']);
  });

  // === AD-ScopeConcurrency-1 ================================================

  it('interleaved scopes do not contaminate each other', async () => {
    const sg1 = await clientFor(['SG1']);
    const hk1 = await clientFor(['HK1']);

    // Interleaved rather than sequential: the failure mode being ruled out is a
    // scope set by one request being visible to another on the same pooled
    // connection, which only appears when they overlap in flight.
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? repo.list(sg1) : repo.list(hk1))),
    );

    results.forEach((rows, i) => {
      const expected = i % 2 === 0 ? SG1 : HK1;
      // Every row, not just the first: contamination shows up as an EXTRA row.
      expect(rows.every((r) => r.orgEntityId === expected)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
    });
  });
});
