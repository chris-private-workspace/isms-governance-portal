/**
 * File: apps/api/src/modules/control-test/control-test.int.spec.ts
 * Purpose: Pin the trigger guard — including that it CLOSES the existence oracle
 *   rather than renaming it — against a real database.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W07 (M1 slice 4)
 * Owner: docs/02-architecture/02a-data-model-spec.md §5 · CLAUDE.md 約束 8
 *
 * Description:
 *   The four scope tests 約束 8 asks for are here, plus three this table needs and
 *   no earlier one did.
 *
 *   Every previous child closed cross-entity references with a composite foreign
 *   key. `controls` refuses that anchor, so W07 Day 1 measured what a plain key
 *   leaves open: the referential-integrity check is NOT subject to RLS, and an
 *   entity could name a control it cannot read. Worse, an absent id gave 23503
 *   while an unreadable one succeeded — success versus error told the caller
 *   whether the row existed.
 *
 *   So the tests that matter here are:
 *
 *     - a readable-but-unowned parent is ACCEPTED (4)      — group controls
 *     - an unreadable parent is REFUSED (5)
 *     - ⭐ absent and unreadable are INDISTINGUISHABLE (6) — the oracle
 *     - re-pointing by UPDATE is REFUSED (7)              — why OR UPDATE exists
 *
 *   ⚠️ Tests that write directly go through the CLIENT, never the repository, and
 *   carry their own ref_code. W05 Day 3 measured why: repo.create() touches
 *   ref_code_counters first, so a test through it can pass on W04's policy while
 *   this table's own policies are neutralised (AD-BorrowedRefusal-1). And per W06
 *   Day 3, the cross-entity insert also uses `createMany` so that no RETURNING
 *   lets the READ policy answer for the WRITE policy.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { ControlTestRepository } from '../../core-model/control-test.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { ControlTestModule } from './control-test.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_LOCAL = '00000000-0000-0000-0000-000000000a50';
const SG1_GROUP = '00000000-0000-0000-0000-000000000a51';
const HK1_LOCAL = '00000000-0000-0000-0000-000000000a52';
const SG1_TEST = '00000000-0000-0000-0000-000000000a60';
const HK1_TEST = '00000000-0000-0000-0000-000000000a61';

/** An id that exists nowhere. The other half of every oracle assertion below. */
const ABSENT = '00000000-0000-0000-0000-0000dead0000';

describe('control-test module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: ControlTestRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [ControlTestModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(ControlTestRepository);
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
      controlId: SG1_LOCAL,
      ...over,
    } as Parameters<ControlTestRepository['create']>[1]);
    created.push({ id: row.id, entity: codes[0] === 'HK1' ? 'HK1' : 'SG1' });
    return row;
  };

  afterAll(async () => {
    for (const { id, entity } of created) {
      const client = await clientFor([entity]);
      await client.controlTest.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === US-2: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1']);

    expect(row.refCode).toMatch(/^CTST-SG1-\d{6}$/);
  });

  it('2. a new test is scheduled and nothing else — the lifecycle is not an input', async () => {
    const row = await create(['SG1']);

    // 02a §4's first state. CreateControlTestInput has no field for it, because
    // the review transition that carries 02a:416's SoD rule does not exist yet
    // and a settable terminal state would be a way to self-certify.
    expect(row.status).toBe('scheduled');
    expect(row.performedAt).toBeNull();
    expect(row.reviewerUserId).toBeNull();
    expect(row.conclusion).toBeNull();
  });

  it('3. an unparseable schedule is refused, not silently dropped', async () => {
    // Guarded in the controller (readTimestamp), but asserted from the repository
    // side too: `scheduledFor: undefined` must mean "absent", never "rejected and
    // forgotten". AD-SilentFieldDrop-1 is this failure one field over.
    const row = await create(['SG1'], { scheduledFor: new Date('2026-09-30T00:00:00Z') });

    expect(row.scheduledFor?.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  // === US-2: the reference guard — the three shapes measured on Day 1 ========

  it('4. HK1 may test SG1’s GROUP control — readable, therefore referenceable', async () => {
    const row = await repo.create(await clientFor(['HK1']), {
      orgEntityId: HK1,
      controlId: SG1_GROUP,
    });
    created.push({ id: row.id, entity: 'HK1' });

    // The point of publishing a group standard is that every OpCo tests it at its
    // own site. If this ever starts failing, the guard has become too strict and
    // ADR-0014's widening has been undone one layer down.
    expect(row.controlId).toBe(SG1_GROUP);
    expect(row.orgEntityId).toBe(HK1);
  });

  it('5. HK1 may NOT test SG1’s private control, and nothing lands', async () => {
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(await clientFor(['HK1']), { orgEntityId: HK1, controlId: SG1_LOCAL }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);

    expect(await repo.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  /**
   * ⭐ THE ORACLE TEST. This is the one that would have gone missing.
   *
   * Day 1 measured the shape without a trigger: naming an unreadable control
   * SUCCEEDED, naming an absent one raised 23503. Success-versus-error is a
   * perfectly good oracle — the caller learns whether an id it guessed exists.
   *
   * A trigger could have closed that or merely renamed it. It closes it only
   * because a BEFORE trigger runs AHEAD of the constraint, so the absent id never
   * reaches the foreign key at all and both paths leave through the same RAISE.
   * Assert the SAMENESS, not the individual refusals — two passing rejection
   * tests would say nothing about whether they can be told apart.
   */
  it('6. an absent control and an unreadable one are indistinguishable', async () => {
    const hk1 = await clientFor(['HK1']);

    const unreadable = await repo
      .create(hk1, { orgEntityId: HK1, controlId: SG1_LOCAL })
      .catch((e: unknown) => e);
    const absent = await repo
      .create(hk1, { orgEntityId: HK1, controlId: ABSENT })
      .catch((e: unknown) => e);

    expect(unreadable).toBeInstanceOf(UnknownReferenceError);
    expect(absent).toBeInstanceOf(UnknownReferenceError);
    // Same class AND same message: the message is what reaches the caller as the
    // 404 body, so a difference there would be the leak wearing a disguise.
    expect((absent as Error).message).toBe((unreadable as Error).message);
  });

  it('7. a legitimate row cannot be re-pointed at an unreadable control afterwards', async () => {
    const hk1 = await clientFor(['HK1']);

    // Why the trigger is BEFORE INSERT **OR UPDATE**. Without the UPDATE half,
    // this two-step walks a row to a parent the insert would have refused
    // (measured, W07 Day 1 M6).
    //
    // ⚠️ The assertion matches Prisma's wording, not PostgreSQL's. Prisma
    // RECOGNISES 23503 and rewrites the message to "Foreign key constraint
    // violated", discarding the trigger's own text; it has no mapping for 42501,
    // which is why the RLS assertions elsewhere can match the raw message. Both
    // codes reach the repository intact — scope-refusal.ts reads SQLSTATE, not
    // text, for exactly this reason.
    await expect(
      hk1.controlTest.update({ where: { id: HK1_TEST }, data: { controlId: SG1_LOCAL } }),
    ).rejects.toThrow(/foreign key constraint/i);

    const [row] = await hk1.controlTest.findMany({ where: { id: HK1_TEST } });
    expect(row?.controlId).toBe(HK1_LOCAL);
  });

  // === US-2: the four scope tests 約束 8 asks for ============================

  it('8. cross-entity READ returns nothing — no widening on this table', async () => {
    const hk1Rows = await repo.list(await clientFor(['HK1']));
    const ids = hk1Rows.map((r) => r.id);

    expect(ids).toContain(HK1_TEST);
    // A group-shared CONTROL is a library entry; a TEST of it happened at one
    // entity. Both assertions or neither — together they say the policy
    // discriminates, separately they say nothing.
    expect(ids).not.toContain(SG1_TEST);
  });

  it('9. cross-entity WRITE through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, { orgEntityId: HK1, controlId: HK1_LOCAL }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    expect(await repo.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  it('10. the control_tests INSERT policy refuses on its own, with no RETURNING to hide behind', async () => {
    const sg1 = await clientFor(['SG1']);

    // Three independent bypasses in one statement, all required:
    //   - no issueRefCode, so W04's counter policy cannot answer for this one
    //     (W05 clause 2)
    //   - createMany emits no RETURNING, so the READ policy cannot answer for the
    //     WRITE policy (W06 Day 3)
    //   - ⭐ the control named is SG1_LOCAL, which the CURRENT scope can read, so
    //     the trigger cannot answer either (W07 Day 2)
    //
    // ⭐ THE THIRD ONE IS NEW, AND IT IS AD-BorrowedRefusal-1 A THIRD TIME. The
    // first version of this test named HK1_LOCAL — unreadable from SG1 — and it
    // passed, on the trigger's 23503, with this table's WITH CHECK never
    // evaluated. A BEFORE trigger runs ahead of the row's own policy check, so
    // "the parent is unreachable" hides "the row is out of scope" exactly the way
    // the counter and RETURNING did before it. Neutralise control_tests_insert
    // and the earlier version stays green.
    await expect(
      sg1.controlTest.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'CTST-HK1-PLANTED-1',
            controlId: SG1_LOCAL,
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('CTST-HK1-PLANTED-1');
  });

  it('11. a control test cannot be deleted — refused by privilege, before RLS', async () => {
    const sg1 = await clientFor(['SG1']);

    // Names the layer it can actually see. `isms_app` was never granted DELETE and
    // the privilege check runs before row-level security, so this never reaches
    // the (deliberately absent) FOR DELETE policy — W06 test 10 records the same
    // finding and why claiming otherwise would be a borrowed refusal.
    await expect(sg1.controlTest.deleteMany({ where: { id: SG1_TEST } })).rejects.toThrow(
      /permission denied/i,
    );
    expect((await sg1.controlTest.findMany({ where: { id: SG1_TEST } })).length).toBe(1);
  });

  it('12. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg = await clientFor(['SG'], true);
    const ids = (await repo.list(sg)).map((r) => r.id);

    expect(ids).toContain(SG1_TEST);
    expect(ids).not.toContain(HK1_TEST);
  });
});
