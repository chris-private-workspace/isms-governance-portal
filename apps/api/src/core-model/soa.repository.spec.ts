/**
 * File: apps/api/src/core-model/soa.repository.spec.ts
 * Purpose: What the insert sends, and which SQLSTATE maps to which error — including
 *   the first 23505 this layer is allowed to surface.
 * Category: Test (unit)
 * Scope: Phase W11
 *
 * Description:
 *   soa.int.spec.ts proves the database half. What only a unit test can show is
 *   what this layer CHOOSES to send and how it translates what comes back:
 *
 *     - validation happens BEFORE a reference code is allocated
 *     - 42501, 23505 and 23503 map to three different errors
 *     - 23505 becomes DuplicateKeyError HERE and would not be safe on a key
 *       without org_entity_id in it (scope-refusal.ts:183)
 *
 * Created: 2026-08-14 (Phase W11)
 * Last Modified: 2026-08-14
 */
import { ExtensionValidationError } from './extension-validator';
import { DuplicateKeyError, ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedSoaClient } from './scoped-client.types';
import { SoaRepository } from './soa.repository';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const OWNER = '00000000-0000-0000-0000-0000000000d0';

const INPUT = {
  orgEntityId: SG1,
  framework: 'ISO 27001',
  clauseRef: 'A.5.9',
  applicable: true,
  implementationStatus: 'implemented',
} as Parameters<SoaRepository['create']>[1];

function build(options: { catalog?: unknown[]; createThrows?: unknown } = {}) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};
  let listArgs: unknown = undefined;

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
    statementOfApplicability: {
      findMany: async (args: unknown) => {
        listArgs = args;
        return [];
      },
      create: async (args: { data: Record<string, unknown> }) => {
        calls.push('insert');
        inserted = args.data;
        if (options.createThrows) {
          throw options.createThrows;
        }
        return { id: 'created', ...args.data };
      },
    },
  } as unknown as ScopedSoaClient;

  return {
    repo: new SoaRepository(),
    client,
    calls,
    insert: () => inserted,
    listArgs: () => listArgs,
  };
}

describe('SoaRepository.create', () => {
  it('issues the ref_code itself, with the SOA prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().refCode).toBe('SOA-SG1-000007');
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

  it('absent justification, approvedBy, approvedAt and ownerUserId become NULL, never undefined', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert().justification).toBeNull();
    expect(insert().approvedBy).toBeNull();
    expect(insert().approvedAt).toBeNull();
    expect(insert().ownerUserId).toBeNull();
  });

  it('never names version or createdBy in the insert — the column default and M4 own those', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert()).not.toHaveProperty('version');
    expect(insert()).not.toHaveProperty('createdBy');
  });

  it('maps 42501 to ScopeRefusedError — the row itself was out of scope', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScopeRefusedError);
    // The anchor beside the negative: it is not the duplicate error either, and
    // an assertion that only said "not DuplicateKeyError" would pass on any
    // rejection at all (AD-TestNameWiderThanProof-1).
    expect(error).not.toBeInstanceOf(DuplicateKeyError);
  });

  it('maps 23505 to DuplicateKeyError naming the clause, not the row it collided with', async () => {
    const { repo, client } = build({ createThrows: { code: '23505' } });

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DuplicateKeyError);
    expect((error as DuplicateKeyError).field).toBe('framework + clauseRef');
    // ⚠️ This translation is only safe because org_entity_id is IN the key. On a
    // caller-supplied tuple spanning entities, surfacing 23505 is the oracle W10
    // measured (scope-refusal.ts:183). The int suite measures that it is shut;
    // this only pins what the caller is told when it is not.
    expect((error as DuplicateKeyError).message).not.toContain(SG1);
  });

  it('maps 23503 to UnknownReferenceError naming the owner, never the id', async () => {
    const { repo, client } = build({ createThrows: { code: '23503' } });

    const error = await repo
      .create(client, { ...INPUT, ownerUserId: OWNER } as Parameters<SoaRepository['create']>[1])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // owner_user_id is the only foreign key on this table that a caller supplies.
    // org_entity_id is the other, and RLS refuses it as 42501 before the key runs.
    expect((error as UnknownReferenceError).field).toBe('owner');
    expect((error as UnknownReferenceError).message).not.toContain(OWNER);
  });
});

describe('SoaRepository.list', () => {
  it('excludes retired rows and orders by framework then clause', async () => {
    const { repo, client, listArgs } = build();

    await repo.list(client);

    expect(listArgs()).toEqual({
      where: { retiredAt: null },
      orderBy: [{ framework: 'asc' }, { clauseRef: 'asc' }],
    });
  });

  it('does not widen to group-shared rows — no applies_to_scope clause exists here', async () => {
    const { repo, client, listArgs } = build();

    await repo.list(client);

    // ControlRepository.list() adds an OR for group rows. An SoA row is one
    // entity's decision about one clause, so the only thing standing between a
    // caller and another entity's decisions is the read policy.
    expect(JSON.stringify(listArgs())).not.toContain('OR');
    expect(JSON.stringify(listArgs())).not.toContain('appliesToScope');
  });
});
