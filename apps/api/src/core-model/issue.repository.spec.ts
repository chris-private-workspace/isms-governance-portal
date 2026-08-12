/**
 * File: apps/api/src/core-model/issue.repository.spec.ts
 * Purpose: What the insert must never contain, and which refusal maps to which error.
 * Category: Test (unit)
 * Scope: Phase W08
 *
 * Description:
 *   issue.int.spec.ts proves the database half. What only a unit test can show is
 *   what this layer CHOOSES to send:
 *
 *     - no `status`, so the column default (`open`) decides. A caller passing
 *       `closed` gets it dropped, which is the difference between raising a
 *       finding and declaring it already dealt with.
 *     - validation happens BEFORE a reference code is allocated.
 *     - 42501 and 23503 map to different errors, naming the right field.
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 */
import { ExtensionValidationError } from './extension-validator';
import { IssueRepository } from './issue.repository';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedIssueClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const OWNER = '00000000-0000-0000-0000-0000000000d0';

const INPUT = {
  orgEntityId: SG1,
  title: 'Backup restore was never tested',
  source: 'test',
  severity: 'high',
} as Parameters<IssueRepository['create']>[1];

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
    issue: {
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
  } as unknown as ScopedIssueClient;

  return { repo: new IssueRepository(), client, calls, insert: () => inserted };
}

describe('IssueRepository.create', () => {
  it('never names status in the insert', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // Not on CreateIssueInput. This is what a caller who sends it achieves —
      // nothing. Every value in 02a §4 other than `open` is reached by a
      // transition, and 02a:409 puts a rule on one of them that nothing here
      // could check.
      status: 'closed',
    } as Parameters<IssueRepository['create']>[1]);

    expect(insert()).not.toHaveProperty('status');
  });

  it('issues the ref_code itself, with the ISSU prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().refCode).toBe('ISSU-SG1-000007');
  });

  it('validates extensions BEFORE allocating a reference code', async () => {
    const { repo, client, calls } = build({
      catalog: [{ key: 'known', dataType: 'string', required: false, orgEntityId: null }],
    });

    await expect(
      repo.create(client, { ...INPUT, extensions: { unknownKey: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    // A rejected payload must not burn a number.
    expect(calls).toEqual(['catalog']);
  });

  it('absent description, dueDate and ownerUserId become NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().description).toBeNull();
    expect(insert().dueDate).toBeNull();
    expect(insert().ownerUserId).toBeNull();
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to UnknownReferenceError naming the owner, never the id', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo
      .create(client, { ...INPUT, ownerUserId: OWNER } as Parameters<IssueRepository['create']>[1])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // Only one reference on this table can raise 23503 — the owner. Unlike
    // ControlTest, there is no second candidate to blur it with.
    expect((error as UnknownReferenceError).field).toBe('owner');
    expect((error as Error).message).not.toContain(OWNER);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('IssueRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      issue: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedIssueClient;

    await new IssueRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
