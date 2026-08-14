/**
 * File: apps/api/src/modules/soa/soa.int.spec.ts
 * Purpose: The four scope tests 約束 8 asks for, against a real database — and the
 *   measurement that says whether a caller-chosen unique key leaks existence here.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W11 (M1 slice 8)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · CLAUDE.md 約束 8
 *
 * Description:
 *   The SoA is nobody's child, so there is no cross-entity REFERENCE to guard —
 *   that is action.int.spec.ts's subject. What is specific here is the UNIQUE KEY,
 *   and it is the reason this file exists in the shape it does.
 *
 *   ⭐ Test 10 is the AD-UniqueKeyOracle-1 regression test, and it asserts SAMENESS:
 *   a (framework, clause_ref) another entity already holds must be indistinguish-
 *   able from one nobody holds. Both halves come from the request body, which is
 *   the criterion exactly. W10 measured the leak on rm_report_versions as 23505
 *   versus 23503; here the two indistinguishable outcomes are both SUCCESS, since
 *   this table has no parent foreign key to fall through to. Day 3 removes
 *   org_entity_id from the key and measures whether they actually diverge — until
 *   that runs, this test pins the behaviour without proving the key is what causes
 *   it.
 *
 *   ⚠️ Tests that write directly go through the CLIENT, never the repository, and
 *   carry their own ref_code. W05 Day 3 measured why: repo.create() touches
 *   ref_code_counters first, so a test through it can pass on W04's policy while
 *   this table's own policies are neutralised (AD-BorrowedRefusal-1). And per W06
 *   Day 3 the bypass write must emit no RETURNING, or the SELECT policy answers
 *   for the INSERT policy (AD-ReturningMasksCheck-1).
 *
 *   ⚠️ No SoA rows are seeded. Every row here is created by the test that needs
 *   it, and both entities get one wherever an isolation claim is made — with only
 *   SG1 rows, "HK1 cannot see SG1's statement" and "HK1 has no statements" are the
 *   same observation.
 *
 * Created: 2026-08-14 (Phase W11)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W11)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { DuplicateKeyError, ScopeRefusedError } from '../../core-model/scope-refusal';
import { SoaRepository } from '../../core-model/soa.repository';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { SoaModule } from './soa.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

const FRAMEWORK = 'ISO 27001';

describe('soa module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: SoaRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [SoaModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(SoaRepository);
  });

  /** Retired, not deleted — and here the database would refuse a delete anyway. */
  const created: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  /**
   * Clause references have to be unique per entity for the life of the run:
   * retiring a row does NOT free the key, since retired_at is not in it. Tests
   * that care about a specific clause name it; the rest take the next number.
   */
  let seq = 0;

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const create = async (
    code: 'SG1' | 'HK1',
    over: Record<string, unknown> = {},
    track = true,
  ) => {
    seq += 1;
    const row = await repo.create(await clientFor([code]), {
      orgEntityId: code === 'HK1' ? HK1 : SG1,
      framework: FRAMEWORK,
      clauseRef: `A.9.${seq}`,
      applicable: true,
      implementationStatus: 'implemented',
      ...over,
    } as Parameters<SoaRepository['create']>[1]);
    if (track) {
      created.push({ id: row.id, entity: code });
    }
    return row;
  };

  afterAll(async () => {
    for (const { id, entity } of created) {
      const client = await clientFor([entity]);
      await client.statementOfApplicability.update({
        where: { id },
        data: { retiredAt: new Date() },
      });
    }
    await moduleRef.close();
  });

  // === US-1: the table exists and behaves like the spec says =================

  it('1. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create('SG1');

    expect(row.refCode).toMatch(/^SOA-SG1-\d{6}$/);
  });

  it('2. a statement of exclusion round-trips as false — not as absent', async () => {
    const row = await create('SG1', {
      applicable: false,
      implementationStatus: 'not_implemented',
      justification: 'No development is performed at this entity.',
    });

    // The half an auditor interrogates. `applicable` is NOT NULL and has no
    // default, so the column cannot express "nobody decided" — which is the point:
    // an SoA row that exists is a decision that was made.
    expect(row.applicable).toBe(false);
    expect(row.justification).toBe('No development is performed at this entity.');
  });

  it('3. an unapproved statement carries NULL, not a plausible default', async () => {
    const row = await create('SG1');

    // The judgement Risk's generated columns record: absent must read as absent.
    // An approver defaulted to the creator would be an accountability claim the
    // platform invented — and 02a:215's approved_by is free text precisely because
    // the approver is frequently a committee.
    expect(row.approvedBy).toBeNull();
    expect(row.approvedAt).toBeNull();
    expect(row.ownerUserId).toBeNull();
    expect(row.justification).toBeNull();
  });

  it('4. implementation_status round-trips as given — no coercion, no default', async () => {
    const row = await create('SG1', { implementationStatus: 'partially_implemented' });

    expect(row.implementationStatus).toBe('partially_implemented');
  });

  // === US-2: the four scope tests 約束 8 asks for ============================

  it('5. cross-entity READ returns nothing — no widening on this table', async () => {
    const sg1 = await create('SG1');
    const hk1 = await create('HK1');

    const ids = (await repo.list(await clientFor(['HK1']))).map((r) => r.id);

    // A group-shared CONTROL is a library entry every entity may consult; an SoA
    // row is ONE entity's decision about one clause. Both assertions or neither —
    // together they say the policy discriminates, separately they say nothing.
    expect(ids).toContain(hk1.id);
    expect(ids).not.toContain(sg1.id);
  });

  it('6. cross-entity WRITE through the repository is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, {
        orgEntityId: HK1,
        framework: FRAMEWORK,
        clauseRef: 'A.planted',
        applicable: true,
        implementationStatus: 'implemented',
      }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    expect(await repo.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  it('7. the INSERT policy refuses on its own, with the counter and RETURNING bypassed', async () => {
    const sg1 = await clientFor(['SG1']);

    // Two independent bypasses in one statement, both required:
    //   - no issueRefCode, so W04's counter policy cannot answer for this one
    //     (W05 clause 2)
    //   - a raw INSERT emits no RETURNING, so the READ policy cannot answer for
    //     the WRITE policy (W06 Day 3 / AD-ReturningMasksCheck-1)
    //
    // Unlike control_tests there is no third bypass to arrange: this table
    // references no business parent, so no trigger and no composite key can get in
    // front of its WITH CHECK. Nothing else is left to refuse this.
    await expect(
      sg1.$executeRawUnsafe(
        `INSERT INTO statements_of_applicability
           (id, ref_code, org_entity_id, framework, clause_ref, applicable,
            implementation_status, updated_at)
         VALUES (gen_random_uuid(), 'SOA-HK1-999001', '${HK1}', '${FRAMEWORK}',
                 'A.bypass', true, 'implemented'::soa_implementation_status, now())`,
      ),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await clientFor(['HK1']);
    const landed = await hk1.statementOfApplicability.findMany({
      where: { refCode: 'SOA-HK1-999001' },
    });
    // Refused, not merely errored: HK1 itself cannot see the row either.
    expect(landed).toHaveLength(0);
  });

  it('8. a statement cannot be deleted — refused by privilege, before RLS', async () => {
    const row = await create('SG1');
    const sg1 = await clientFor(['SG1']);

    // Names the layer it can actually see. `isms_app` was never granted DELETE and
    // the privilege check runs before row-level security, so this never reaches the
    // (deliberately absent) FOR DELETE policy — W06 test 10 records the same
    // finding and why claiming otherwise would be a borrowed refusal.
    await expect(
      sg1.statementOfApplicability.deleteMany({ where: { id: row.id } }),
    ).rejects.toThrow(/permission denied/i);
    expect((await sg1.statementOfApplicability.findMany({ where: { id: row.id } })).length).toBe(1);
  });

  it('9. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg1 = await create('SG1');
    const hk1 = await create('HK1');

    const ids = (await repo.list(await clientFor(['SG'], true))).map((r) => r.id);

    expect(ids).toContain(sg1.id);
    expect(ids).not.toContain(hk1.id);
  });

  // === The unique key, which is where this table's oracle would be =============

  it('10. a clause another entity holds is indistinguishable from one nobody holds', async () => {
    const held = 'A.5.9';
    const unheld = 'A.5.9999';
    await create('HK1', { clauseRef: held });

    const collides = await create('SG1', { clauseRef: held }).catch((e: unknown) => e);
    const doesNot = await create('SG1', { clauseRef: unheld }).catch((e: unknown) => e);

    // ⭐ AD-UniqueKeyOracle-1, second data point. Both halves of this key come from
    // the request body, and a unique index does not respect RLS — so without
    // org_entity_id in the key, the first call would collide with HK1's row and the
    // second would not, answering "does Hong Kong consider A.5.9 applicable?" to a
    // caller who cannot read a single one of their rows.
    //
    // The assertion is SAMENESS, so it fails if the entity ever leaves the key.
    // ⚠️ What it does NOT show is that the key is what makes them the same — that
    // needs the neutralisation, and it is Day 3's measurement, not this file's.
    expect(collides).not.toBeInstanceOf(Error);
    expect(doesNot).not.toBeInstanceOf(Error);
    // Named rather than merely non-throwing: "did not reject" would also be true
    // of a call that silently stored something else (AD-TestNameWiderThanProof-1).
    expect((collides as { clauseRef: string }).clauseRef).toBe(held);
    expect((doesNot as { clauseRef: string }).clauseRef).toBe(unheld);
  });

  it('11. but a clause the caller has ALREADY answered is told plainly', async () => {
    const twice = 'A.8.1';
    await create('SG1', { clauseRef: twice });

    const error = await create('SG1', { clauseRef: twice }).catch((e: unknown) => e);

    // Not collapsed into the 404 family, and this is the whole reason surfacing
    // 23505 is safe HERE: the row it collided with is one the caller owns and can
    // already read. Refusing to say the clause is taken would hide a rule from the
    // only person who can satisfy it and reveal nothing in return (the W09
    // reasoning for 23514 -> 422, applied to 23505 -> 409).
    expect(error).toBeInstanceOf(DuplicateKeyError);
    expect((error as Error).message).toBe('framework + clauseRef already exists');
  });

  it('12. a row cannot be moved out of the entity that owns it', async () => {
    // ⭐ WRITTEN BECAUSE N4 FOUND NOTHING. Neutralising the UPDATE policy's
    // WITH CHECK left all 11 tests green: nothing here had ever tried to change a
    // row's org_entity_id, so the migration's claim — that without WITH CHECK a
    // caller could move its own row into another entity's scope — was a guard
    // shipped with no test proving it. AD-BorrowedRefusal-1, sixth time.
    //
    // ⛔ RAW UPDATE, NO RETURNING, and that is not stylistic. Prisma's update()
    // emits RETURNING; once org_entity_id says HK1 the SELECT policy refuses to
    // read the row back and runScoped's transaction rolls the write away — which
    // is indistinguishable from a WITH CHECK refusal. That is
    // AD-ReturningMasksCheck-1, the trap W10 fell into while repairing this exact
    // finding, so the repair is written the way the lesson says from the start.
    //
    // Not tracked for teardown: this test's whole subject is whether the row can
    // leave SG1, so registering it for SG1-scoped retirement would assume the
    // answer.
    const row = await create('SG1', { clauseRef: 'A.6.3' }, false);
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.$executeRawUnsafe(
        `UPDATE statements_of_applicability
            SET org_entity_id = '${HK1}'
          WHERE id = '${row.id}'`,
      ),
    ).rejects.toThrow(/row-level security/i);

    // USING let the statement see the row; WITH CHECK refused what it would have
    // become. The row is still SG1's, and HK1 still cannot see it.
    const stillHere = await sg1.statementOfApplicability.findMany({ where: { id: row.id } });
    expect(stillHere).toHaveLength(1);
    expect(stillHere[0]?.orgEntityId).toBe(SG1);

    const hk1 = await clientFor(['HK1']);
    expect(await hk1.statementOfApplicability.findMany({ where: { id: row.id } })).toHaveLength(0);

    await sg1.statementOfApplicability.update({
      where: { id: row.id },
      data: { retiredAt: new Date() },
    });
  });
});
