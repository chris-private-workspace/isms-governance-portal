/**
 * File: apps/api/src/core-model/extension-validator.spec.ts
 * Purpose: The three refusals, plus the cases that must NOT be refused.
 * Category: core-model
 * Scope: Phase W03
 *
 * Description:
 *   Negative tests carry the weight here. A validator that accepts everything
 *   passes every positive test, so each rule is proven by something it rejects.
 *   The database trigger enforces the same three rules independently; that layer
 *   is proven in policy.int.spec.ts by neutralising this file.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 */
import type { ExtensionField } from '../generated/prisma';
import { ExtensionValidationError, validateExtensions } from './extension-validator';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

function field(over: Partial<ExtensionField>): ExtensionField {
  return {
    id: 'f-1',
    orgEntityId: null,
    entityType: 'policy',
    key: 'reviewCycle',
    dataType: 'string',
    required: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    retiredAt: null,
    ...over,
  } as ExtensionField;
}

describe('validateExtensions', () => {
  it('accepts an empty object when nothing is required', () => {
    expect(() => validateExtensions({}, [field({})])).not.toThrow();
  });

  it('accepts a declared global key of the declared type', () => {
    expect(() => validateExtensions({ reviewCycle: 'annual' }, [field({})])).not.toThrow();
  });

  it('accepts a key declared by the entity itself', () => {
    const catalog = [field({ key: 'sgRegRef', orgEntityId: SG1 })];
    expect(() => validateExtensions({ sgRegRef: 'MAS-1' }, catalog)).not.toThrow();
  });

  // ---- refusals ----

  it('refuses an undeclared key, and names it', () => {
    expect(() => validateExtensions({ whateverIWant: 'x' }, [field({})])).toThrow(
      ExtensionValidationError,
    );

    try {
      validateExtensions({ whateverIWant: 'x' }, [field({})]);
      throw new Error('should not reach here');
    } catch (e) {
      expect(e).toBeInstanceOf(ExtensionValidationError);
      expect((e as ExtensionValidationError).key).toBe('whateverIWant');
    }
  });

  it('refuses a declared key carrying the wrong type', () => {
    const catalog = [field({ key: 'cycleCount', dataType: 'number' })];
    expect(() => validateExtensions({ cycleCount: 'three' }, catalog)).toThrow(
      /expects number but got string/,
    );
  });

  it('refuses a value with no JSON scalar type at all', () => {
    const catalog = [field({ key: 'reviewCycle', dataType: 'string' })];
    expect(() => validateExtensions({ reviewCycle: { nested: true } }, catalog)).toThrow(
      ExtensionValidationError,
    );
  });

  it('refuses when a required field is absent', () => {
    const catalog = [field({ key: 'owner', required: true })];
    expect(() => validateExtensions({}, catalog)).toThrow(
      /required extension field\(s\) missing: owner/,
    );
  });

  it('lists every missing required field, sorted, rather than only the first', () => {
    const catalog = [
      field({ id: 'f-2', key: 'zeta', required: true }),
      field({ id: 'f-3', key: 'alpha', required: true }),
    ];
    expect(() => validateExtensions({}, catalog)).toThrow(/missing: alpha, zeta/);
  });

  // ---- retirement ----
  //
  // A retired declaration must stop authorising new writes; otherwise retiring a
  // field is cosmetic. The trigger applies the same `retired_at IS NULL` filter,
  // so both layers agree on what "declared" means.

  it('does not treat a retired declaration as authorisation', () => {
    const catalog = [field({ retiredAt: new Date() })];
    expect(() => validateExtensions({ reviewCycle: 'annual' }, catalog)).toThrow(/not declared/);
  });

  it('does not demand a retired required field', () => {
    const catalog = [field({ key: 'owner', required: true, retiredAt: new Date() })];
    expect(() => validateExtensions({}, catalog)).not.toThrow();
  });
});
