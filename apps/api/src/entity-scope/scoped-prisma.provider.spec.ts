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
 *   ⭐ W12 adds a SECOND double. The original one stubs $extends out, so the
 *   handler inside it never runs — which left the audit wiring untested and,
 *   more to the point, left "does the model name actually reach the recorder"
 *   unasked. The capturing double invokes the handler instead.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Cover the audit enlistment and its fail-closed refusal (W12)
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
    const audit = jest.fn(() => 'AUDIT ROW');

    await expect(runScoped(rec.carrier, [], operation, audit)).rejects.toThrow(EntityScopeError);

    // The point of the test: nothing reached the database, not even to be
    // refused there. The database refuses too (migration 20260809171812), and
    // the two layers must hold independently.
    expect(operation).not.toHaveBeenCalled();
    // ⚠️ W12: the audit row must not be built either. It would never execute —
    // there is no transaction to enlist it in — but building it calls into the
    // recorder, which is entitled to throw, and an unscoped request should be
    // refused for being unscoped rather than for anything the audit layer says.
    expect(audit).not.toHaveBeenCalled();
    expect(rec.batches).toHaveLength(0);
  });

  // === W12: the audit row rides in the same transaction ====================

  it('enlists the audit row LAST, after the write, in one transaction', async () => {
    const rec = recordingCarrier();

    const result = await runScoped(
      rec.carrier,
      [SG1],
      () => 'THE QUERY',
      () => 'AUDIT ROW',
    );

    // Order is the mechanism again: set_config must still come first, and the
    // audit row goes after the write so strategy A's per-entity advisory lock is
    // held for as short a time as possible.
    expect(rec.batches[0]).toEqual([SET_SCOPE, 'THE QUERY', 'AUDIT ROW']);
    // Still the SECOND element — the write's result, not the audit row's.
    expect(result).toBe('QUERY RESULT');
  });

  it('sends two steps, not three, when the operation is not audited', async () => {
    const rec = recordingCarrier();

    await runScoped(
      rec.carrier,
      [SG1],
      () => 'THE QUERY',
      () => null,
    );

    expect(rec.batches[0]).toEqual([SET_SCOPE, 'THE QUERY']);
  });

  it('defaults to no audit step, so the wrapper works without a hook', async () => {
    const rec = recordingCarrier();

    await runScoped(rec.carrier, [SG1], () => 'THE QUERY');

    expect(rec.batches[0]).toEqual([SET_SCOPE, 'THE QUERY']);
  });

  it('⛔ lets an audit refusal stop the write entirely', async () => {
    // The fail-closed property, asserted where it is cheap to assert: a write
    // that cannot be audited does not happen. Checking only that it rejects
    // would pass against a version that ran the transaction and threw after.
    const rec = recordingCarrier();
    const operation = jest.fn(() => 'THE QUERY');

    await expect(
      runScoped(rec.carrier, [SG1], operation, () => {
        throw new Error('cannot attribute this write to an entity');
      }),
    ).rejects.toThrow('cannot attribute this write');

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

  // === W12: what the extension hands the audit hook ========================
  //
  // The double above stubs $extends out entirely, so the handler inside it never
  // runs. This one CAPTURES the handler and invokes it, which is the only way to
  // assert the part that silently breaks: that Prisma's model and operation
  // names reach the recorder, and that the scope travels with them.

  type OpHandler = (params: {
    model: string | undefined;
    operation: string;
    args: unknown;
    query: (args: unknown) => unknown;
  }) => Promise<unknown>;

  interface Captured {
    connection: unknown;
    batches: unknown[][];
    handler?: OpHandler;
  }

  function capturingConnection(): Captured {
    const captured: Captured = { connection: undefined, batches: [] };
    captured.connection = {
      $executeRaw: () => SET_SCOPE,
      $transaction: (operations: unknown[]) => {
        captured.batches.push(operations);
        return Promise.resolve(operations.map((_, i) => (i === 1 ? 'QUERY RESULT' : 1)));
      },
      $extends: (spec: { query: { $allOperations: OpHandler } }) => {
        captured.handler = spec.query.$allOperations;
        return { marker: 'scoped' };
      },
    };
    return captured;
  }

  const SCOPE = { entityIds: [SG1], rootCodes: ['SG1'], rollUp: false } as unknown as EntityScope;

  it('passes the model, operation and scope through to the hook', async () => {
    const cap = capturingConnection();
    const intercept = jest.fn(() => 'AUDIT ROW');
    const factory = new ScopedPrismaFactory(
      { connection: cap.connection } as unknown as PrismaService,
      {
        intercept,
      },
    );

    factory.forScope(SCOPE);
    await cap.handler?.({
      model: 'StatementOfApplicability',
      operation: 'create',
      args: { data: { clauseRef: 'A.5.9' } },
      query: () => 'THE QUERY',
    });

    expect(intercept).toHaveBeenCalledTimes(1);
    const [writer, write, context] = intercept.mock.calls[0] as unknown as [
      unknown,
      { model: string; operation: string; args: unknown },
      { entityIds: string[] },
    ];
    // The UNEXTENDED connection, so the audit insert does not re-enter this hook.
    expect(writer).toBe(cap.connection);
    expect(write).toEqual({
      model: 'StatementOfApplicability',
      operation: 'create',
      args: { data: { clauseRef: 'A.5.9' } },
    });
    expect(context).toEqual({ entityIds: [SG1] });
    expect(cap.batches[0]).toEqual([SET_SCOPE, 'THE QUERY', 'AUDIT ROW']);
  });

  it('works with no hook at all, which is what every other module does today', async () => {
    const cap = capturingConnection();
    const factory = new ScopedPrismaFactory({
      connection: cap.connection,
    } as unknown as PrismaService);

    factory.forScope(SCOPE);
    await cap.handler?.({
      model: 'Policy',
      operation: 'create',
      args: {},
      query: () => 'THE QUERY',
    });

    expect(cap.batches[0]).toEqual([SET_SCOPE, 'THE QUERY']);
  });
});
