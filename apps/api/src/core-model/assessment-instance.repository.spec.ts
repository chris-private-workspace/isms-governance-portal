/**
 * File: apps/api/src/core-model/assessment-instance.repository.spec.ts
 * Purpose: That the caller cannot state a version, and that three refusals stay three.
 * Category: Test (unit)
 * Scope: Phase W09
 *
 * Description:
 *   The integration suite proves the trigger and the CHECK. What only a unit test
 *   can show is the shape of what this layer sends and how it classifies what
 *   comes back:
 *
 *     - `templateVersion: 0` is always written, never a caller's number. 0 is the
 *       value the trigger itself leaves when the template is unreachable, so this
 *       file never states a version it did not observe.
 *     - 23514 -> SegregationOfDutiesError, which is NOT one of the two 404s. That
 *       separation is the whole reason the third predicate exists.
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 */
import {
  AssessmentInstanceRepository,
  SegregationOfDutiesError,
} from './assessment-instance.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedAssessmentInstanceClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const TEMPLATE = '00000000-0000-0000-0000-000000000aa0';
const USER = '00000000-0000-0000-0000-0000000000d0';

const INPUT = {
  orgEntityId: SG1,
  templateId: TEMPLATE,
  subjectType: 'risk',
  subjectId: '00000000-0000-0000-0000-000000000a20',
  period: new Date('2026-01-01T00:00:00Z'),
} as Parameters<AssessmentInstanceRepository['create']>[1];

function build(options: { catalog?: unknown[]; createThrows?: unknown } = {}) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};

  const client = {
    refCodeCounter: {
      upsert: async () => {
        calls.push('issueRefCode');
        return { lastSeq: 3 };
      },
    },
    orgEntity: { findUnique: async () => ({ id: SG1, code: 'SG1' }) },
    extensionField: {
      findMany: async () => {
        calls.push('catalog');
        return options.catalog ?? [];
      },
    },
    assessmentInstance: {
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
  } as unknown as ScopedAssessmentInstanceClient;

  return { repo: new AssessmentInstanceRepository(), client, calls, insert: () => inserted };
}

describe('AssessmentInstanceRepository.create', () => {
  it('always writes templateVersion 0, discarding whatever the caller sent', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // Not on CreateAssessmentInstanceInput. The BEFORE INSERT trigger overwrites
      // this unconditionally; 0 is what the trigger leaves when the template is
      // unreachable, so this file never states a version it did not observe.
      templateVersion: 99,
    } as Parameters<AssessmentInstanceRepository['create']>[1]);

    expect(insert().templateVersion).toBe(0);
  });

  it('never names status — every later state is reached by a transition', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert()).not.toHaveProperty('status');
  });

  it('issues the ref_code itself, with the ASIN prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().refCode).toBe('ASIN-SG1-000003');
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

  it('absent assignee and reviewer become NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().assigneeUserId).toBeNull();
    expect(insert().reviewerUserId).toBeNull();
  });

  it('maps 23514 to SegregationOfDutiesError, and NOT to either 404', async () => {
    const { repo, client } = build({ createThrows: { code: '23514' } });

    const error = await repo
      .create(client, { ...INPUT, assigneeUserId: USER, reviewerUserId: USER })
      .catch((e: unknown) => e);

    // guardrail 6: this one is safe to explain, unlike the two below. Collapsing
    // it into a 404 would hide a control from the person who has to satisfy it.
    expect(error).toBeInstanceOf(SegregationOfDutiesError);
    expect(error).not.toBeInstanceOf(ScopeRefusedError);
    expect(error).not.toBeInstanceOf(UnknownReferenceError);
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to one error naming the template, whichever reference failed', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo
      .create(client, { ...INPUT, assigneeUserId: USER })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // ⚠️ Three references can raise 23503 here — template, assignee, reviewer.
    // Naming which one failed would tell the caller the others WERE reachable.
    expect((error as UnknownReferenceError).field).toBe('template');
    expect((error as Error).message).not.toContain(TEMPLATE);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('AssessmentInstanceRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      assessmentInstance: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedAssessmentInstanceClient;

    await new AssessmentInstanceRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
