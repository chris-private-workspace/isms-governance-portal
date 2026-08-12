/**
 * File: apps/api/src/modules/evidence/evidence.int.spec.ts
 * Purpose: Pin what holds a polymorphic reference together when there is no
 *   foreign key at all, against a real database.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W07 (M1 slice 4)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md guardrail 5
 *
 * Description:
 *   `evidence.linked_id` has no foreign key — 02a:227 is polymorphic, and a column
 *   cannot reference three tables. W07 Day 1 measured what that leaves: a row
 *   naming another entity's record was accepted (M3), and so was a row naming an
 *   id that exists nowhere (M3b). Nothing objected to either.
 *
 *   So the trigger here is doing TWO jobs, and both need their own test:
 *
 *     - it is the SCOPE guard        (4, 5)
 *     - it is the MISSING INTEGRITY  (6) — garbage is refused
 *     - and the two are indistinguishable (5) — the oracle stays closed
 *
 *   ⚠️ Test 7 writes through the CLIENT with its own ref_code and via createMany,
 *   for the two reasons W05 and W06 measured: the counter must not be able to
 *   answer for this table's policy, and RETURNING must not let the READ policy
 *   answer for the WRITE policy.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { EvidenceRepository } from '../../core-model/evidence.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { EvidenceModule } from './evidence.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_TEST = '00000000-0000-0000-0000-000000000a60';
const HK1_TEST = '00000000-0000-0000-0000-000000000a61';
const SG1_EVID = '00000000-0000-0000-0000-000000000a70';
const HK1_EVID = '00000000-0000-0000-0000-000000000a71';

/** An id that exists nowhere. */
const ABSENT = '00000000-0000-0000-0000-0000dead0000';

const HASH = 'sha256:1111111111111111111111111111111111111111111111111111111111111111';

describe('evidence module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: EvidenceRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [EvidenceModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(EvidenceRepository);
  });

  const created: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const create = async (codes: string[], over: Record<string, unknown> = {}) => {
    const row = await repo.create(await clientFor(codes), {
      orgEntityId: SG1,
      kind: 'screenshot',
      uriOrBlobRef: 'file://int/evidence.png',
      hash: HASH,
      linkedId: SG1_TEST,
      ...over,
    } as Parameters<EvidenceRepository['create']>[1]);
    created.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  afterAll(async () => {
    for (const { id, entity } of created) {
      const client = await clientFor([entity]);
      await client.evidence.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === US-3: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1']);

    expect(row.refCode).toMatch(/^EVID-SG1-\d{6}$/);
  });

  it('2. linked_type is set here, never accepted — it has exactly one legal value', async () => {
    const row = await create(['SG1']);

    // A field with one legal answer is not a field (ControlRepository records the
    // same reasoning for appliesToScope). It becomes an input in the same change
    // that teaches the trigger a second branch.
    expect(row.linkedType).toBe('control_test');
  });

  it('3. collected_at defaults to now rather than to NULL', async () => {
    const before = Date.now();
    const row = await create(['SG1']);

    expect(row.collectedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  // === US-3: the trigger, doing both of its jobs =============================

  it('4. evidence attaches to this entity’s own test', async () => {
    const row = await create(['HK1'], { orgEntityId: HK1, linkedId: HK1_TEST });

    expect(row.linkedId).toBe(HK1_TEST);
  });

  /**
   * ⭐ Both halves of the guard in one assertion pair.
   *
   * Without the trigger BOTH of these succeed — measured, W07 Day 1 M3 and M3b.
   * With it, both are refused, and refused IDENTICALLY: a caller cannot use the
   * error to learn whether the id it named exists somewhere it cannot see.
   */
  it('5. another entity’s test and an absent id are refused, and indistinguishably', async () => {
    const hk1 = await clientFor(['HK1']);

    const other = await repo
      .create(hk1, {
        orgEntityId: HK1,
        kind: 'export',
        uriOrBlobRef: 'file://x',
        hash: HASH,
        linkedId: SG1_TEST,
      })
      .catch((e: unknown) => e);
    const absent = await repo
      .create(hk1, {
        orgEntityId: HK1,
        kind: 'export',
        uriOrBlobRef: 'file://x',
        hash: HASH,
        linkedId: ABSENT,
      })
      .catch((e: unknown) => e);

    expect(other).toBeInstanceOf(UnknownReferenceError);
    expect(absent).toBeInstanceOf(UnknownReferenceError);
    expect((absent as Error).message).toBe((other as Error).message);
  });

  it('6. the trigger supplies the integrity the missing foreign key would have', async () => {
    const hk1 = await clientFor(['HK1']);
    const before = (await repo.list(hk1)).length;

    // ⚠️ This is the assertion that has nothing else standing behind it. On every
    // other table a garbage reference is refused by a real constraint; here the
    // column has none, and Day 1 M3b watched pure garbage land. If the trigger is
    // ever dropped, this is the test that notices.
    await expect(
      repo.create(hk1, {
        orgEntityId: HK1,
        kind: 'log',
        uriOrBlobRef: 'file://x',
        hash: HASH,
        linkedId: ABSENT,
      }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);

    expect(await repo.list(hk1)).toHaveLength(before);
  });

  // === US-3: the four scope tests 約束 8 asks for ============================

  it('7. cross-entity READ returns nothing', async () => {
    const ids = (await repo.list(await clientFor(['HK1']))).map((r) => r.id);

    expect(ids).toContain(HK1_EVID);
    expect(ids).not.toContain(SG1_EVID);
  });

  it('8. cross-entity WRITE through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, {
        orgEntityId: HK1,
        kind: 'screenshot',
        uriOrBlobRef: 'file://planted',
        hash: HASH,
        linkedId: HK1_TEST,
      }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    expect(await repo.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  it('9. the evidence INSERT policy refuses on its own, with no RETURNING to hide behind', async () => {
    const sg1 = await clientFor(['SG1']);

    // ⭐ `linkedId` is SG1_TEST — readable from THIS scope — on purpose. Naming
    // HK1_TEST instead makes the test pass on the trigger's 23503 while this
    // table's WITH CHECK is never evaluated, because a BEFORE trigger runs ahead
    // of the row's own policy check. That is AD-BorrowedRefusal-1 in its third
    // shape (after the ref-code counter and RETURNING), and the first version of
    // this test had it.
    await expect(
      sg1.evidence.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'EVID-HK1-PLANTED-1',
            kind: 'screenshot',
            uriOrBlobRef: 'file://planted',
            hash: HASH,
            collectedAt: new Date(),
            linkedType: 'control_test',
            linkedId: SG1_TEST,
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('EVID-HK1-PLANTED-1');
  });

  it('10. evidence cannot be deleted — refused by privilege, before RLS', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(sg1.evidence.deleteMany({ where: { id: SG1_EVID } })).rejects.toThrow(
      /permission denied/i,
    );
    expect((await sg1.evidence.findMany({ where: { id: SG1_EVID } })).length).toBe(1);
  });

  it('11. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg = await clientFor(['SG'], true);
    const ids = (await repo.list(sg)).map((r) => r.id);

    expect(ids).toContain(SG1_EVID);
    expect(ids).not.toContain(HK1_EVID);
  });
});
