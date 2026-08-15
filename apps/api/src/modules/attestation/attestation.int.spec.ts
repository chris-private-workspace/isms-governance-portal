/**
 * File: apps/api/src/modules/attestation/attestation.int.spec.ts
 * Purpose: Pin what holds the SECOND polymorphic reference together, and where
 *   that guarantee legitimately stops.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W14 (M1 slice 9)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md guardrail 5
 *
 * Description:
 *   `attestations.subject_id` has no foreign key — 02a:235 is polymorphic, and a
 *   column cannot reference two tables. Day 1 shipped the table WITHOUT the guard
 *   so that what an unguarded polymorphic column accepts stayed measurable, the
 *   way W07 Day 1 measured it for evidence (M3, M3b).
 *
 *   ⛔ THE PAIR THAT MAKES THIS FILE DIFFERENT FROM ITS SIBLING NEXT DOOR is
 *   tests 7 and 8. Evidence points at one table, so "the trigger refuses
 *   cross-entity subjects" is simply true there. Attestation points at two, and
 *   `controls_read` widens for `applies_to_scope = 'group'` (ADR-0014) — so a
 *   group-shared control IS reachable from another entity, deliberately
 *   (02a:434). Test 7 asserts that acceptance and test 8 asserts the refusal for
 *   an entity-local control, because a single test naming either one alone would
 *   describe half the behaviour while sounding like all of it.
 *
 *   That distinction came out of W14 Day 0 (D5). Written as one test against a
 *   group control, the refusal assertion would have passed before the trigger
 *   existed and after it — AD-VacuousScopeTest-1 exactly.
 *
 *   ⚠️ Nothing here retires what it creates, unlike evidence.int.spec.ts:88.
 *   That file's afterAll calls `update({retiredAt})`; this table has no UPDATE
 *   grant and no UPDATE policy (Day 1), so the same cleanup would raise
 *   "permission denied" — which is the decision working, not a gap. Assertions
 *   therefore name ids and ref_codes rather than comparing list lengths.
 *
 * Created: 2026-08-15 (Phase W14)
 * Last Modified: 2026-08-15
 *
 * Modification History (newest-first):
 *   - 2026-08-15: Initial creation (Phase W14)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { AttestationRepository } from '../../core-model/attestation.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { AttestationModule } from './attestation.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

const SG1_POLICY = '00000000-0000-0000-0000-0000000000f0';
const HK1_POLICY = '00000000-0000-0000-0000-0000000000f1';

/** `applies_to_scope = 'entity'`, owned by SG1 — invisible to HK1. */
const SG1_CONTROL = '00000000-0000-0000-0000-000000000a50';

/**
 * ⭐ `applies_to_scope = 'group'`, ALSO owned by SG1 — and readable by HK1, which
 * is the whole point of tests 7/8. int-global-setup.js:180 seeds it through the
 * owner connection precisely so "HK1 can read it" is a real cross-entity read.
 */
const GROUP_CONTROL = '00000000-0000-0000-0000-000000000a51';

/** An id that exists nowhere. */
const ABSENT = '00000000-0000-0000-0000-0000dead0000';

/** Seeded, one per entity, each on that entity's own policy. */
const SG1_ATT = '00000000-0000-0000-0000-000000000ac0';
const HK1_ATT = '00000000-0000-0000-0000-000000000ac1';

describe('attestation module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: AttestationRepository;

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const create = async (codes: string[], over: Record<string, unknown> = {}) =>
    repo.create(await clientFor(codes), {
      orgEntityId: SG1,
      subjectType: 'policy',
      subjectId: SG1_POLICY,
      result: 'acknowledged',
      ...over,
    } as Parameters<AttestationRepository['create']>[1]);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AttestationModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(AttestationRepository);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  // === US-1: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1']);

    expect(row.refCode).toMatch(/^ATT-SG1-\d{6}$/);
  });

  it('2. subject_type IS accepted from the caller — both values are legal', async () => {
    // The mirror of evidence.int.spec.ts test 2. There the enum has one value so
    // the repository sets it; here both are legal from the first migration and
    // only the caller knows which it means.
    const onPolicy = await create(['SG1']);
    const onControl = await create(['SG1'], {
      subjectType: 'control',
      subjectId: SG1_CONTROL,
    });

    expect(onPolicy.subjectType).toBe('policy');
    expect(onControl.subjectType).toBe('control');
  });

  it('3. attested_at defaults to now rather than to NULL', async () => {
    const before = Date.now();
    const row = await create(['SG1']);

    expect(row.attestedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  // === US-2: the trigger, doing both of its jobs ============================

  it('4. an attestation attaches to this entity’s own policy', async () => {
    const row = await create(['HK1'], { orgEntityId: HK1, subjectId: HK1_POLICY });

    expect(row.subjectId).toBe(HK1_POLICY);
  });

  /**
   * ⭐ Both halves of the guard in one assertion pair.
   *
   * Without the trigger BOTH of these succeed. With it, both are refused, and
   * refused IDENTICALLY: a caller cannot use the error to learn whether the id it
   * named exists somewhere it cannot see.
   */
  it('5. another entity’s policy and an absent id are refused, and indistinguishably', async () => {
    const hk1 = await clientFor(['HK1']);

    const other = await repo
      .create(hk1, {
        orgEntityId: HK1,
        subjectType: 'policy',
        subjectId: SG1_POLICY,
        result: 'acknowledged',
      })
      .catch((e: unknown) => e);
    const absent = await repo
      .create(hk1, {
        orgEntityId: HK1,
        subjectType: 'policy',
        subjectId: ABSENT,
        result: 'acknowledged',
      })
      .catch((e: unknown) => e);

    expect(other).toBeInstanceOf(UnknownReferenceError);
    expect(absent).toBeInstanceOf(UnknownReferenceError);
    expect((absent as Error).message).toBe((other as Error).message);
  });

  it('6. the trigger supplies the integrity the missing foreign key would have', async () => {
    const hk1 = await clientFor(['HK1']);

    // ⚠️ Same standing as evidence.int.spec.ts test 6: nothing else is behind this
    // assertion. `subject_id` has no constraint of any kind, so if the trigger is
    // ever dropped, pure garbage lands and this is the test that notices.
    await expect(
      repo.create(hk1, {
        orgEntityId: HK1,
        subjectType: 'control',
        subjectId: ABSENT,
        result: 'acknowledged',
      }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);

    const ids = (await repo.list(hk1)).map((r) => r.subjectId);
    expect(ids).not.toContain(ABSENT);
  });

  // === US-2: ⭐ where the guarantee legitimately stops (Day 0 D5) ============

  /**
   * ⛔ READ THIS BEFORE CHANGING TEST 5 OR 8.
   *
   * This is a CROSS-ENTITY reference that SUCCEEDS, and it is correct. The seeded
   * group control is owned by SG1 (int-global-setup.js:180), `controls_read`
   * admits `applies_to_scope = 'group'` from any entity (ADR-0014), and the
   * trigger resolves its parent with a plain SELECT under the caller's own
   * policies. 02a:434 says a group-shared control may link anywhere.
   *
   * So "the trigger refuses cross-entity subjects" is true for `policy` and
   * conditional for `control`. Test 8 is the other half; neither is meaningful
   * alone.
   */
  it('7. a GROUP-shared control is attestable across entities — by design', async () => {
    const row = await repo.create(await clientFor(['HK1']), {
      orgEntityId: HK1,
      subjectType: 'control',
      subjectId: GROUP_CONTROL,
      result: 'acknowledged',
    });

    expect(row.subjectId).toBe(GROUP_CONTROL);
    expect(row.orgEntityId).toBe(HK1);
  });

  /**
   * ⭐ The control that makes test 7 a finding rather than a hole.
   *
   * Same subject TYPE, same owning entity, same caller — the only difference is
   * `applies_to_scope`. If this passed too, the trigger would not be filtering
   * controls at all.
   */
  it('8. an ENTITY-local control of another entity is refused', async () => {
    await expect(
      repo.create(await clientFor(['HK1']), {
        orgEntityId: HK1,
        subjectType: 'control',
        subjectId: SG1_CONTROL,
        result: 'acknowledged',
      }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);
  });

  // === US-2: the four scope tests 約束 8 asks for ===========================

  it('9. cross-entity READ returns nothing', async () => {
    const ids = (await repo.list(await clientFor(['HK1']))).map((r) => r.id);

    // Non-empty premise first: an empty table would satisfy the negative half
    // while proving nothing (AD-VacuousScopeTest-1, four instances repaired in W13).
    expect(ids).toContain(HK1_ATT);
    expect(ids).not.toContain(SG1_ATT);
  });

  it('10. cross-entity WRITE through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      repo.create(sg1, {
        orgEntityId: HK1,
        subjectType: 'policy',
        subjectId: HK1_POLICY,
        result: 'planted',
      }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    const hk1Rows = await repo.list(await clientFor(['HK1']));
    expect(hk1Rows.map((r) => r.result)).not.toContain('planted');
  });

  it('11. the INSERT policy refuses on its own, with no RETURNING to hide behind', async () => {
    const sg1 = await clientFor(['SG1']);

    // ⭐ `subjectId` is SG1_POLICY — readable from THIS scope — on purpose. Naming
    // HK1_POLICY instead makes the test pass on the trigger's 23503 while this
    // table's WITH CHECK is never evaluated, because a BEFORE trigger runs ahead
    // of the row's own policy check. That is AD-BorrowedRefusal-1, and
    // evidence.int.spec.ts:209 records the first version of its own test having it.
    await expect(
      sg1.attestation.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'ATT-HK1-PLANTED-1',
            subjectType: 'policy',
            subjectId: SG1_POLICY,
            attestedAt: new Date(),
            result: 'planted',
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1Rows = await repo.list(await clientFor(['HK1']));
    expect(hk1Rows.map((r) => r.refCode)).not.toContain('ATT-HK1-PLANTED-1');
  });

  it('12. an attestation cannot be deleted — refused by privilege, before RLS', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(sg1.attestation.deleteMany({ where: { id: SG1_ATT } })).rejects.toThrow(
      /permission denied/i,
    );
    expect((await sg1.attestation.findMany({ where: { id: SG1_ATT } })).length).toBe(1);
  });

  /**
   * ⭐ The Day 1 decision, asserted rather than described.
   *
   * Every other business table in this schema grants UPDATE and carries an UPDATE
   * policy. This one does neither, because an attestation records that a person
   * signed something at a moment — editing it does not correct a fact, it
   * replaces evidence (the reasoning 02a:260 applies to version rows).
   *
   * ⚠️ The refusal is `permission denied`, i.e. the missing GRANT, which fires
   * BEFORE row-level security. That ordering is why the absent policy is not the
   * thing under test here: nothing reaches it.
   */
  it('13. an attestation cannot be updated either — a correction is a new row', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.attestation.updateMany({ where: { id: SG1_ATT }, data: { result: 'rewritten' } }),
    ).rejects.toThrow(/permission denied/i);

    const [row] = await sg1.attestation.findMany({ where: { id: SG1_ATT } });
    expect(row?.result).toBe('acknowledged');
  });

  it('14. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg = await clientFor(['SG'], true);
    const ids = (await repo.list(sg)).map((r) => r.id);

    expect(ids).toContain(SG1_ATT);
    expect(ids).not.toContain(HK1_ATT);
  });
});
