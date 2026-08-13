/**
 * File: apps/api/src/modules/rm-report/rm-report.controller.spec.ts
 * Purpose: That a duplicate label is 409 while an unreachable report is 404, and why.
 * Category: Test (unit)
 * Scope: Phase W10
 *
 * Description:
 *   rm-report.int.spec.ts proves the database produces the three refusals. What
 *   only a unit test can show is that they do NOT all become the same answer:
 *   collapsing the duplicate into 404 would hide a rule the caller must satisfy,
 *   and splitting the other two would confirm an id it was guessing at.
 *
 *   Also pinned: a required timestamp that is absent is a 400 rather than a NULL
 *   column, and `sheet` must be an object — a snapshot that quietly stored
 *   nothing would be the worst possible outcome for a table whose whole job is to
 *   be trusted later.
 *
 * Created: 2026-08-13 (Phase W10)
 * Last Modified: 2026-08-13
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import type { RmReportRepository } from '../../core-model/rm-report.repository';
import {
  DuplicateKeyError,
  ScopeRefusedError,
  UnknownReferenceError,
} from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { RiskManagementReport, RMReportVersion } from '../../generated/prisma';
import { RmReportController } from './rm-report.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const REPORT = '00000000-0000-0000-0000-000000000f10';

const REPORT_BODY = { orgEntityId: SG1, title: 'APAC IT Risk Management Report' };

const VERSION_BODY = {
  orgEntityId: SG1,
  reportId: REPORT,
  versionLabel: '2025.7',
  preparedBy: 'ITSC',
  approvedBy: 'ISC',
  effectiveDate: '2025-07-28T00:00:00.000Z',
  changeNote: 'Annual review — no change to control set',
  snapshotAt: '2025-07-28T00:00:00.000Z',
  sheet: { services: [] },
};

function build(options: { createThrows?: unknown; issueThrows?: unknown } = {}) {
  const issueCalls: Record<string, unknown>[] = [];

  const resolver = {
    resolve: async () => ({}) as EntityScope,
  } as unknown as EntityScopeResolver;
  const scoped = { forScope: () => ({}) } as unknown as ScopedPrismaFactory;

  const repo = {
    list: async () => [{ id: 'listed' } as unknown as RiskManagementReport],
    listVersions: async () => [{ id: 'listed-version' } as unknown as RMReportVersion],
    create: async () => {
      if (options.createThrows) {
        throw options.createThrows;
      }
      return { id: 'created' } as unknown as RiskManagementReport;
    },
    issueVersion: async (_client: unknown, input: Record<string, unknown>) => {
      issueCalls.push(input);
      if (options.issueThrows) {
        throw options.issueThrows;
      }
      return { id: 'issued' } as unknown as RMReportVersion;
    },
  } as unknown as RmReportRepository;

  return { controller: new RmReportController(resolver, scoped, repo), issueCalls };
}

describe('RmReportController.createReport', () => {
  it('refuses a missing title with 400 rather than storing an empty deliverable', async () => {
    const { controller } = build();

    await expect(controller.createReport({ orgEntityId: SG1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps a scope refusal to 404, never 403', async () => {
    const { controller } = build({ createThrows: new ScopeRefusedError(SG1) });

    await expect(controller.createReport(REPORT_BODY)).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['ownerUserId', { ownerUserId: 42 }],
    ['extensions', { extensions: 'not an object' }],
  ])('refuses a %s of the wrong type rather than dropping it', async (_field, over) => {
    const { controller } = build();

    // AD-SilentFieldDrop-1's shape: a field the caller sent and the server threw
    // away looks identical to one they never sent.
    await expect(controller.createReport({ ...REPORT_BODY, ...over })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps an extension violation to 422 with the offending key', async () => {
    const { controller } = build({ createThrows: new ExtensionValidationError('nope', 'badKey') });

    const error = await controller.createReport(REPORT_BODY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({ key: 'badKey' });
  });
});

describe('RmReportController.issueVersion', () => {
  it('parses both required timestamps into Dates', async () => {
    const { controller, issueCalls } = build();

    await controller.issueVersion(VERSION_BODY);

    expect(issueCalls[0]?.effectiveDate).toEqual(new Date('2025-07-28T00:00:00.000Z'));
    expect(issueCalls[0]?.snapshotAt).toEqual(new Date('2025-07-28T00:00:00.000Z'));
  });

  it('refuses an absent effectiveDate with 400 — never a NULL column', async () => {
    const { controller } = build();

    await expect(
      controller.issueVersion({ ...VERSION_BODY, effectiveDate: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an unparseable snapshotAt with 400', async () => {
    const { controller } = build();

    await expect(
      controller.issueVersion({ ...VERSION_BODY, snapshotAt: 'soon' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['absent', undefined],
    ['null', null],
    ['a bare string', 'the whole report, honest'],
  ])('refuses a sheet that is %s', async (_label, sheet) => {
    const { controller } = build();

    // The contents are not validated — there is no specification to validate
    // against. What IS refused is a snapshot that stored nothing while looking
    // like it stored something, which is the failure this table cannot survive.
    await expect(controller.issueVersion({ ...VERSION_BODY, sheet })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('passes the sheet through untouched — no normalisation, no defaults', async () => {
    const { controller, issueCalls } = build();
    const sheet = { services: [{ name: 'MPS' }], treatment: null, extra: 7 };

    await controller.issueVersion({ ...VERSION_BODY, sheet });

    expect(issueCalls[0]?.sheet).toEqual(sheet);
  });

  it.each(['reportId', 'versionLabel', 'preparedBy', 'approvedBy', 'changeNote'])(
    'refuses a missing %s with 400',
    async (field) => {
      const { controller } = build();

      await expect(
        controller.issueVersion({ ...VERSION_BODY, [field]: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('refuses extensions of the wrong type', async () => {
    const { controller } = build();

    await expect(
      controller.issueVersion({ ...VERSION_BODY, extensions: 'not an object' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets an unrecognised error through unchanged rather than dressing it as a 4xx', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { controller } = build({ issueThrows: boom });

    await expect(controller.issueVersion(VERSION_BODY)).rejects.toBe(boom);
  });

  it('maps an unreachable report to 404, disclosing neither the id nor which half failed', async () => {
    const { controller } = build({
      issueThrows: new UnknownReferenceError('risk management report'),
    });

    const error = await controller.issueVersion(VERSION_BODY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect(JSON.stringify((error as NotFoundException).getResponse())).not.toContain(REPORT);
  });

  it('maps a duplicate version label to 409, NOT to 404', async () => {
    const { controller } = build({ issueThrows: new DuplicateKeyError('version label') });

    const error = await controller.issueVersion(VERSION_BODY).catch((e: unknown) => e);

    // The distinction is the assertion. A 404 here would be indistinguishable
    // from "no such report" and would hide, from someone who owns the report,
    // that the label they chose is already taken. It is safe to say so only
    // because 20260813153153 put org_entity_id in the unique key — before that,
    // reaching this branch at all meant colliding with a row the caller could
    // not see.
    expect(error).toBeInstanceOf(ConflictException);
    expect(error).not.toBeInstanceOf(NotFoundException);
  });
});

describe('RmReportController list paths', () => {
  it('returns reports and versions with the dev-principal marker', async () => {
    const { controller } = build();

    await expect(controller.listReports()).resolves.toMatchObject({
      data: [{ id: 'listed' }],
    });
    await expect(controller.listVersions()).resolves.toMatchObject({
      data: [{ id: 'listed-version' }],
    });
  });
});
