/**
 * File: apps/api/src/core-model/attestation.repository.spec.ts
 * Purpose: What this layer passes through rather than checks, and which refusal names which field.
 * Category: Test (unit)
 * Scope: Phase W14
 *
 * Description:
 *   attestation.int.spec.ts proves the database half — including where the guard
 *   legitimately stops (a group-shared control is reachable everywhere). What only
 *   a unit test can show:
 *
 *     - `subjectType` is ACCEPTED, unlike EvidenceRepository's `linkedType` was:
 *       both values are legal from the first migration.
 *     - `subjectId` is passed straight through: no lookup, because a lookup is the
 *       oracle. The interface cannot name `policy` or `control` at all.
 *     - 23503 names `subjectId` and NOT `userId`, though both are references. That
 *       is a choice this file pins, because the repository cannot tell them apart
 *       from the error alone.
 *
 * Created: 2026-08-15 (Phase W14)
 * Last Modified: 2026-08-15
 *
 * Modification History (newest-first):
 *   - 2026-08-15: Initial creation (Phase W14)
 */
import { AttestationRepository } from './attestation.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedAttestationClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const POLICY_ID = '00000000-0000-0000-0000-0000000000f0';

const INPUT = {
  orgEntityId: SG1,
  subjectType: 'policy' as const,
  subjectId: POLICY_ID,
  result: 'acknowledged',
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
    attestation: {
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
  } as unknown as ScopedAttestationClient;

  return { repo: new AttestationRepository(), client, calls, insert: () => inserted };
}

describe('AttestationRepository.create', () => {
  /**
   * ⭐ The mirror of evidence.repository.spec.ts's first test, which asserted the
   * OPPOSITE until W14. There a single-valued enum made the field a constant;
   * here both values are legal from the first migration, so the caller owns it.
   */
  it('passes subjectType through — both values are legal, so it is a real field', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, { ...INPUT, subjectType: 'control' });

    expect(insert().subjectType).toBe('control');
  });

  it('issues the ref_code itself, with the ATT prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // The stub's upsert returns the ALREADY-incremented sequence, so 3 is the
    // number this row gets — not the number before it.
    expect(insert().refCode).toBe('ATT-SG1-000003');
  });

  /**
   * ⛔ The oracle guard, stated as an absence.
   *
   * Nothing reads the policy or control before inserting, and the interface makes
   * that unwritable rather than merely discouraged — ScopedAttestationClient can
   * name neither table. A lookup here is what would let this layer tell "another
   * entity's policy" from "no such policy".
   */
  it('never reads the subject before inserting', async () => {
    const { repo, client, calls } = build();

    await repo.create(client, INPUT);

    expect(calls).toEqual(['catalog', 'issueRefCode', 'insert']);
  });

  it('passes subjectId straight through, unexamined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().subjectId).toBe(POLICY_ID);
  });

  it('defaults attestedAt to now rather than leaving it unset', async () => {
    const { repo, client, insert } = build();
    const before = Date.now();

    await repo.create(client, INPUT);

    expect((insert().attestedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('stores an absent userId as NULL rather than undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // ⚠️ Explicitly null, not merely missing: M4 owns the only path that could
    // supply a real one, and an undefined would let Prisma omit the column while
    // the caller believes it was recorded.
    expect(insert().userId).toBeNull();
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

  /**
   * ⚠️ This differs from EvidenceRepository and the difference is a judgement, not
   * an inheritance. There `linked_id` is the only reference on the table, so
   * naming it excludes nothing. Here `user_id` carries a real foreign key too, so
   * 23503 has two possible sources and the repository cannot tell them apart.
   *
   * `subjectId` is named anyway: it is the one a caller controls and the one the
   * trigger refuses. Naming `userId` would be a worse guess and naming neither
   * would lose the only useful half.
   */
  it('maps 23503 to UnknownReferenceError naming subjectId, and never the id itself', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    expect((error as UnknownReferenceError).field).toBe('subjectId');
    expect((error as Error).message).not.toContain(POLICY_ID);
  });

  it('lets an unrecognised database error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { repo, client } = build({ createThrows: boom });

    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('AttestationRepository.list', () => {
  it('filters retired rows and adds no scope filter of its own', async () => {
    let args: Record<string, unknown> = {};
    const client = {
      attestation: {
        findMany: async (a: Record<string, unknown>) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedAttestationClient;

    await new AttestationRepository().list(client);

    // ⛔ No org_entity_id predicate, deliberately. Scope is the database's job
    // (ADR-0004); a filter here would be a second, weaker copy able to disagree.
    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
