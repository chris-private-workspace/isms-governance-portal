/**
 * File: apps/api/src/modules/control/control.int.spec.ts
 * Purpose: Pin the asymmetry — group-shared controls are readable by everyone and
 *   writable by nobody but their owner — against a real database.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W06 (M1 slice 3)
 * Owner: docs/14-adr/0014-row-level-entity-scope-and-per-command-policies.md
 *
 * Description:
 *   Every other table's isolation suite asks one question: does this entity see
 *   only its own rows? Here the answer is deliberately NO, and that makes the
 *   suite's job harder — "HK1 can read SG1's group control" and "the policy is
 *   broken" look identical unless BOTH directions are pinned. W05's M2 gap was
 *   exactly this shape: half a rule tested, the other half silently inert.
 *
 *   So each of the four measured holes gets a test, and each is written against
 *   the mechanism rather than through the repository:
 *
 *     - read across entities SUCCEEDS for group rows (4)          — the widening
 *     - update across entities FAILS                              (6)
 *     - minting a group row FAILS                                 (7)
 *     - promoting your own row FAILS                              (8)
 *     - stealing a group row FAILS                                (9)
 *     - deleting anything FAILS, including your own               (10, 11)
 *
 *   ⚠️ Tests 6-11 write through the CLIENT, not the repository, and never carry a
 *   reference code. W05 Day 3 measured why: repo.create() touches
 *   ref_code_counters first, so a test going through it can pass on W04's policy
 *   while this table's own policies are neutralised (AD-BorrowedRefusal-1). If
 *   these went through the repository they would prove the counter works.
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { ControlRepository } from '../../core-model/control.repository';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { ControlModule } from './control.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_LOCAL = '00000000-0000-0000-0000-000000000a50';
const SG1_GROUP = '00000000-0000-0000-0000-000000000a51';
const HK1_LOCAL = '00000000-0000-0000-0000-000000000a52';

describe('control module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: ControlRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [ControlModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(ControlRepository);
  });

  /** Retired, not deleted — and here the database would refuse a delete anyway. */
  const created: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const base = (over: Record<string, unknown> = {}) => ({
    orgEntityId: SG1,
    title: 'Quarterly privileged access recertification',
    type: 'detective' as const,
    nature: 'manual' as const,
    frequency: 'quarterly' as const,
    ...over,
  });

  const create = async (codes: string[], over: Record<string, unknown> = {}) => {
    const row = await repo.create(await clientFor(codes), base(over));
    created.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  afterAll(async () => {
    for (const { id, entity } of created) {
      const client = await clientFor([entity]);
      await client.control.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === US-3: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1'], { title: 'ref code shape' });

    expect(row.refCode).toMatch(/^CTRL-SG1-\d{6}$/);
  });

  it('2. a new control is entity-local and not_tested — neither is supplied by the caller', async () => {
    const row = await create(['SG1']);

    expect(row.appliesToScope).toBe('entity');
    // Not a placeholder: ControlTest does not exist until M7, so this is the
    // specified answer (02a:125), and CreateControlInput has no field for it.
    expect(row.effectiveness).toBe('not_tested');
  });

  it('3. framework_refs is an array and defaults to empty, never NULL', async () => {
    const withRefs = await create(['SG1'], { frameworkRefs: ['ISO 27001 A.5.15', 'A.8.2'] });
    const without = await create(['SG1']);

    expect(withRefs.frameworkRefs).toEqual(['ISO 27001 A.5.15', 'A.8.2']);
    expect(without.frameworkRefs).toEqual([]);
  });

  // === US-4: the read half of ADR-0014 — deliberately NOT isolation ===========

  it('4. HK1 reads SG1’s group-shared control, and not SG1’s local one', async () => {
    const hk1Rows = await repo.list(await clientFor(['HK1']));
    const ids = hk1Rows.map((r) => r.id);

    // The widening, working.
    expect(ids).toContain(SG1_GROUP);
    // The widening, NOT leaking anything else. Both assertions or neither:
    // together they say the policy discriminates, separately they say nothing.
    expect(ids).not.toContain(SG1_LOCAL);
    expect(ids).toContain(HK1_LOCAL);
  });

  it('5. RLS holds at the client: asking for SG1’s rows explicitly returns only the group one', async () => {
    const hk1 = await clientFor(['HK1']);
    const rows = await hk1.control.findMany({ where: { orgEntityId: SG1 } });

    expect(rows.map((r) => r.id)).toEqual([SG1_GROUP]);
  });

  // === US-4: the write half — the four holes measured on Day 1 ===============

  it('6. HK1 cannot update SG1’s group-shared control, and it is unchanged after', async () => {
    const hk1 = await clientFor(['HK1']);

    // 0 rows, not an error: the update policy's USING excludes the row, so it is
    // not selected at all. This is what makes 404-not-403 fall out of the schema
    // rather than out of a controller remembering to translate.
    const result = await hk1.control.updateMany({
      where: { id: SG1_GROUP },
      data: { title: 'taken over by HK1' },
    });
    expect(result.count).toBe(0);

    const [row] = await hk1.control.findMany({ where: { id: SG1_GROUP } });
    expect(row?.title).toBe('Group password standard');
  });

  it('7. no entity can mint a group-shared control, even one it would own', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.control.create({
        data: {
          orgEntityId: SG1,
          refCode: 'CTRL-SG1-MINTED-1',
          title: 'published to all thirteen OpCos by one of them',
          type: 'preventive',
          nature: 'automated',
          frequency: 'continuous',
          appliesToScope: 'group',
        },
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await clientFor(['HK1']);
    const visible = (await hk1.control.findMany()).map((r) => r.refCode);
    expect(visible).not.toContain('CTRL-SG1-MINTED-1');
  });

  it('8. an entity cannot promote its own control to group-shared', async () => {
    const sg1 = await clientFor(['SG1']);

    // The second door to the same escalation: create it local, then widen it.
    // Measured on Day 1 as succeeding under a single FOR ALL policy.
    const result = await sg1.control
      .updateMany({ where: { id: SG1_LOCAL }, data: { appliesToScope: 'group' } })
      .catch((e: unknown) => e);

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toMatch(/row-level security/i);

    const hk1 = await clientFor(['HK1']);
    expect((await hk1.control.findMany()).map((r) => r.id)).not.toContain(SG1_LOCAL);
  });

  it('9. HK1 cannot claim SG1’s group control as its own', async () => {
    const hk1 = await clientFor(['HK1']);

    // ⭐ THE HOLE BOTH REJECTED SHAPES LEFT OPEN (Day 1, cases A6/B6). Under a
    // single FOR ALL policy this succeeded: USING passed because the row was
    // still group-shared, WITH CHECK passed because the new owner was the
    // caller — and the control vanished from the other twelve entities.
    const result = await hk1.control.updateMany({
      where: { id: SG1_GROUP },
      data: { orgEntityId: HK1, appliesToScope: 'entity' },
    });
    expect(result.count).toBe(0);

    const sg1 = await clientFor(['SG1']);
    const [row] = await sg1.control.findMany({ where: { id: SG1_GROUP } });
    expect(row?.orgEntityId).toBe(SG1);
    expect(row?.appliesToScope).toBe('group');
  });

  /**
   * ⭐ TWO LAYERS REFUSE DELETE, AND THIS SUITE CAN ONLY SEE THE OUTER ONE.
   *
   * The first version of these tests asserted `count === 0`, which is what the
   * absent FOR DELETE policy produces. They failed — with `permission denied for
   * table controls`. The privilege check runs BEFORE row-level security, and
   * `isms_app` was never granted DELETE, so the statement never reaches the
   * policy layer at all.
   *
   * That is the correct design and both layers are real, but it changes what
   * these tests are allowed to claim:
   *
   *   - observable here: the GRANT refuses. ⚠️ Which is the same thing
   *     AD-GroupRowTheft-1 says is currently load-bearing everywhere else.
   *   - NOT observable here: that RLS would also refuse. That was measured
   *     directly on Day 1 with DELETE deliberately granted
   *     (artifacts/d1-rls-probe2-default-deny.out, N1/N2 — 0 rows, including the
   *     caller's own row), and it cannot be re-measured from this role without
   *     handing the application the very privilege the design withholds.
   *
   * So: assert the refusal and name the layer. Do not write "the policy refused"
   * over evidence that says "the grant refused" — that is the borrowed-refusal
   * mistake this project keeps finding (AD-BorrowedRefusal-1).
   */
  it('10. a group-shared control cannot be deleted — refused by privilege, before RLS', async () => {
    const hk1 = await clientFor(['HK1']);

    await expect(hk1.control.deleteMany({ where: { id: SG1_GROUP } })).rejects.toThrow(
      /permission denied/i,
    );

    const sg1 = await clientFor(['SG1']);
    expect((await sg1.control.findMany({ where: { id: SG1_GROUP } })).length).toBe(1);
  });

  it('11. an entity cannot delete even its OWN control', async () => {
    const sg1 = await clientFor(['SG1']);

    // ⚠️ If this ever succeeds, someone granted DELETE. The second layer should
    // then still hold (Day 1, N1) — but that would need its own test, because
    // the moment the grant exists this one stops covering anything.
    await expect(sg1.control.deleteMany({ where: { id: SG1_LOCAL } })).rejects.toThrow(
      /permission denied/i,
    );
    expect((await sg1.control.findMany({ where: { id: SG1_LOCAL } })).length).toBe(1);
  });

  // === US-4: the ordinary three of 約束 8's four ==============================

  it('12. cross-entity write through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, base({ orgEntityId: HK1, title: 'planted by SG1' })),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    const after = await repo.list(await clientFor(['HK1']));
    expect(after).toHaveLength(before);
    expect(after.map((r) => r.title)).not.toContain('planted by SG1');
  });

  it('12b. the controls policy refuses a cross-entity write on its own, without the counter', async () => {
    const sg1 = await clientFor(['SG1']);

    // Bypasses issueRefCode entirely (W05 clause 2). Without this, test 12 would
    // still pass with every policy on this table neutralised.
    await expect(
      sg1.control.create({
        data: {
          orgEntityId: HK1,
          refCode: 'CTRL-HK1-PLANTED-1',
          title: 'planted straight into the table',
          type: 'corrective',
          nature: 'hybrid',
          frequency: 'annual',
        },
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('CTRL-HK1-PLANTED-1');
  });

  it('13. a roll-up scope sees its authorised subtree, plus the group library', async () => {
    const sg = await clientFor(['SG'], true);
    const owners = new Set((await repo.list(sg)).map((r) => r.orgEntityId));

    expect(owners.has(SG1)).toBe(true);
    // HK1's LOCAL controls stay out of SG's subtree...
    const ids = (await repo.list(sg)).map((r) => r.id);
    expect(ids).not.toContain(HK1_LOCAL);
    // ...while the group library is visible to it like everyone else.
    expect(ids).toContain(SG1_GROUP);
  });
});
