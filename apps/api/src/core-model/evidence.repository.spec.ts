/**
 * File: apps/api/src/core-model/evidence.repository.spec.ts
 * Purpose: What this layer sets rather than accepts, and which refusal names which field.
 * Category: Test (unit)
 * Scope: Phase W07
 *
 * Description:
 *   evidence.int.spec.ts proves the database half — including that the trigger is
 *   the only thing standing in for a foreign key that does not exist. What only a
 *   unit test can show:
 *
 *     - `linkedType` is SET here, never accepted, because it has one legal value.
 *     - `linkedId` is passed straight through: no lookup, because a lookup is the
 *       oracle.
 *     - 23503 names `linkedId` specifically, unlike ControlTestRepository. It can:
 *       `linked_id` is the ONLY reference on this table (the column has no foreign
 *       key, and nothing else here does either), so naming it excludes nothing.
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 */
import { EvidenceRepository } from './evidence.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedEvidenceClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const TEST_ID = '00000000-0000-0000-0000-000000000a60';

const INPUT = {
  orgEntityId: SG1,
  kind: 'screenshot',
  uriOrBlobRef: 'file://evidence.png',
  hash: 'sha256:abc',
  linkedId: TEST_ID,
};

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
    orgEntity: {
      findUnique: async () => ({ id: SG1, code: 'SG1' }),
    },
    extensionField: {
      findMany: async () => {
        calls.push('catalog');
        return options.catalog ?? [];
      },
    },
    evidence: {
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
  } as unknown as ScopedEvidenceClient;

  return { repo: new EvidenceRepository(), client, calls, insert: () => inserted };
}

describe('EvidenceRepository.create', () => {
  it('sets linkedType itself and ignores anything a caller sends for it', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // Not on CreateEvidenceInput. EvidenceLinkedType has one value, so a field
      // for it would be a field with one legal answer.
      linkedType: 'attestation',
    } as Parameters<EvidenceRepository['create']>[1]);

    expect(insert().linkedType).toBe('control_test');
  });

  it('issues the ref_code itself, with the EVID prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // The stub's upsert returns the already-incremented sequence, as the real one
    // does — issueRefCode formats what it is handed, it does not add to it.
    expect(insert().refCode).toBe('EVID-SG1-000003');
  });

  it('passes linkedId straight through — nothing here reads the parent first', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // ScopedEvidenceClient cannot name `controlTest`, so a pre-check is not
    // merely omitted here — it is unwritable. That is the whole guard, because
    // the column has no foreign key behind it either.
    expect(insert().linkedId).toBe(TEST_ID);
  });

  it('defaults collectedAt to now rather than leaving it unset', async () => {
    const { repo, client, insert } = build();
    const before = Date.now();

    await repo.create(client, INPUT);

    expect((insert().collectedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('validates extensions BEFORE allocating a reference code', async () => {
    const { repo, client, calls } = build({
      catalog: [{ key: 'known', dataType: 'string', required: false, orgEntityId: null }],
    });

    await expect(repo.create(client, { ...INPUT, extensions: { nope: 1 } })).rejects.toBeInstanceOf(
      ExtensionValidationError,
    );

    expect(calls).toEqual(['catalog']);
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('maps 23503 to UnknownReferenceError naming linkedId, and never the id itself', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    expect((error as UnknownReferenceError).field).toBe('linkedId');
    // Echoing the id back would be harmless — the caller sent it. Echoing
    // anything the database said ABOUT it would not be, and the class cannot
    // hold that.
    expect((error as Error).message).not.toContain(TEST_ID);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('EvidenceRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      evidence: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedEvidenceClient;

    await new EvidenceRepository().list(client);

    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
