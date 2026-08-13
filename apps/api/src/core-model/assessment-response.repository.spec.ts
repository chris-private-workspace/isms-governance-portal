/**
 * File: apps/api/src/core-model/assessment-response.repository.spec.ts
 * Purpose: That an unasked question is accepted, and that two references give one error.
 * Category: Test (unit)
 * Scope: Phase W09
 *
 * Description:
 *   The cost of `definition` being a document rather than a table shows up here
 *   as a PASSING test: `questionId` is checked by nothing, so an answer to a
 *   question that was never asked inserts cleanly. Written as an assertion rather
 *   than left implicit — if a questions table ever exists, this is the test that
 *   must change.
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 */
import { AssessmentResponseRepository } from './assessment-response.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedAssessmentResponseClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const INSTANCE = '00000000-0000-0000-0000-000000000ab0';
const EVIDENCE = '00000000-0000-0000-0000-000000000a70';

const INPUT = {
  orgEntityId: SG1,
  instanceId: INSTANCE,
  questionId: 'q1',
  answer: { value: 'yes' },
} as Parameters<AssessmentResponseRepository['create']>[1];

function build(options: { catalog?: unknown[]; createThrows?: unknown } = {}) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};

  const client = {
    refCodeCounter: {
      upsert: async () => {
        calls.push('issueRefCode');
        return { lastSeq: 1 };
      },
    },
    orgEntity: { findUnique: async () => ({ id: SG1, code: 'SG1' }) },
    extensionField: {
      findMany: async () => {
        calls.push('catalog');
        return options.catalog ?? [];
      },
    },
    assessmentResponse: {
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
  } as unknown as ScopedAssessmentResponseClient;

  return { repo: new AssessmentResponseRepository(), client, calls, insert: () => inserted };
}

describe('AssessmentResponseRepository.create', () => {
  it('accepts a questionId that no template defines — nothing can refuse it', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, { ...INPUT, questionId: 'never-asked' });

    // ⛔ Not a gap in this file: there is no questions table to check against, and
    // this repository cannot read templates by design. Stated as a test so the
    // limitation is visible from the suite rather than only from a docstring.
    expect(insert().questionId).toBe('never-asked');
  });

  it('issues the ref_code itself, with the ASRP prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // ⚠️ One of these per ANSWER. A 40-question submission makes 40 round trips
    // through a per-entity serialisation point (W04). Built to §1.1, which grants
    // no exemption; the cost is recorded rather than dodged.
    expect(insert().refCode).toBe('ASRP-SG1-000001');
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

  it('an absent evidenceId becomes NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // NULL matters here beyond tidiness: PostgreSQL's MATCH SIMPLE skips the
    // composite key when any column is NULL, which is what keeps the column
    // optional rather than silently mandatory.
    expect(insert().evidenceId).toBeNull();
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to ONE error, whether the instance or the evidence was unreachable', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo
      .create(client, { ...INPUT, evidenceId: EVIDENCE })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // ⚠️ Naming which of the two failed would tell the caller the other one WAS
    // reachable — the oracle by instalments.
    expect((error as UnknownReferenceError).field).toBe('instance');
    expect((error as Error).message).not.toContain(EVIDENCE);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('AssessmentResponseRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      assessmentResponse: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedAssessmentResponseClient;

    await new AssessmentResponseRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
