/**
 * File: apps/api/src/core-model/rm-report.repository.spec.ts
 * Purpose: That the promote is absent here, and that a snapshot's insert names no mutable state.
 * Category: Test (unit)
 * Scope: Phase W10
 *
 * Description:
 *   rm-report.int.spec.ts proves the database refuses updates and moves the
 *   pointer. What only a unit test can show is that this layer never ATTEMPTS
 *   either — no report lookup before the insert (the oracle 約束 8 forbids), and
 *   no pointer write after it (the two-transaction problem the trigger exists to
 *   solve). Both are asserted through the recorded call sequence, because an
 *   assertion on the result would pass either way.
 *
 *   Also pinned: `state` never reaches the insert. 02a:257 names it, this project
 *   deliberately does not build it, and a docstring saying so is not a test.
 *
 * Created: 2026-08-13 (Phase W10)
 * Last Modified: 2026-08-13
 */
import { ExtensionValidationError } from './extension-validator';
import { RmReportRepository } from './rm-report.repository';
import { DuplicateKeyError, ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedRmReportClient, ScopedRmReportVersionClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const REPORT = '00000000-0000-0000-0000-000000000f10';

const REPORT_INPUT = { orgEntityId: SG1, title: 'APAC IT Risk Management Report' };

const VERSION_INPUT = {
  orgEntityId: SG1,
  reportId: REPORT,
  versionLabel: '2025.7',
  preparedBy: 'ITSC',
  approvedBy: 'ISC',
  effectiveDate: new Date('2025-07-28T00:00:00Z'),
  changeNote: 'Annual review — no change to control set',
  snapshotAt: new Date('2025-07-28T00:00:00Z'),
  sheet: { services: [], assets: [] },
};

function build(options: { catalog?: unknown[]; createThrows?: unknown } = {}) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};

  const table = (name: string) => ({
    findMany: async () => [],
    create: async (args: { data: Record<string, unknown> }) => {
      calls.push(name);
      inserted = args.data;
      if (options.createThrows) {
        throw options.createThrows;
      }
      return { id: 'created', ...args.data };
    },
  });

  // ⚠️ BOTH delegates are present on this double, deliberately. The runtime
  // object always has every table; what stops the repository reaching the report
  // is the TYPE it is handed. If the production code ever grows a lookup or a
  // pointer write, this double will happily serve it and the call-sequence
  // assertions below are what fail — which is the point of recording them.
  const client = {
    refCodeCounter: {
      upsert: async () => {
        calls.push('issueRefCode');
        return { lastSeq: 7 };
      },
    },
    orgEntity: { findUnique: async () => ({ id: SG1, code: 'SG1' }) },
    extensionField: {
      findMany: async () => {
        calls.push('catalog');
        return options.catalog ?? [];
      },
    },
    riskManagementReport: {
      ...table('insertReport'),
      update: async () => {
        calls.push('UPDATE-REPORT');
        return {};
      },
      findUnique: async () => {
        calls.push('READ-REPORT');
        return null;
      },
    },
    rMReportVersion: table('insertVersion'),
  };

  return {
    repo: new RmReportRepository(),
    reportClient: client as unknown as ScopedRmReportClient,
    versionClient: client as unknown as ScopedRmReportVersionClient,
    calls,
    insert: () => inserted,
  };
}

describe('RmReportRepository.create', () => {
  it('issues the ref_code itself, with the RMRP prefix and the entity code', async () => {
    const { repo, reportClient, insert } = build();

    await repo.create(reportClient, REPORT_INPUT);

    expect(insert().refCode).toBe('RMRP-SG1-000007');
  });

  it('never names currentVersionId — a report has no version until one is issued', async () => {
    const { repo, reportClient, insert } = build();

    await repo.create(reportClient, {
      ...REPORT_INPUT,
      // Not on CreateRmReportInput. A caller able to set this at creation could
      // point a brand-new report at some other report's version before the
      // composite FK had anything to check against.
      currentVersionId: '00000000-0000-0000-0000-000000000f99',
    } as Parameters<RmReportRepository['create']>[1]);

    expect(insert()).not.toHaveProperty('currentVersionId');
  });

  it('maps 42501 to ScopeRefusedError', async () => {
    const { repo, reportClient } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(reportClient, REPORT_INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });
});

describe('RmReportRepository.issueVersion', () => {
  it('issues the ref_code itself, with the RMRV prefix', async () => {
    const { repo, versionClient, insert } = build();

    await repo.issueVersion(versionClient, VERSION_INPUT);

    expect(insert().refCode).toBe('RMRV-SG1-000007');
  });

  it('neither reads the report first nor writes the pointer after', async () => {
    const { repo, versionClient, insert, calls } = build();

    await repo.issueVersion(versionClient, VERSION_INPUT);

    expect(insert().reportId).toBe(REPORT);
    // The whole design, in one assertion. No READ-REPORT: the pre-check would be
    // the oracle, and ScopedRmReportVersionClient cannot name that delegate. No
    // UPDATE-REPORT: runScoped gives each operation its own transaction, so a
    // promote here would be a second unit of work that can fail alone. The
    // AFTER INSERT trigger does it instead, inside this insert.
    expect(calls).toEqual(['catalog', 'issueRefCode', 'insertVersion']);
  });

  it('never names state — 02a:257 lists it and this project does not build it', async () => {
    const { repo, versionClient, insert } = build();

    await repo.issueVersion(versionClient, {
      ...VERSION_INPUT,
      state: 'current',
    } as Parameters<RmReportRepository['issueVersion']>[1]);

    expect(insert()).not.toHaveProperty('state');
  });

  it('keeps prepared_by and approved_by as the strings the committee signed with', async () => {
    const { repo, versionClient, insert } = build();

    await repo.issueVersion(versionClient, VERSION_INPUT);

    // Not user ids, not resolved to anything. 02a:262 — do not silently coerce a
    // committee into a user record, because that would misstate who approved.
    expect(insert().preparedBy).toBe('ITSC');
    expect(insert().approvedBy).toBe('ISC');
  });

  it('validates extensions BEFORE allocating a reference code', async () => {
    const { repo, versionClient, calls } = build({
      catalog: [{ key: 'known', dataType: 'string', required: false, orgEntityId: null }],
    });

    await expect(
      repo.issueVersion(versionClient, { ...VERSION_INPUT, extensions: { unknownKey: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    expect(calls).toEqual(['catalog']);
  });

  it('maps 23503 to UnknownReferenceError, naming the field and never the id', async () => {
    const { repo, versionClient } = build({ createThrows: { code: '23503' } });

    const error = await repo.issueVersion(versionClient, VERSION_INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    expect((error as UnknownReferenceError).field).toBe('risk management report');
    expect((error as Error).message).not.toContain(REPORT);
  });

  it('maps 23505 to DuplicateKeyError — safe only because the key carries the entity', async () => {
    const { repo, versionClient } = build({ createThrows: { code: '23505' } });

    const error = await repo.issueVersion(versionClient, VERSION_INPUT).catch((e: unknown) => e);

    // Before 20260813153153 this branch would have been an oracle: the unique
    // index ignores RLS and fires ahead of the foreign key, so 23505 could only
    // be reached by colliding with a row the caller cannot see. With
    // org_entity_id in the key it is reachable only on the caller's own report.
    expect(error).toBeInstanceOf(DuplicateKeyError);
    expect((error as DuplicateKeyError).field).toBe('version label');
  });

  it('maps 42501 to ScopeRefusedError — the version row itself was out of scope', async () => {
    const { repo, versionClient } = build({ createThrows: { code: '42501' } });

    await expect(repo.issueVersion(versionClient, VERSION_INPUT)).rejects.toBeInstanceOf(
      ScopeRefusedError,
    );
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, versionClient } = build({ createThrows: boom });

    await expect(repo.issueVersion(versionClient, VERSION_INPUT)).rejects.toBe(boom);
  });
});

describe('RmReportRepository list paths', () => {
  it('filters retired reports and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      riskManagementReport: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedRmReportClient;

    await new RmReportRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });

  it('orders versions by effective date, not by insertion', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      rMReportVersion: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedRmReportVersionClient;

    await new RmReportRepository().listVersions(client);

    // rmVersions.js:4-8 lists five versions whose labels do not sort — `2025.7`,
    // `2024`, `1.2`. What orders them is the date they took effect.
    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { effectiveDate: 'desc' } });
  });
});
