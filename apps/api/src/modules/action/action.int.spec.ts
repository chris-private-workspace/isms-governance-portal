/**
 * File: apps/api/src/modules/action/action.int.spec.ts
 * Purpose: Pin that the COMPOSITE KEY is what refuses another entity's issue —
 *   including that it closes the existence oracle rather than renaming it.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W08 (M1 slice 5)
 * Owner: docs/02-architecture/02a-data-model-spec.md §5 · CLAUDE.md 約束 8
 *
 * Description:
 *   The four scope tests 約束 8 asks for, plus three about the parent reference.
 *
 *   W07's design note (D1) chose a BEFORE trigger for control_tests because
 *   `controls` cannot offer a composite anchor. `issues` can, so this table is
 *   back to the key W05 used — the third child, the second mechanism, the same
 *   invariant. Tests 4-6 are the ones that say the mechanism is really doing it:
 *
 *     - another entity's issue is REFUSED (4)
 *     - ⭐ absent and unreadable are INDISTINGUISHABLE (5)  — the oracle
 *     - re-pointing by UPDATE is REFUSED (6)
 *
 *   ⚠️ Test 4 is Day 3's N1 target: with the key dropped it must go GREEN. If it
 *   stays red something else is refusing, and AD-BorrowedRefusal-1 is at four.
 *
 *   ⚠️ Tests that write directly go through the CLIENT, never the repository, and
 *   carry their own ref_code — see issue.int.spec.ts for the two bypasses that
 *   requires. Test 8 needs a THIRD, and it is the interesting one here.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { ActionRepository } from '../../core-model/action.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { ActionModule } from './action.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_ISSUE = '00000000-0000-0000-0000-000000000a80';
const HK1_ISSUE = '00000000-0000-0000-0000-000000000a81';
const SG1_ACTION = '00000000-0000-0000-0000-000000000a90';
const HK1_ACTION = '00000000-0000-0000-0000-000000000a91';

/** An id that exists nowhere. The other half of every oracle assertion below. */
const ABSENT = '00000000-0000-0000-0000-0000dead0000';

describe('action module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: ActionRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [ActionModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(ActionRepository);
  });

  const created: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const create = async (codes: string[], over: Record<string, unknown> = {}) => {
    const row = await repo.create(await clientFor(codes), {
      orgEntityId: SG1,
      issueId: SG1_ISSUE,
      description: 'Schedule a restore drill',
      ...over,
    } as Parameters<ActionRepository['create']>[1]);
    created.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  afterAll(async () => {
    for (const { id, entity } of created) {
      const client = await clientFor([entity]);
      await client.action.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === US-3: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1']);

    expect(row.refCode).toMatch(/^ACTN-SG1-\d{6}$/);
  });

  it('2. a new action is open and unfinished — completion is not an input', async () => {
    const row = await create(['SG1']);

    // 02a:398's first state. completedAt and verifiedBy are absent from
    // CreateActionInput because setting all three at once is an assignee signing
    // off their own work.
    expect(row.status).toBe('open');
    expect(row.completedAt).toBeNull();
    expect(row.verifiedBy).toBeNull();
  });

  it('3. an action attaches to its own entity’s issue', async () => {
    const row = await create(['SG1']);

    expect(row.issueId).toBe(SG1_ISSUE);
    expect(row.orgEntityId).toBe(SG1);
  });

  // === US-4: the reference guard — the composite key, and proof it is the one ===

  /**
   * ⭐ DAY 3's N1 TARGET.
   *
   * SG1 opens an action, in its own entity, against HK1's issue. RLS passes —
   * the ROW is in scope — so whatever refuses this is the composite key, which
   * cannot match (HK1_ISSUE, SG1). Drop `actions_issue_id_org_entity_id_fkey` and
   * this must go green; if it does not, something else is doing the work.
   *
   * ⚠️ Unlike control_tests test 4, there is no legitimate cross-entity case to
   * balance this against. A group-shared control is a library entry every OpCo
   * tests at its own site; a finding at HK1 is not something SG1 remediates.
   */
  it('4. SG1 may NOT action HK1’s issue, and nothing lands', async () => {
    const before = (await repo.list(await clientFor(['SG1']))).length;

    await expect(
      repo.create(await clientFor(['SG1']), {
        orgEntityId: SG1,
        issueId: HK1_ISSUE,
        description: 'reaching across',
      }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);

    expect(await repo.list(await clientFor(['SG1']))).toHaveLength(before);
  });

  /**
   * ⭐ THE ORACLE TEST. Two passing rejection tests would say nothing about
   * whether the caller can tell the two cases apart — assert the SAMENESS.
   *
   * W05 measured this for assets -> asset_groups and W07 had to rebuild it with a
   * trigger. Here it is free again: one constraint produces one error for
   * "belongs to someone else" and for "does not exist", because a composite key
   * has no way to report which half of the pair failed.
   */
  it('5. an absent issue and another entity’s issue are indistinguishable', async () => {
    const sg1 = await clientFor(['SG1']);
    const body = { orgEntityId: SG1, description: 'x' };

    const unreadable = await repo
      .create(sg1, { ...body, issueId: HK1_ISSUE })
      .catch((e: unknown) => e);
    const absent = await repo.create(sg1, { ...body, issueId: ABSENT }).catch((e: unknown) => e);

    expect(unreadable).toBeInstanceOf(UnknownReferenceError);
    expect(absent).toBeInstanceOf(UnknownReferenceError);
    // Same class AND same message: the message is what reaches the caller as the
    // 404 body, so a difference there would be the leak wearing a disguise.
    expect((absent as Error).message).toBe((unreadable as Error).message);
  });

  it('6. a legitimate row cannot be re-pointed at another entity’s issue afterwards', async () => {
    const sg1 = await clientFor(['SG1']);

    // W07 needed `BEFORE INSERT OR UPDATE` on its trigger to close this two-step.
    // A foreign key covers UPDATE without being asked, which is one fewer thing
    // that can be forgotten — and the reason to prefer the key where it fits.
    await expect(
      sg1.action.update({ where: { id: SG1_ACTION }, data: { issueId: HK1_ISSUE } }),
    ).rejects.toThrow(/foreign key constraint/i);

    const [row] = await sg1.action.findMany({ where: { id: SG1_ACTION } });
    expect(row?.issueId).toBe(SG1_ISSUE);
  });

  // === US-3: the four scope tests 約束 8 asks for ============================

  it('7. cross-entity READ returns nothing', async () => {
    const ids = (await repo.list(await clientFor(['HK1']))).map((r) => r.id);

    expect(ids).toContain(HK1_ACTION);
    expect(ids).not.toContain(SG1_ACTION);
  });

  it('8. the actions INSERT policy refuses on its own, with nothing in front of it', async () => {
    const sg1 = await clientFor(['SG1']);

    // Three independent bypasses in one statement, all required:
    //   - no issueRefCode, so W04's counter policy cannot answer (W05 clause 2)
    //   - createMany emits no RETURNING, so the READ policy cannot answer (W06)
    //   - ⭐ the issue named is HK1_ISSUE and the row is HK1, so the pair MATCHES
    //     and the composite key is satisfied. It cannot answer either.
    //
    // ⭐ THAT THIRD ONE IS AD-BorrowedRefusal-1 A FOURTH TIME, pre-empted. The
    // obvious version of this test names SG1_ISSUE with orgEntityId HK1 — and it
    // would pass on the KEY's 23503, with actions_insert never evaluated. Three
    // phases, three different stand-ins (counter, RETURNING, trigger); the only
    // reliable check is that neutralising this policy turns this test red, which
    // is Day 3's N3.
    await expect(
      sg1.action.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'ACTN-HK1-PLANTED-1',
            issueId: HK1_ISSUE,
            description: 'planted',
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('ACTN-HK1-PLANTED-1');
  });

  it('9. cross-entity WRITE through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, { orgEntityId: HK1, issueId: HK1_ISSUE, description: 'planted' }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    expect(await repo.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  it('10. an action cannot be deleted — refused by privilege, before RLS', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(sg1.action.deleteMany({ where: { id: SG1_ACTION } })).rejects.toThrow(
      /permission denied/i,
    );
    expect((await sg1.action.findMany({ where: { id: SG1_ACTION } })).length).toBe(1);
  });

  it('11. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg = await clientFor(['SG'], true);
    const ids = (await repo.list(sg)).map((r) => r.id);

    expect(ids).toContain(SG1_ACTION);
    expect(ids).not.toContain(HK1_ACTION);
  });
});
