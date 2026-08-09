/**
 * File: apps/api/src/entity-scope/scoped-prisma.provider.spec.ts
 * Purpose: Asserts the two properties the wrapper exists for — ordering, and refusal.
 * Category: Test
 * Scope: Phase W02 (entity-scoping spike)
 *
 * Description:
 *   Ordering is the whole mechanism: if set_config were second, or outside the
 *   transaction, the policy would evaluate against whatever the connection last
 *   held. The double records what was handed to $transaction so the test can
 *   say that rather than trust it.
 *
 *   Refusal is tested by what does NOT happen — `operation` must never be
 *   called when the scope is empty. Asserting only that it throws would pass
 *   against a version that ran the query first and threw afterwards.
 *
 *   What this file cannot prove is that the database honours any of it. That is
 *   Day 3's integration test against real PostgreSQL; the values below are
 *   shapes, not evidence of isolation.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { runScoped, ScopedPrismaFactory, type ScopeCarrier } from './scoped-prisma.provider';
import { EntityScopeError, type EntityScope } from './entity-scope.resolver';
import type { PrismaService } from '../core-model/prisma.service';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

const SET_SCOPE = Symbol('set_config statement');

interface Recorder {
  carrier: ScopeCarrier;
  template: TemplateStringsArray | undefined;
  values: unknown[];
  batches: unknown[][];
}

function recordingCarrier(): Recorder {
  const rec: Recorder = {
    carrier: undefined as unknown as ScopeCarrier,
    template: undefined,
    values: [],
    batches: [],
  };
  rec.carrier = {
    $executeRaw(query: TemplateStringsArray, ...values: unknown[]) {
      rec.template = query;
      rec.values = values;
      return SET_SCOPE;
    },
    $transaction(operations: unknown[]) {
      rec.batches.push(operations);
      return Promise.resolve([1, 'QUERY RESULT']);
    },
  };
  return rec;
}

describe('runScoped', () => {
  it('sets the scope first, in the same transaction as the operation', async () => {
    const rec = recordingCarrier();
    const operation = jest.fn(() => 'THE QUERY');

    const result = await runScoped(rec.carrier, [SG1, HK1], operation);

    expect(rec.batches).toHaveLength(1);
    // set_config first, query second — the order is the mechanism.
    expect(rec.batches[0]).toEqual([SET_SCOPE, 'THE QUERY']);
    expect(result).toBe('QUERY RESULT');
  });

  it('sends the scope as a parameter and marks it transaction-local', async () => {
    const rec = recordingCarrier();

    await runScoped(rec.carrier, [SG1, HK1], () => 'q');

    const sql = rec.template?.join('?') ?? '';
    expect(sql).toContain("set_config('app.entity_scope'");
    // TRUE = the third argument to set_config: gone at COMMIT, so a pooled
    // connection cannot carry one request's scope into the next.
    expect(sql).toContain('TRUE');
    // Interpolated, not concatenated — the ids never become part of the SQL text.
    expect(rec.values).toEqual([`${SG1},${HK1}`]);
  });

  it('refuses an empty scope before the operation is ever built', async () => {
    const rec = recordingCarrier();
    const operation = jest.fn(() => 'THE QUERY');

    await expect(runScoped(rec.carrier, [], operation)).rejects.toThrow(EntityScopeError);

    // The point of the test: nothing reached the database, not even to be
    // refused there. The database refuses too (migration 20260809171812), and
    // the two layers must hold independently.
    expect(operation).not.toHaveBeenCalled();
    expect(rec.batches).toHaveLength(0);
  });
});

describe('ScopedPrismaFactory', () => {
  const factoryWith = (connection: unknown) =>
    new ScopedPrismaFactory({ connection } as unknown as PrismaService);

  it('refuses to build a client for an empty scope', () => {
    const factory = factoryWith({});
    const empty = { entityIds: [], rootCodes: ['SG1'], rollUp: false } as unknown as EntityScope;

    expect(() => factory.forScope(empty)).toThrow(EntityScopeError);
  });

  it('extends the connection it was given, once per scope', () => {
    const extended = { marker: 'scoped' };
    const $extends = jest.fn(() => extended);
    const factory = factoryWith({ $extends });
    const scope = { entityIds: [SG1], rootCodes: ['SG1'], rollUp: false } as unknown as EntityScope;

    expect(factory.forScope(scope)).toBe(extended);
    expect($extends).toHaveBeenCalledTimes(1);
  });
});
