/**
 * File: apps/api/src/modules/issue/issue.int.spec.ts
 * Purpose: The four scope tests 約束 8 asks for, against a real database.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W08 (M1 slice 5)
 * Owner: docs/02-architecture/02a-data-model-spec.md §5 · CLAUDE.md 約束 8
 *
 * Description:
 *   Issue is a PARENT, so there is no cross-entity REFERENCE to guard here — that
 *   is action.int.spec.ts's subject. What this file pins is the plain four, plus
 *   the fact that the lifecycle is not an input.
 *
 *   ⚠️ Tests that write directly go through the CLIENT, never the repository, and
 *   carry their own ref_code. W05 Day 3 measured why: repo.create() touches
 *   ref_code_counters first, so a test through it can pass on W04's policy while
 *   this table's own policies are neutralised (AD-BorrowedRefusal-1). And per W06
 *   Day 3 the direct insert uses `createMany`, so no RETURNING lets the READ
 *   policy answer for the WRITE policy.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { IssueRepository } from '../../core-model/issue.repository';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { IssueModule } from './issue.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_ISSUE = '00000000-0000-0000-0000-000000000a80';
const HK1_ISSUE = '00000000-0000-0000-0000-000000000a81';

describe('issue module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: IssueRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [IssueModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(IssueRepository);
  });

  /** Retired, not deleted — and here the database would refuse a delete anyway. */
  const created: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const create = async (codes: string[], over: Record<string, unknown> = {}) => {
    const row = await repo.create(await clientFor(codes), {
      orgEntityId: SG1,
      title: 'Restore drill overdue',
      source: 'test',
      severity: 'high',
      ...over,
    } as Parameters<IssueRepository['create']>[1]);
    created.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  afterAll(async () => {
    for (const { id, entity } of created) {
      const client = await clientFor([entity]);
      await client.issue.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === US-2: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1']);

    expect(row.refCode).toMatch(/^ISSU-SG1-\d{6}$/);
  });

  it('2. a new issue is open and nothing else — the lifecycle is not an input', async () => {
    const row = await create(['SG1']);

    // 02a §4's first state. CreateIssueInput has no field for it: every other
    // value is reached by a transition, and 02a:409 attaches a rule to one of
    // them (">=1 action before Remediated") that nothing in this slice enforces.
    expect(row.status).toBe('open');
  });

  it('3. an unassessed issue carries NULL, not a plausible default', async () => {
    const row = await create(['SG1']);

    // The same judgement Risk's generated columns record: absent must read as
    // absent. A due date defaulted to "today + 30" would be a commitment nobody
    // made, and an owner defaulted to the creator would be an accountability
    // claim the platform invented.
    expect(row.dueDate).toBeNull();
    expect(row.ownerUserId).toBeNull();
    expect(row.description).toBeNull();
  });

  it('4. severity and source round-trip as given — no coercion, no default', async () => {
    const row = await create(['SG1'], { source: 'manual', severity: 'critical' });

    expect(row.source).toBe('manual');
    expect(row.severity).toBe('critical');
  });

  // === US-2: the four scope tests 約束 8 asks for ============================

  it('5. cross-entity READ returns nothing — no widening on this table', async () => {
    const ids = (await repo.list(await clientFor(['HK1']))).map((r) => r.id);

    expect(ids).toContain(HK1_ISSUE);
    // A group-shared CONTROL is a library entry; a FINDING happened at one entity.
    // Both assertions or neither — together they say the policy discriminates,
    // separately they say nothing.
    expect(ids).not.toContain(SG1_ISSUE);
  });

  it('6. cross-entity WRITE through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, {
        orgEntityId: HK1,
        title: 'planted',
        source: 'manual',
        severity: 'low',
      }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    expect(await repo.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  it('7. the issues INSERT policy refuses on its own, with no RETURNING to hide behind', async () => {
    const sg1 = await clientFor(['SG1']);

    // Two independent bypasses in one statement, both required:
    //   - no issueRefCode, so W04's counter policy cannot answer for this one
    //     (W05 clause 2)
    //   - createMany emits no RETURNING, so the READ policy cannot answer for the
    //     WRITE policy (W06 Day 3)
    //
    // Unlike control_tests there is no third: this table references no parent, so
    // no trigger and no composite key can get in front of its WITH CHECK. That is
    // what makes this the plain case — and why the interesting version of this
    // test lives in action.int.spec.ts.
    await expect(
      sg1.issue.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'ISSU-HK1-PLANTED-1',
            title: 'planted',
            source: 'manual',
            severity: 'low',
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('ISSU-HK1-PLANTED-1');
  });

  it('8. an issue cannot be deleted — refused by privilege, before RLS', async () => {
    const sg1 = await clientFor(['SG1']);

    // Names the layer it can actually see. `isms_app` was never granted DELETE and
    // the privilege check runs before row-level security, so this never reaches
    // the (deliberately absent) FOR DELETE policy — W06 test 10 records the same
    // finding and why claiming otherwise would be a borrowed refusal.
    await expect(sg1.issue.deleteMany({ where: { id: SG1_ISSUE } })).rejects.toThrow(
      /permission denied/i,
    );
    expect((await sg1.issue.findMany({ where: { id: SG1_ISSUE } })).length).toBe(1);
  });

  it('9. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg = await clientFor(['SG'], true);
    const ids = (await repo.list(sg)).map((r) => r.id);

    expect(ids).toContain(SG1_ISSUE);
    expect(ids).not.toContain(HK1_ISSUE);
  });
});
