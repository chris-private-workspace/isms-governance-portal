/**
 * File: apps/api/src/core-model/action.repository.spec.ts
 * Purpose: What the insert must never contain, and that the parent is never looked up.
 * Category: Test (unit)
 * Scope: Phase W08
 *
 * Description:
 *   action.int.spec.ts proves the composite key refuses another entity's issue.
 *   What only a unit test can show is that this layer never TRIES to find out
 *   first — the pre-check is the oracle 約束 8 forbids, and the type is what makes
 *   writing it impossible rather than merely discouraged.
 *
 *   Also pinned: `status`, `completedAt` and `verifiedBy` are dropped. An assignee
 *   who could set all three would be recording their own verification.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 */
import { ActionRepository } from './action.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedActionClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const ISSUE = '00000000-0000-0000-0000-000000000e10';

const INPUT = {
  orgEntityId: SG1,
  issueId: ISSUE,
  description: 'Schedule and run a restore drill',
};

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
    action: {
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
  } as unknown as ScopedActionClient;

  return { repo: new ActionRepository(), client, calls, insert: () => inserted };
}

describe('ActionRepository.create', () => {
  it('never names status, completedAt or verifiedBy in the insert', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // None of these exist on CreateActionInput. Together they would let the
      // assignee close and verify their own action in one call — 02a:398 makes
      // Completed and Verified separate states for exactly that reason.
      status: 'verified',
      completedAt: new Date(),
      verifiedBy: '00000000-0000-0000-0000-0000000000d0',
    } as Parameters<ActionRepository['create']>[1]);

    expect(insert()).not.toHaveProperty('status');
    expect(insert()).not.toHaveProperty('completedAt');
    expect(insert()).not.toHaveProperty('verifiedBy');
  });

  it('issues the ref_code itself, with the ACTN prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().refCode).toBe('ACTN-SG1-000007');
  });

  it('passes issueId straight through — the composite key decides whether it is reachable', async () => {
    const { repo, client, insert, calls } = build();

    await repo.create(client, INPUT);

    // No lookup, no pre-check. ScopedActionClient cannot name the issue table,
    // which is what makes reading it first unwritable rather than discouraged.
    // The call sequence is the assertion: nothing between catalog and insert
    // went looking for the parent.
    expect(insert().issueId).toBe(ISSUE);
    expect(calls).toEqual(['catalog', 'issueRefCode', 'insert']);
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

  it('absent assigneeUserId and dueDate become NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().assigneeUserId).toBeNull();
    expect(insert().dueDate).toBeNull();
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to UnknownReferenceError, naming both candidates and neither id', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // Two references can raise this — the issue (composite key) and the assignee
    // (its own key). Naming one would answer "does the other exist?" by omission.
    expect((error as UnknownReferenceError).field).toBe('issue or assignee');
    expect((error as Error).message).not.toContain(ISSUE);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('ActionRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      action: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedActionClient;

    await new ActionRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
