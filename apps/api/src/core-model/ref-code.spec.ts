/**
 * File: apps/api/src/core-model/ref-code.spec.ts
 * Purpose: Pin the format, and the ordering that makes an out-of-scope issue fail early.
 * Category: core-model
 * Scope: Phase W04
 *
 * Description:
 *   The concurrency property cannot be tested here — it needs a real database
 *   and real contention, and it lives in policy.int.spec.ts. What CAN be tested
 *   without one is the shape of the code and the order of the two calls, and the
 *   second is load-bearing: the counter write is what RLS refuses, so it has to
 *   happen before the entity lookup. If the lookup came first, an out-of-scope
 *   request would read a name it is not entitled to before being refused.
 *
 * Created: 2026-08-10 (Phase W04)
 * Last Modified: 2026-08-10
 */
import type { OrgEntity, RefCodeCounter } from '../generated/prisma';
import { UnknownOrgEntityError, formatRefCode, issueRefCode } from './ref-code';
import type { ScopedRefCodeClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

interface Double {
  client: ScopedRefCodeClient;
  calls: string[];
}

function doubleClient(opts: { lastSeq?: number; entity?: OrgEntity | null } = {}): Double {
  const calls: string[] = [];
  const client: ScopedRefCodeClient = {
    refCodeCounter: {
      upsert: async () => {
        calls.push('counter');
        return {
          orgEntityId: SG1,
          entityType: 'policy',
          lastSeq: opts.lastSeq ?? 1,
        } as RefCodeCounter;
      },
    },
    orgEntity: {
      findUnique: async () => {
        calls.push('entity');
        return opts.entity === undefined ? ({ id: SG1, code: 'SG1' } as OrgEntity) : opts.entity;
      },
    },
  };
  return { client, calls };
}

describe('formatRefCode', () => {
  it('pads the sequence to six digits, per 02a:89', () => {
    expect(formatRefCode('POL', 'SG1', 1)).toBe('POL-SG1-000001');
    expect(formatRefCode('RSK', 'HK1', 123)).toBe('RSK-HK1-000123');
  });

  it('widens rather than truncates past six digits', () => {
    // A wrapped reference code would silently collide with an existing record.
    // Ugly beats wrong.
    expect(formatRefCode('POL', 'SG1', 1234567)).toBe('POL-SG1-1234567');
  });
});

describe('issueRefCode', () => {
  it('allocates from the counter and renders with the entity code', async () => {
    const { client } = doubleClient({ lastSeq: 42 });

    const code = await issueRefCode(client, {
      orgEntityId: SG1,
      entityType: 'policy',
      prefix: 'POL',
    });

    expect(code).toBe('POL-SG1-000042');
  });

  it('writes the counter BEFORE reading the entity', async () => {
    const { client, calls } = doubleClient();

    await issueRefCode(client, { orgEntityId: SG1, entityType: 'policy', prefix: 'POL' });

    // Not cosmetic: the counter is the entity-scoped table, so it is where RLS
    // refuses an out-of-scope request. Reversed, the refusal would arrive only
    // after the caller had already been handed another entity's name.
    expect(calls).toEqual(['counter', 'entity']);
  });

  it('refuses to invent a code when the entity is not visible', async () => {
    const { client } = doubleClient({ entity: null });

    await expect(
      issueRefCode(client, { orgEntityId: SG1, entityType: 'policy', prefix: 'POL' }),
    ).rejects.toBeInstanceOf(UnknownOrgEntityError);
  });

  it('carries only the id the caller supplied in the error', async () => {
    const { client } = doubleClient({ entity: null });

    const error = (await issueRefCode(client, {
      orgEntityId: SG1,
      entityType: 'policy',
      prefix: 'POL',
    }).catch((e: unknown) => e)) as UnknownOrgEntityError;

    // Same rule as ScopeRefusedError: the message may name what the caller sent
    // and nothing it did not already know (約束 8).
    expect(error.orgEntityId).toBe(SG1);
    expect(error.message).not.toMatch(/SG OpCo|Singapore/);
  });
});
