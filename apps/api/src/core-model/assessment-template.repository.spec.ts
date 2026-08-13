/**
 * File: apps/api/src/core-model/assessment-template.repository.spec.ts
 * Purpose: What the insert must never contain, and what it deliberately does not check.
 * Category: Test (unit)
 * Scope: Phase W09
 *
 * Description:
 *   assessment.int.spec.ts proves the database half. What only a unit test can
 *   show is what this layer CHOOSES to send:
 *
 *     - no `version`, so the column default (1) decides. Nothing in this codebase
 *       increments it, so accepting one would let a caller publish "version 9" of
 *       a template edited once — and an instance would snapshot that claim.
 *     - `definition` passes through untouched, whatever shape it has.
 *     - validation happens BEFORE a reference code is allocated.
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 */
import { AssessmentTemplateRepository } from './assessment-template.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedAssessmentTemplateClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const OWNER = '00000000-0000-0000-0000-0000000000d0';

const INPUT = {
  orgEntityId: SG1,
  name: 'Annual RCSA',
  subjectType: 'risk',
  definition: { sections: [] },
} as Parameters<AssessmentTemplateRepository['create']>[1];

function build(options: { catalog?: unknown[]; createThrows?: unknown } = {}) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};

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
    assessmentTemplate: {
      findMany: async () => [],
      create: async (args: { data: Record<string, unknown> }) => {
        calls.push('insert');
        inserted = args.data;
        if (options.createThrows) {
          throw options.createThrows;
        }
        return { id: 'created', ...args.data };
      },
    },
  } as unknown as ScopedAssessmentTemplateClient;

  return { repo: new AssessmentTemplateRepository(), client, calls, insert: () => inserted };
}

describe('AssessmentTemplateRepository.create', () => {
  it('never names version in the insert', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // Not on CreateAssessmentTemplateInput. This is what a caller who sends it
      // achieves — nothing. AssessmentInstance snapshots this number as
      // provenance, so a caller-chosen value would be provenance the caller wrote.
      version: 9,
    } as Parameters<AssessmentTemplateRepository['create']>[1]);

    expect(insert()).not.toHaveProperty('version');
  });

  it('never names status — this table has no lifecycle', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // §4 gives the lifecycle to the instance. A status here would be inventing
    // states (已確認參數 #9).
    expect(insert()).not.toHaveProperty('status');
  });

  it('issues the ref_code itself, with the ASTM prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().refCode).toBe('ASTM-SG1-000007');
  });

  it('passes definition through unchanged, whatever shape it has', async () => {
    const { repo, client, insert } = build();
    const weird = { not: 'a section list', n: [1, 2, 3] };

    await repo.create(client, { ...INPUT, definition: weird });

    // ⛔ Deliberate. 02a specifies no structure for this document, so there is
    // nothing to validate against and a check here would enforce a guess.
    expect(insert().definition).toEqual(weird);
  });

  it('validates extensions BEFORE allocating a reference code', async () => {
    const { repo, client, calls } = build({
      catalog: [{ key: 'known', dataType: 'string', required: false, orgEntityId: null }],
    });

    await expect(
      repo.create(client, { ...INPUT, extensions: { unknownKey: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    expect(calls).toEqual(['catalog']);
  });

  it('an absent ownerUserId becomes NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().ownerUserId).toBeNull();
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to UnknownReferenceError naming the owner, never the id', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo
      .create(client, { ...INPUT, ownerUserId: OWNER })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // Only one reference on this table can raise 23503 — the owner.
    expect((error as UnknownReferenceError).field).toBe('owner');
    expect((error as Error).message).not.toContain(OWNER);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('AssessmentTemplateRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      assessmentTemplate: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedAssessmentTemplateClient;

    await new AssessmentTemplateRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
