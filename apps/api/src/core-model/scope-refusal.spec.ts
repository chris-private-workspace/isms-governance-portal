/**
 * File: apps/api/src/core-model/scope-refusal.spec.ts
 * Purpose: Pin the detector to the error shape the real driver actually produced.
 * Category: Test (unit)
 * Scope: Phase W03
 *
 * Description:
 *   A detector written against an imagined error shape is a detector that always
 *   returns false — and the code path it guards then looks tested while being
 *   dead. So the fixture below is transcribed from the ACTUAL Prisma 7.9.1 /
 *   @prisma/adapter-pg error captured from the running API on 2026-08-10, not
 *   from the documented shape.
 *
 *   policy.int.spec.ts holds the other half: that a real refused INSERT still
 *   matches. This file holds the parts real PostgreSQL cannot exercise — the
 *   errors that must NOT match.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 */
import { ScopeRefusedError, isScopeRefusal } from './scope-refusal';

/** Transcribed from the live API log; nesting depth is the part that matters. */
function realRefusal(): unknown {
  return Object.assign(new Error('Invalid `client.policy.create()` invocation'), {
    code: 'P2039',
    clientVersion: '7.9.1',
    meta: {
      modelName: 'Policy',
      driverAdapterError: Object.assign(
        new Error('new row violates row-level security policy for table "policies"'),
        {
          cause: {
            originalCode: '42501',
            originalMessage: 'new row violates row-level security policy for table "policies"',
            kind: 'postgres',
            code: '42501',
            severity: 'ERROR',
          },
        },
      ),
    },
  });
}

describe('isScopeRefusal', () => {
  it('recognises the shape the driver actually threw', () => {
    expect(isScopeRefusal(realRefusal())).toBe(true);
  });

  it('finds the code however shallowly it is nested', () => {
    expect(isScopeRefusal({ code: '42501' })).toBe(true);
    expect(isScopeRefusal({ cause: { originalCode: '42501' } })).toBe(true);
  });

  // ---- what must NOT be swallowed ----

  it('does not match another database error', () => {
    // 23505 is a unique violation: the caller's data, but not a scope decision.
    expect(isScopeRefusal({ meta: { driverAdapterError: { cause: { code: '23505' } } } })).toBe(
      false,
    );
  });

  it('does not match an outage', () => {
    expect(isScopeRefusal(new Error('connection lost'))).toBe(false);
    expect(isScopeRefusal(undefined)).toBe(false);
    expect(isScopeRefusal(null)).toBe(false);
    expect(isScopeRefusal('42501')).toBe(false);
  });

  it('does not search past a sane depth, so a deep object cannot stall it', () => {
    let deep: Record<string, unknown> = { code: '42501' };
    for (let i = 0; i < 20; i++) {
      deep = { cause: deep };
    }

    expect(isScopeRefusal(deep)).toBe(false);
  });

  it('terminates on a cyclic error chain', () => {
    const cyclic: Record<string, unknown> = { code: 'P2039' };
    cyclic.cause = cyclic;

    expect(isScopeRefusal(cyclic)).toBe(false);
  });
});

describe('ScopeRefusedError', () => {
  it('says only that the entity was not found — never that it exists elsewhere', () => {
    const error = new ScopeRefusedError('00000000-0000-0000-0000-0000000000c1');

    expect(error.message).toBe('org entity 00000000-0000-0000-0000-0000000000c1 not found');
    // Nothing in the text may hint at a scope boundary; "forbidden", "scope" or
    // "permission" would each tell the caller the id was real.
    expect(error.message).not.toMatch(/scope|denied|forbidden|permission/i);
  });
});
