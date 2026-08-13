/**
 * File: apps/api/src/modules/rm-report/rm-report.int.spec.ts
 * Purpose: That a snapshot cannot be edited, that issuing one promotes it, and that
 *   the version-label key answers the same thing whatever another entity holds.
 * Category: Test (integration)
 * Scope: Phase W10 (M1 slice 7)
 *
 * Description:
 *   Three claims that only a real database can settle, and one regression test
 *   for a hole this phase found in itself.
 *
 *   ⭐ Test 5 is Day 3's N1 target: add a FOR UPDATE policy to rm_report_versions
 *   and it must go GREEN — an update that succeeds. If it stays red something
 *   else is refusing and the immutability claim belongs to that something else,
 *   which is AD-BorrowedRefusal-1 for the fifth time.
 *
 *   ⭐ Test 12 is the regression test for the oracle measured on Day 2: before
 *   20260813153153, inserting into another entity's report answered 23505 when
 *   the label collided with one of theirs and 23503 when it did not, which
 *   enumerates their version history one guess at a time. It asserts SAMENESS,
 *   so it fails if the entity ever leaves that unique key.
 *
 *   ⚠️ Cleanup retires reports and CANNOT retire versions — retiredAt is an
 *   UPDATE, and there is no policy permitting one. That is not an oversight in
 *   this file; it is the feature, visible from the test harness. The suite drops
 *   and recreates the database each run, which is what makes it survivable.
 *
 * Created: 2026-08-13 (Phase W10)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W10)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { RmReportRepository } from '../../core-model/rm-report.repository';
import { DuplicateKeyError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { RmReportModule } from './rm-report.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

/** An id that exists nowhere. The other half of every oracle assertion below. */
const ABSENT = '00000000-0000-0000-0000-0000dead0000';

const SHEET = { services: ['MPS'], assets: [], threats: [], assessment: [], treatment: [] };

describe('rm-report module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let repo: RmReportRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [RmReportModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    repo = moduleRef.get(RmReportRepository);
  });

  const reports: { id: string; entity: 'SG1' | 'HK1' }[] = [];

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const createReport = async (code: 'SG1' | 'HK1', title = 'RM report') => {
    const row = await repo.create(await clientFor([code]), {
      orgEntityId: code === 'HK1' ? HK1 : SG1,
      title,
    });
    reports.push({ id: row.id, entity: code });
    return row;
  };

  const issue = async (code: 'SG1' | 'HK1', reportId: string, over: Record<string, unknown> = {}) =>
    repo.issueVersion(await clientFor([code]), {
      orgEntityId: code === 'HK1' ? HK1 : SG1,
      reportId,
      versionLabel: '1.0',
      preparedBy: 'ITSC',
      approvedBy: 'ISC',
      effectiveDate: new Date('2021-08-16T00:00:00Z'),
      changeNote: 'Initial release',
      snapshotAt: new Date('2021-08-16T00:00:00Z'),
      sheet: SHEET,
      ...over,
    } as Parameters<RmReportRepository['issueVersion']>[1]);

  afterAll(async () => {
    for (const { id, entity } of reports) {
      const client = await clientFor([entity]);
      // The pointer has to be released first: rm_reports_current_version_id_id_fkey
      // is ON DELETE RESTRICT, and a retired report still pointing at a version
      // would be fine — but nulling it keeps the teardown honest about what a
      // retired deliverable means.
      await client.riskManagementReport.update({
        where: { id },
        data: { retiredAt: new Date(), currentVersionId: null },
      });
    }
    await moduleRef.close();
  });

  // === US-1: the tables exist and behave as 02a §3.1 says ====================

  it('1. the server issues both ref_codes; the caller has no way to supply one', async () => {
    const report = await createReport('SG1');
    const version = await issue('SG1', report.id);

    expect(report.refCode).toMatch(/^RMRP-SG1-\d{6}$/);
    expect(version.refCode).toMatch(/^RMRV-SG1-\d{6}$/);
  });

  it('2. a new report has no current version — the deliverable precedes its first sheet', async () => {
    const report = await createReport('SG1');

    // MATCH SIMPLE is what permits this: the composite pointer FK includes this
    // row's own NOT NULL id, and a NULL in any referencing column satisfies the
    // constraint. Measured at Day 0 (D3) before the design was committed to.
    expect(report.currentVersionId).toBeNull();
  });

  it('3. issuing a version promotes it — the pointer moves inside the insert', async () => {
    const report = await createReport('SG1');
    const version = await issue('SG1', report.id);

    const [after] = await (
      await clientFor(['SG1'])
    ).riskManagementReport.findMany({ where: { id: report.id } });

    // Nothing in the repository wrote this. 20260813152548_promote_on_issue did,
    // in the same statement, because runScoped would otherwise have made the two
    // writes two transactions.
    expect(after?.currentVersionId).toBe(version.id);
  });

  it('4. a second version repoints the report and leaves the first byte-identical', async () => {
    const report = await createReport('SG1');
    const v1 = await issue('SG1', report.id, { versionLabel: '1.0' });
    const v2 = await issue('SG1', report.id, {
      versionLabel: '1.1',
      changeNote: 'Add cloud controls from ISO/IEC 27017',
      effectiveDate: new Date('2022-05-30T00:00:00Z'),
    });

    const client = await clientFor(['SG1']);
    const [after] = await client.riskManagementReport.findMany({ where: { id: report.id } });
    const [v1After] = await client.rMReportVersion.findMany({ where: { id: v1.id } });

    expect(after?.currentVersionId).toBe(v2.id);
    // Field by field, not a timestamp check: 'the row still exists' and 'the row
    // is unchanged' are different claims, and only the second one is immutability.
    expect(v1After).toEqual(v1);
  });

  // === US-2: immutability is the database's, not the repository's =============

  it('5. updating an issued version is refused by the database', async () => {
    const report = await createReport('SG1');
    const version = await issue('SG1', report.id);
    const client = await clientFor(['SG1']);

    // Through the CLIENT, deliberately — the repository exposes no update, so
    // going through it would test the absence of a method rather than the
    // presence of a guard. rm_report_versions has no FOR UPDATE policy, so RLS
    // finds no row to update whatever GRANT says.
    await expect(
      client.rMReportVersion.update({
        where: { id: version.id },
        data: { changeNote: 'quietly rewritten' },
      }),
    ).rejects.toThrow();

    const [unchanged] = await client.rMReportVersion.findMany({ where: { id: version.id } });
    expect(unchanged?.changeNote).toBe('Initial release');
  });

  it('6. raw SQL is refused too, and by PRIVILEGE — which is not what was predicted', async () => {
    const report = await createReport('SG1');
    const version = await issue('SG1', report.id);
    const client = await clientFor(['SG1']);

    // ⭐ THIS TEST WAS WRITTEN EXPECTING NO ERROR. The prediction was that the
    // missing FOR UPDATE policy would make the statement match zero rows — a
    // successful UPDATE affecting nothing. It throws 42501 instead, because the
    // GRANT withholds UPDATE and privilege is checked before any policy is
    // consulted. Measured, W10 Day 2.
    //
    // So at runtime today the GRANT is the FIRST line and the absent policy is
    // the backstop, not the other way round — the migration comment said the
    // reverse and has been corrected. Which layer holds when the other is removed
    // is Day 3's N1, split into two neutralisations precisely because this test
    // cannot tell them apart: GRANT UPDATE alone must still leave the row
    // unchanged (policy holds), and GRANT plus a FOR UPDATE policy must finally
    // let the edit through (both were load-bearing).
    const error = await client
      .$executeRawUnsafe(
        `UPDATE rm_report_versions SET change_note = 'rewritten by raw sql' WHERE id = '${version.id}'`,
      )
      .catch((e: unknown) => e);

    expect(String((error as Error)?.message)).toContain('42501');

    const [unchanged] = await client.rMReportVersion.findMany({ where: { id: version.id } });
    expect(unchanged?.changeNote).toBe('Initial release');
  });

  // === US-3: the pointer cannot name someone else's version ==================

  it('7. the pointer cannot be moved to another report’s version', async () => {
    const a = await createReport('SG1', 'report A');
    const b = await createReport('SG1', 'report B');
    const bVersion = await issue('SG1', b.id);
    const client = await clientFor(['SG1']);

    // Both reports are SG1's, so this is NOT a scope question — it is the
    // composite pointer key doing the one thing a plain FK could not: pinning
    // the version to THIS report.
    await expect(
      client.riskManagementReport.update({
        where: { id: a.id },
        data: { currentVersionId: bVersion.id },
      }),
    ).rejects.toThrow();
  });

  // === 約束 8: the four scope tests, per table ================================

  it('8. a version cannot be issued against another entity’s report', async () => {
    const hk1Report = await createReport('HK1');

    await expect(issue('SG1', hk1Report.id)).rejects.toBeInstanceOf(UnknownReferenceError);
  });

  it('9. SG1 cannot read HK1’s report, and HK1’s report exists', async () => {
    const hk1Report = await createReport('HK1', 'HK1 deliverable');

    const sg1Rows = await (
      await clientFor(['SG1'])
    ).riskManagementReport.findMany({ where: { id: hk1Report.id } });
    const hk1Rows = await (
      await clientFor(['HK1'])
    ).riskManagementReport.findMany({ where: { id: hk1Report.id } });

    // The second half is the point. Without it, "SG1 sees nothing" and "there is
    // nothing to see" are the same observation — the trap int-global-setup.js:133
    // records for assets.
    expect(sg1Rows).toHaveLength(0);
    expect(hk1Rows).toHaveLength(1);
  });

  it('10. the isolation holds at the RLS layer, independent of any repository', async () => {
    const hk1Report = await createReport('HK1');
    await issue('HK1', hk1Report.id);

    const rows = await (
      await clientFor(['SG1'])
    ).$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*) AS n FROM rm_report_versions WHERE org_entity_id = '${HK1}'`,
    );

    expect(Number(rows[0]?.n)).toBe(0);
  });

  it('11. a roll-up principal sees the subtree it was authorised for, and no more', async () => {
    const sg1Report = await createReport('SG1');
    const hk1Report = await createReport('HK1');

    const apac = await clientFor(['APAC'], true);
    const visible = await apac.riskManagementReport.findMany({
      where: { id: { in: [sg1Report.id, hk1Report.id] } },
    });

    // Roll-up is an explicit, authorised scope expansion (約束 8), not a bypass:
    // the same RLS policy answers, with a wider app_entity_scope().
    expect(visible.map((r) => r.id).sort()).toEqual([sg1Report.id, hk1Report.id].sort());

    const sgOnly = await clientFor(['SG'], true);
    const partial = await sgOnly.riskManagementReport.findMany({
      where: { id: { in: [sg1Report.id, hk1Report.id] } },
    });
    expect(partial.map((r) => r.id)).toEqual([sg1Report.id]);
  });

  // === The oracle this phase found in itself =================================

  it('12. a label another entity holds is indistinguishable from one nobody holds', async () => {
    const hk1Report = await createReport('HK1');
    await issue('HK1', hk1Report.id, { versionLabel: '2025.7' });

    const collides = await issue('SG1', hk1Report.id, { versionLabel: '2025.7' }).catch(
      (e: unknown) => e,
    );
    const doesNot = await issue('SG1', hk1Report.id, { versionLabel: '9.9' }).catch(
      (e: unknown) => e,
    );

    // Measured on Day 2 BEFORE the fix: 23505 vs 23503 — HK1's whole version
    // history, one guess at a time. The unique key now carries org_entity_id, so
    // a probe bearing SG1 cannot collide with HK1's rows and both fall through to
    // the foreign key. The assertion is that these are the SAME.
    expect(collides).toBeInstanceOf(UnknownReferenceError);
    expect(doesNot).toBeInstanceOf(UnknownReferenceError);
    expect((collides as Error).message).toBe((doesNot as Error).message);
  });

  it('13. and a report that exists nowhere answers exactly the same way', async () => {
    const error = await issue('SG1', ABSENT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    expect((error as Error).message).toBe('risk management report not found');
  });

  it('15. the version INSERT policy refuses on its own, with the counter bypassed', async () => {
    const hk1Report = await createReport('HK1');
    const sg1 = await clientFor(['SG1']);

    // ⭐ WRITTEN BECAUSE N4 FOUND NOTHING. Neutralising this policy's WITH CHECK
    // left all 14 tests green: every path into this table goes through
    // issueRefCode first, and the counter is entity-scoped, so RLS refuses there
    // and this policy is never reached. That is AD-BorrowedRefusal-1 for the
    // fifth time — a guard shipped with no test proving it, while the suite
    // looked complete.
    //
    // ⛔ AND THE FIRST VERSION OF THIS TEST DID NOT WORK EITHER. It used
    // sg1.rMReportVersion.create(), which N4 also left green: Prisma's create()
    // emits RETURNING, the SELECT policy refuses to read an HK1 row back, and
    // runScoped's transaction rolls the insert away — indistinguishable from a
    // WITH CHECK refusal. That is AD-ReturningMasksCheck-1, the trap W06 recorded
    // and W05's clause 2 was rewritten to demand: the bypass write must not
    // produce a RETURNING.
    //
    // So: raw INSERT, no RETURNING, caller-supplied ref_code. The composite FK is
    // satisfied (the report really is HK1's) and nothing reads the row back, so
    // the ONLY thing left to refuse it is this policy's WITH CHECK.
    await expect(
      sg1.$executeRawUnsafe(
        `INSERT INTO rm_report_versions
           (id, ref_code, org_entity_id, report_id, version_label, prepared_by,
            approved_by, effective_date, change_note, snapshot_at, sheet, updated_at)
         VALUES (gen_random_uuid(), 'RMRV-HK1-999001', '${HK1}', '${hk1Report.id}',
                 'bypass', 'ITSC', 'ISC', now(), 'written around the counter',
                 now(), '{}'::jsonb, now())`,
      ),
    ).rejects.toThrow();

    const hk1 = await clientFor(['HK1']);
    const landed = await hk1.rMReportVersion.findMany({ where: { refCode: 'RMRV-HK1-999001' } });
    // Refused, not merely errored: HK1 itself cannot see the row either.
    expect(landed).toHaveLength(0);
  });

  it('14. but a duplicate label on the caller’s OWN report is told plainly', async () => {
    const report = await createReport('SG1');
    await issue('SG1', report.id, { versionLabel: '2024' });

    const error = await issue('SG1', report.id, { versionLabel: '2024' }).catch((e: unknown) => e);

    // Not collapsed into the 404 family. The caller owns this report and chose
    // this label; refusing to say it is taken would hide a rule from the only
    // person who can satisfy it, and reveal nothing in return (the W09 reasoning
    // for 23514 -> 422, applied to 23505 -> 409).
    expect(error).toBeInstanceOf(DuplicateKeyError);
  });
});
