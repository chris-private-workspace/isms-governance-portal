/**
 * File: apps/api/src/core-model/risk.repository.spec.ts
 * Purpose: The order of operations, and the fields the insert must never contain.
 * Category: Test (unit)
 * Scope: Phase W05
 *
 * Description:
 *   risk.int.spec.ts proves the database half. What a unit test can prove — and
 *   the integration suite cannot, because a real database would refuse before
 *   the question is asked — is what this layer chooses to SEND:
 *
 *     - no score column ever appears in the insert
 *     - both score sets map onto their own six columns, never each other's
 *     - validation happens BEFORE a reference code is allocated, so a rejected
 *       payload does not consume a number
 *
 *   The middle one is the quiet failure this file exists for: a residual set
 *   written into the inherent columns would produce a plausible score, pass
 *   every gate, and be wrong.
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-11
 */
import { RiskRepository } from './risk.repository';
import { RiskScoreValidationError } from './risk-score';
import { ScopeRefusedError, UnknownReferenceError } from './scope-refusal';
import type { ScopedRiskClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const ASSET = '00000000-0000-0000-0000-000000000a20';
const THREAT = '00000000-0000-0000-0000-000000000a30';
const VULN = '00000000-0000-0000-0000-000000000a40';

const INPUT = {
  orgEntityId: SG1,
  title: 'Credential stuffing',
  assetId: ASSET,
  threatId: THREAT,
  vulnerabilityId: VULN,
  ciaType: 'cia' as const,
};

function build() {
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
        return [];
      },
    },
    risk: {
      findMany: async () => [],
      create: async (args: { data: Record<string, unknown> }) => {
        calls.push('insert');
        inserted = args.data;
        return { id: 'created', ...args.data };
      },
    },
  } as unknown as ScopedRiskClient;

  return { repo: new RiskRepository(), client, calls, insert: () => inserted };
}

describe('RiskRepository.create', () => {
  it('never names a derived column in the insert', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      before: { lkh: 4, fin: 2, bop: 5, lry: 1, rep: 3, sis: 1 },
    });

    for (const derived of ['scoreBefore', 'scoreAfter', 'acceptanceStatus', 'inItRiskRegister']) {
      expect(insert()).not.toHaveProperty(derived);
    }
  });

  it('maps each score set onto its own six columns', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      before: { lkh: 1, fin: 2, bop: 3, lry: 4, rep: 5, sis: 1 },
      after: { lkh: 5, fin: 4, bop: 3, lry: 2, rep: 1, sis: 5 },
    });

    expect(insert()).toMatchObject({
      lkhBefore: 1,
      finBefore: 2,
      bopBefore: 3,
      lryBefore: 4,
      repBefore: 5,
      sisBefore: 1,
      lkhAfter: 5,
      finAfter: 4,
      bopAfter: 3,
      lryAfter: 2,
      repAfter: 1,
      sisAfter: 5,
    });
  });

  it('writes NULL, not undefined, for an absent set', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    // Explicit NULL matters: `undefined` would let Prisma omit the column, which
    // is identical here but stops being identical the moment a default appears.
    expect(insert()).toMatchObject({ lkhBefore: null, sisAfter: null });
  });

  it('validates before allocating a reference code', async () => {
    const { repo, client, calls } = build();

    await expect(
      repo.create(client, { ...INPUT, before: { lkh: 4, fin: 2 } }),
    ).rejects.toBeInstanceOf(RiskScoreValidationError);

    // A rejected payload must not consume a number — 02a:104 makes a ref_code
    // stable once issued, so a wasted one is wasted permanently.
    expect(calls).not.toContain('issueRefCode');
    expect(calls).not.toContain('insert');
  });

  it('issues the code before inserting, and reads the catalog before either', async () => {
    const { repo, client, calls } = build();

    await repo.create(client, INPUT);

    expect(calls).toEqual(['catalog', 'issueRefCode', 'insert']);
  });

  it('stamps the ref_code itself — the caller has no parameter for it', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert()).toMatchObject({ refCode: 'RISK-SG1-000007' });
  });
});

// === The two refusals, translated ===========================================
// risk.int.spec.ts proves the DATABASE produces these SQLSTATEs. What is proven
// here is that this layer maps each to its own domain error — a different claim,
// and the one that decides what the caller sees.

/** The driver's nesting; only the SQLSTATE distinguishes the two cases. */
function driverError(sqlstate: string): Error {
  return Object.assign(new Error('Invalid `client.risk.create()` invocation'), {
    code: 'P2039',
    meta: { driverAdapterError: { cause: { code: sqlstate, kind: 'postgres' } } },
  });
}

describe('RiskRepository.create refusal translation', () => {
  function throwing(sqlstate: string) {
    const { repo, client } = build();
    const failing = {
      ...(client as object),
      risk: {
        findMany: async () => [],
        create: async () => {
          throw driverError(sqlstate);
        },
      },
    } as unknown as ScopedRiskClient;
    return { repo, client: failing };
  }

  it('translates 42501 to a scope refusal naming only what the caller sent', async () => {
    const { repo, client } = throwing('42501');

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScopeRefusedError);
    expect((error as ScopeRefusedError).orgEntityId).toBe(SG1);
  });

  it('translates 23503 to an unknown reference that does not say which one', async () => {
    const { repo, client } = throwing('23503');

    const error = await repo.create(client, INPUT).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnknownReferenceError);
    // Not "asset": naming the field that failed would tell the caller their
    // threat and vulnerability ids were fine, which narrows a guess.
    expect((error as UnknownReferenceError).field).toBe('asset, threat or vulnerability');
  });

  it('rethrows anything it does not recognise, rather than filing it as a refusal', async () => {
    const { repo, client } = throwing('08006'); // connection failure

    await expect(repo.create(client, INPUT)).rejects.not.toBeInstanceOf(ScopeRefusedError);
    await expect(repo.create(client, INPUT)).rejects.not.toBeInstanceOf(UnknownReferenceError);
  });
});

describe('RiskRepository.list', () => {
  it('excludes retired rows and orders newest first — the client supplies the scope', async () => {
    const seen: unknown[] = [];
    const client = {
      risk: {
        findMany: async (args: unknown) => {
          seen.push(args);
          return [];
        },
      },
    } as unknown as ScopedRiskClient;

    await new RiskRepository().list(client);

    // No orgEntityId filter, deliberately: adding one here would look like
    // defence and would actually be a second, weaker copy of what RLS enforces.
    expect(seen[0]).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
