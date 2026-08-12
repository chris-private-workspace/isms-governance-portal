/**
 * File: apps/api/src/core-model/control-test.repository.spec.ts
 * Purpose: What the insert must never contain, and which refusal maps to which error.
 * Category: Test (unit)
 * Scope: Phase W07
 *
 * Description:
 *   control-test.int.spec.ts proves the database half. What only a unit test can
 *   show is what this layer CHOOSES to send, and what it refuses to send even when
 *   a caller insists:
 *
 *     - no `status`, so the column default decides. A caller passing `passed`
 *       gets it dropped here, which is the difference between "scheduling a test"
 *       and "self-certifying one" (02a:416 puts SoD on the review transition).
 *     - no `performedAt` / `reviewerUserId` / `conclusion`, for the same reason.
 *     - validation happens BEFORE a reference code is allocated.
 *     - 42501 and 23503 map to DIFFERENT errors. Getting this wrong is not a
 *       leak — both answer 404 — but it would report the wrong field, and W07 Day 2
 *       chose 23503 for the trigger precisely so the right one could be named.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 */
import { ControlTestRepository } from './control-test.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedControlTestClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const CONTROL = '00000000-0000-0000-0000-000000000a50';

const INPUT = { orgEntityId: SG1, controlId: CONTROL };

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
    orgEntity: {
      findUnique: async () => ({ id: SG1, code: 'SG1' }),
    },
    extensionField: {
      findMany: async () => {
        calls.push('catalog');
        return options.catalog ?? [];
      },
    },
    controlTest: {
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
  } as unknown as ScopedControlTestClient;

  return { repo: new ControlTestRepository(), client, calls, insert: () => inserted };
}

describe('ControlTestRepository.create', () => {
  it('never names status, performedAt, reviewerUserId or conclusion in the insert', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // None of these exist on CreateControlTestInput. This is what a caller who
      // sends them actually achieves — which is nothing. The first one is the
      // one that matters: a settable `passed` is a tester certifying its own work.
      status: 'passed',
      performedAt: new Date(),
      reviewerUserId: '00000000-0000-0000-0000-0000000000d0',
      conclusion: 'all good, trust me',
    } as Parameters<ControlTestRepository['create']>[1]);

    expect(insert()).not.toHaveProperty('status');
    expect(insert()).not.toHaveProperty('performedAt');
    expect(insert()).not.toHaveProperty('reviewerUserId');
    expect(insert()).not.toHaveProperty('conclusion');
  });

  it('issues the ref_code itself, with the CTST prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // The stub's upsert returns the already-incremented sequence, as the real one
    // does — issueRefCode formats what it is handed, it does not add to it.
    expect(insert().refCode).toBe('CTST-SG1-000007');
  });

  it('passes controlId straight through — the database decides whether it is reachable', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // No lookup, no pre-check. ScopedControlTestClient cannot even name the
    // control table, which is what makes reading it first unwritable rather than
    // merely discouraged (約束 8: the pre-check IS the oracle).
    expect(insert().controlId).toBe(CONTROL);
  });

  it('validates extensions BEFORE allocating a reference code', async () => {
    const { repo, client, calls } = build({
      catalog: [{ key: 'known', dataType: 'string', required: false, orgEntityId: null }],
    });

    await expect(
      repo.create(client, { ...INPUT, extensions: { unknownKey: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    // A rejected payload must not burn a number: the sequence is per entity and
    // gaps in it are unexplainable later (policy.repository.ts records this).
    expect(calls).toEqual(['catalog']);
  });

  it('absent scheduledFor and testerUserId become NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().scheduledFor).toBeNull();
    expect(insert().testerUserId).toBeNull();
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to UnknownReferenceError, naming both candidates and neither id', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // Two references can raise this — the control (via the trigger) and the
    // tester (via its foreign key). Naming one would answer "does the other
    // exist?" by omission, which is the risk.repository.ts finding.
    expect((error as UnknownReferenceError).field).toBe('control or tester');
    expect((error as Error).message).not.toContain(CONTROL);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    // A dropped connection is not an authorisation decision. Translating
    // everything to 404 would hide real outages behind "not found", which is the
    // opposite of the mistake scope-refusal.ts was written to fix and just as bad.
    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('ControlTestRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      controlTest: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedControlTestClient;

    await new ControlTestRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
