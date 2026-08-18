/**
 * File: apps/api/src/modules/risk/risk.int.spec.ts
 * Purpose: The formula, the scope, and the two refusal points — against a real database.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W05 (M1 slice 2)
 * Owner: docs/14-adr/0013-risk-scoring-and-calibration.md
 *
 * Description:
 *   ⚠️ THIS FILE, NOT risk-score.spec.ts, IS WHERE THE FORMULA IS PROVEN. ADR-0013
 *   puts `LKH × MAX(FIN,BOP,LRY,REP,SIS)` in a generated column, so the only
 *   place it exists is the migration — a unit test asserting a TypeScript product
 *   would certify a function no request calls.
 *
 *   Every scoring fixture below is chosen so MAX and SUM DISAGREE. With
 *   {2,5,1,3,1} the maximum is 5 and the sum is 12; swap GREATEST for + in the
 *   migration and 20 becomes 48. A fixture like {5,0,0,0,0} would pass under both
 *   and the test would look like it was checking something.
 *
 *   The suite also pins two things W05 measured and could otherwise forget:
 *
 *     - the SECOND refusal point. A cross-entity risk is refused by RLS at the
 *       counter (42501); a cross-entity ASSET REFERENCE is not — the row's own
 *       entity is in scope, so the composite foreign key refuses it (23503).
 *       Two detectors, one answer.
 *     - the global libraries are readable from BOTH scopes. That is deliberate,
 *       and without a test pinning it, someone "tightening" security by adding
 *       RLS to threats would break the methodology with every gate green.
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Add byId scope tests 19-22 (Phase W22) — the read path a screen uses
 *   - 2026-08-14: Add a non-empty premise to test 14 (W13) — AD-VacuousScopeTest-1
 *   - 2026-08-11: Initial creation (Phase W05)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { RiskRepository } from '../../core-model/risk.repository';
import { RiskScoreValidationError, scoreExpression } from '../../core-model/risk-score';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { RiskController } from './risk.controller';
import { RiskModule } from './risk.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_ASSET = '00000000-0000-0000-0000-000000000a20';
const HK1_ASSET = '00000000-0000-0000-0000-000000000a21';
const THREAT = '00000000-0000-0000-0000-000000000a30';
const VULN = '00000000-0000-0000-0000-000000000a40';

/** MAX = 5, SUM = 12. The two must disagree or the assertion proves nothing. */
const IMPACTS = { fin: 2, bop: 5, lry: 1, rep: 3, sis: 1 } as const;

describe('risk module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: RiskRepository;
  let controller: RiskController;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [RiskModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(RiskRepository);
    controller = moduleRef.get(RiskController);
  });

  /** Retired, not deleted — isms_app holds no DELETE privilege (guardrail 3). */
  const created: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const base = (over: Record<string, unknown> = {}) => ({
    orgEntityId: SG1,
    title: 'Credential stuffing against the payments API',
    assetId: SG1_ASSET,
    threatId: THREAT,
    vulnerabilityId: VULN,
    ciaType: 'cia' as const,
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
      await client.risk.update({ where: { id }, data: { retiredAt: new Date() } });
    }
    await moduleRef.close();
  });

  // === US-3: the formula, against the column that actually holds it ==========

  it('1. the database scores LKH × MAX(impacts), not the sum', async () => {
    const row = await create(['SG1'], { before: { lkh: 4, ...IMPACTS } });

    // 4 × MAX(2,5,1,3,1) = 4 × 5 = 20.   4 × SUM = 4 × 12 = 48.
    expect(row.scoreBefore).toBe(20);
    expect(row.scoreAfter).toBeNull();
  });

  it('2. the caller cannot supply a score — there is no field, and the column refuses one', async () => {
    const row = await create(['SG1'], {
      before: { lkh: 4, ...IMPACTS },
      // Deliberately passed as an unknown extra key: CreateRiskInput has no such
      // property, so this is what a client sending scoreBefore actually achieves.
      scoreBefore: 1,
    } as Record<string, unknown>);

    expect(row.scoreBefore).toBe(20);
  });

  it('3. an unassessed risk is NULL everywhere, never acceptable', async () => {
    const row = await create(['SG1']);

    expect(row.scoreBefore).toBeNull();
    expect(row.scoreAfter).toBeNull();
    // The one that would be wrong under `CASE ... ELSE 'acceptable'`.
    expect(row.acceptanceStatus).toBeNull();
    expect(row.inItRiskRegister).toBeNull();
  });

  it('4. acceptance follows the residual once it exists, and the register follows only the residual', async () => {
    const treated = await create(['SG1'], {
      before: { lkh: 4, ...IMPACTS }, // 20 -> requires treatment
      after: { lkh: 3, fin: 3, bop: 1, lry: 1, rep: 1, sis: 1 }, // 9 -> acceptable
    });

    expect(treated.scoreBefore).toBe(20);
    expect(treated.scoreAfter).toBe(9);
    expect(treated.acceptanceStatus).toBe('acceptable');
    expect(treated.inItRiskRegister).toBe(false);

    const inherentOnly = await create(['SG1'], { before: { lkh: 4, ...IMPACTS } });
    expect(inherentOnly.acceptanceStatus).toBe('requires_treatment');
    // Not false: nobody has assessed the residual, so the register has no answer.
    expect(inherentOnly.inItRiskRegister).toBeNull();
  });

  it.each([
    [{ lkh: 4, fin: 4, bop: 4, lry: 4, rep: 4, sis: 4 }, 16, 'requires_treatment', true],
    [{ lkh: 3, fin: 5, bop: 1, lry: 1, rep: 1, sis: 1 }, 15, 'acceptable', false],
  ])(
    '5. the 15/16 boundary falls where 02a:120 puts it (%p)',
    async (after, score, status, reg) => {
      const row = await create(['SG1'], {
        before: { lkh: 5, fin: 5, bop: 5, lry: 5, rep: 5, sis: 5 },
        after,
      });

      expect(row.scoreAfter).toBe(score);
      expect(row.acceptanceStatus).toBe(status);
      expect(row.inItRiskRegister).toBe(reg);
    },
  );

  /**
   * Pins the expression TEXT, not just its output at the fixtures above. This is
   * what makes risk-score.ts's constant load-bearing: change the migration's
   * formula without changing that constant and this fails, whether or not any
   * fixture happens to notice.
   */
  it('6. the stored generation expression is the one risk-score.ts documents', async () => {
    const client = await clientFor(['SG1']);
    const rows = await client.$queryRawUnsafe<{ attname: string; expr: string }[]>(
      `SELECT a.attname, pg_get_expr(d.adbin, d.adrelid) AS expr
         FROM pg_attribute a
         JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = 'risks'::regclass AND a.attgenerated = 's'`,
    );
    const byName = Object.fromEntries(rows.map((r) => [r.attname, r.expr]));

    expect(byName['score_before']).toBe(scoreExpression('before'));
    expect(byName['score_after']).toBe(scoreExpression('after'));
    // The two dependants repeat the expression rather than referencing the
    // column, because PostgreSQL forbids chaining generated columns.
    expect(byName['in_it_risk_register']).toContain(scoreExpression('after'));
    expect(byName['acceptance_status']).toContain(scoreExpression('after'));
    expect(byName['acceptance_status']).toContain(scoreExpression('before'));
  });

  // === The rule that costs the most to get wrong =============================

  it('7. a partial score set is refused before it reaches the database', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(repo.create(sg1, base({ before: { lkh: 4, fin: 2 } }))).rejects.toBeInstanceOf(
      RiskScoreValidationError,
    );
  });

  it('8. the DATABASE refuses a partial set too, with this layer bypassed', async () => {
    // Writing through the client directly is the whole point: going through the
    // repository would test validateScoreSet twice and call the second one "the
    // database". Neutralise the application layer and the constraint must hold.
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.risk.create({
        data: {
          orgEntityId: SG1,
          refCode: 'RISK-SG1-BYPASS-1',
          title: 'partial, written past the validator',
          assetId: SG1_ASSET,
          threatId: THREAT,
          vulnerabilityId: VULN,
          ciaType: 'c',
          lkhBefore: 4,
          finBefore: 2,
        },
      }),
    ).rejects.toThrow(/all_or_none/);
  });

  it('9. the DATABASE refuses an out-of-band value, with this layer bypassed', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.risk.create({
        data: {
          orgEntityId: SG1,
          refCode: 'RISK-SG1-BYPASS-2',
          title: 'likelihood 7, written past the validator',
          assetId: SG1_ASSET,
          threatId: THREAT,
          vulnerabilityId: VULN,
          ciaType: 'c',
          lkhBefore: 7,
          finBefore: 2,
          bopBefore: 5,
          lryBefore: 1,
          repBefore: 3,
          sisBefore: 1,
        },
      }),
    ).rejects.toThrow(/band/);
  });

  // === US-4: 約束 8's four scope tests ======================================

  it('10. cross-entity read: the repository returns only in-scope rows', async () => {
    await create(['SG1'], { title: 'SG1 only' });
    await create(['HK1'], { orgEntityId: HK1, assetId: HK1_ASSET, title: 'HK1 only' });

    const sg1Rows = await repo.list(await clientFor(['SG1']));
    const hk1Rows = await repo.list(await clientFor(['HK1']));

    expect(sg1Rows.every((r) => r.orgEntityId === SG1)).toBe(true);
    expect(hk1Rows.every((r) => r.orgEntityId === HK1)).toBe(true);
    // Order-independent (AD-JestFileOrder-1): assert membership, not position.
    expect(hk1Rows.map((r) => r.title)).toContain('HK1 only');
    expect(hk1Rows.map((r) => r.title)).not.toContain('SG1 only');
  });

  it('11. cross-entity write is refused, and nothing landed', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await repo.list(await clientFor(['HK1']))).length;

    await expect(
      repo.create(sg1, base({ orgEntityId: HK1, assetId: HK1_ASSET, title: 'planted by SG1' })),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    const after = await repo.list(await clientFor(['HK1']));
    expect(after).toHaveLength(before);
    expect(after.map((r) => r.title)).not.toContain('planted by SG1');
  });

  /**
   * ⭐ ADDED BECAUSE META-VERIFICATION FOUND NOTHING RED.
   *
   * W05 Day 3 neutralised all three new RLS policies to USING(true)/WITH
   * CHECK(true) and test 11 still passed — because repo.create() reaches
   * ref_code_counters FIRST, and that table's policy is W04's, untouched. Test
   * 11 therefore proves the counter refuses, not that `risks` does.
   *
   * This one writes through the client directly, with no reference code, so the
   * only thing that can refuse it is the risks policy itself. Without it, the
   * write-side half of 約束 8 on this table has no coverage at all — and the
   * gate would have stayed green while it was removed.
   */
  /**
   * ⭐ REWRITTEN IN W07 — `AD-ReturningMasksCheck-1`.
   *
   * The W05 version called `risk.create()`, and W06 Day 3 measured what that
   * actually proved: Prisma's `create()` always emits RETURNING, and PostgreSQL
   * applies the SELECT policy to the row being returned. So the test passed on
   * the READ policy hiding the row, never on the WRITE policy refusing it —
   * neutralise `risks`' WITH CHECK and the old version stayed green while a
   * cross-entity row landed.
   *
   * `createMany` emits no RETURNING, so there is nothing left to hide behind.
   * Verified the only way this claim can be verified: with the WITH CHECK
   * neutralised, this version goes RED (W07 Day 3 meta-verification N7).
   */
  it('11b. the risks policy refuses a cross-entity write on its own, without the counter', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.risk.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'RISK-HK1-PLANTED-1',
            title: 'planted straight into the table',
            assetId: HK1_ASSET,
            threatId: THREAT,
            vulnerabilityId: VULN,
            ciaType: 'c',
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    // And nothing landed, read back from the scope that would own it.
    const hk1 = await repo.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('RISK-HK1-PLANTED-1');
  });

  /**
   * ⭐ The refusal point W05 discovered. Everything here is in scope EXCEPT the
   * asset, so RLS's WITH CHECK passes and the composite foreign key is what
   * refuses. Before this phase every refusal on the write path was 42501.
   */
  it("12. a risk cannot be raised against another entity's asset", async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(repo.create(sg1, base({ assetId: HK1_ASSET }))).rejects.toBeInstanceOf(
      UnknownReferenceError,
    );
  });

  it('13. an asset that does not exist is refused identically — no existence oracle', async () => {
    const sg1 = await clientFor(['SG1']);

    const othersAsset = await repo.create(sg1, base({ assetId: HK1_ASSET })).catch((e) => e);
    const fictional = await repo
      .create(sg1, base({ assetId: '11111111-2222-3333-4444-555555555555' }))
      .catch((e) => e);

    expect(othersAsset).toBeInstanceOf(UnknownReferenceError);
    expect(fictional).toBeInstanceOf(UnknownReferenceError);
    // Byte-identical, not merely the same class: the message is what a caller sees.
    expect((fictional as Error).message).toBe((othersAsset as Error).message);
  });

  it('14. RLS holds at the client, independently of the repository', async () => {
    // ⛔ THE PREMISE, AND HERE IT HAS TO BE BUILT. int-global-setup.js seeds an
    // asset for both entities but NO risks, so unlike the asset suite this one
    // cannot read its premise back from the seed — without the write below,
    // "SG1 sees no HK1 risk" would hold on an empty table and prove nothing.
    await create(['HK1'], {
      orgEntityId: HK1,
      assetId: HK1_ASSET,
      title: 'HK1 risk that has to exist for the refusal to mean anything',
    });
    const hk1 = await clientFor(['HK1']);
    expect((await hk1.risk.findMany({ where: { orgEntityId: HK1 } })).length).toBeGreaterThan(0);

    const sg1 = await clientFor(['SG1']);
    const rows = await sg1.risk.findMany({ where: { orgEntityId: HK1 } });

    // Asked for HK1 explicitly and still got nothing: the filter is beneath the
    // query, not inside it.
    expect(rows).toHaveLength(0);
  });

  it('15. a roll-up scope sees its authorised subtree and no more', async () => {
    const apac = await clientFor(['APAC'], true);
    const sg = await clientFor(['SG'], true);

    const apacEntities = new Set((await repo.list(apac)).map((r) => r.orgEntityId));
    const sgEntities = new Set((await repo.list(sg)).map((r) => r.orgEntityId));

    expect(apacEntities.has(SG1)).toBe(true);
    expect(apacEntities.has(HK1)).toBe(true);
    // SG's subtree stops above HK1.
    expect(sgEntities.has(SG1)).toBe(true);
    expect(sgEntities.has(HK1)).toBe(false);
  });

  // === The global libraries — pinned because they are deliberately unguarded ==

  it('16. both scopes read the same threat and vulnerability rows', async () => {
    const sg1 = await clientFor(['SG1']);
    const hk1 = await clientFor(['HK1']);

    const sg1Threats = (await sg1.threat.findMany()).map((t) => t.id).sort();
    const hk1Threats = (await hk1.threat.findMany()).map((t) => t.id).sort();
    const sg1Vulns = (await sg1.vulnerability.findMany()).map((v) => v.id).sort();
    const hk1Vulns = (await hk1.vulnerability.findMany()).map((v) => v.id).sort();

    expect(sg1Threats.length).toBeGreaterThan(0);
    expect(sg1Threats).toEqual(hk1Threats);
    expect(sg1Vulns).toEqual(hk1Vulns);
  });

  it('17. the shared libraries are read-only to the application role', async () => {
    const sg1 = await clientFor(['SG1']);

    // No INSERT privilege was granted. A library any OpCo could edit would be a
    // cross-entity write path wearing a reference table's clothes.
    await expect(sg1.threat.create({ data: { name: 'invented by SG1' } })).rejects.toThrow(
      /permission denied/i,
    );
  });

  // === ref_code ==============================================================

  it('18. the server issues the ref_code; the caller has no way to supply one', async () => {
    const row = await create(['SG1'], { title: 'ref code shape' });

    expect(row.refCode).toMatch(/^RISK-SG1-\d{6}$/);
  });

  // === GET /risks/:id — the read path a product screen actually calls ========
  //
  // These four go through the CONTROLLER, not the repository, because byId's
  // whole refusal lives there: the scoped client returns a set and the
  // controller finds in it. Testing repo.list() again would prove the layer
  // beneath the one being added.
  //
  // The scope comes from DEV_PRINCIPAL_ENTITIES (dev-principal.ts), read per
  // call — so setting it here is how a test says "this caller is SG1". It is
  // restored in afterEach because a leaked value would silently widen every
  // later test in the file.

  describe('byId', () => {
    const priorEntities = process.env.DEV_PRINCIPAL_ENTITIES;

    afterEach(() => {
      if (priorEntities === undefined) {
        delete process.env.DEV_PRINCIPAL_ENTITIES;
      } else {
        process.env.DEV_PRINCIPAL_ENTITIES = priorEntities;
      }
    });

    it('19. returns the row for an id inside the scope', async () => {
      const row = await create(['SG1'], { title: 'SG1 risk a screen will open' });
      process.env.DEV_PRINCIPAL_ENTITIES = 'SG1';

      const answer = (await controller.byId(row.id)) as { data: { id: string } };

      expect(answer.data.id).toBe(row.id);
    });

    it('20. refuses an id that exists in another entity — 404, not 403', async () => {
      // ⛔ THE PREMISE: the row has to exist, or this passes on an empty table
      // and proves nothing (AD-VacuousScopeTest-1, test 14's lesson).
      const hk1 = await create(['HK1'], {
        orgEntityId: HK1,
        assetId: HK1_ASSET,
        title: 'HK1 risk SG1 must not be able to open',
      });
      expect((await repo.list(await clientFor(['HK1']))).map((r) => r.id)).toContain(hk1.id);

      process.env.DEV_PRINCIPAL_ENTITIES = 'SG1';

      // 403 would confirm the id is real. 404 is the only answer that does not.
      await expect(controller.byId(hk1.id)).rejects.toMatchObject({ status: 404 });
    });

    it('21. an id that never existed is refused identically — no existence oracle', async () => {
      const hk1 = await create(['HK1'], {
        orgEntityId: HK1,
        assetId: HK1_ASSET,
        title: 'HK1 risk for the indistinguishability pair',
      });
      const absent = '00000000-0000-0000-0000-0000deadbeef';
      process.env.DEV_PRINCIPAL_ENTITIES = 'SG1';

      const outOfScope = await controller.byId(hk1.id).catch((e: Error) => e);
      const neverExisted = await controller.byId(absent).catch((e: Error) => e);

      // Same status AND the same message once the id is masked. If either half
      // differed, a caller could sweep ids and learn which ones are real.
      expect(outOfScope).toMatchObject({ status: 404 });
      expect(neverExisted).toMatchObject({ status: 404 });
      expect((outOfScope as Error).message.replace(hk1.id, 'X')).toBe(
        (neverExisted as Error).message.replace(absent, 'X'),
      );
    });

    it('22. RLS refuses the same row by id, with the controller bypassed', async () => {
      const hk1 = await create(['HK1'], {
        orgEntityId: HK1,
        assetId: HK1_ASSET,
        title: 'HK1 risk asked for by primary key',
      });

      const sg1 = await clientFor(['SG1']);

      // Asked for it by PRIMARY KEY and still got nothing. Test 20 could pass
      // with the filter living in the controller's find(); this one cannot —
      // it never reaches that code. Two layers, asserted separately.
      expect(await sg1.risk.findUnique({ where: { id: hk1.id } })).toBeNull();
    });
  });
});
