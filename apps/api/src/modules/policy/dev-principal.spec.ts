/**
 * File: apps/api/src/modules/policy/dev-principal.spec.ts
 * Purpose: Prove the stub cannot exist in production and always announces itself.
 * Category: Test (unit)
 * Scope: Phase W03
 *
 * Description:
 *   A mock's honesty guarantees are worth exactly as much as the tests that
 *   hold them. CH-012 measured the alternative: a mock marker that was added,
 *   tested and passing — while not firing for one whole class of case. The
 *   passing test certified the gap.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 */
import { Logger } from '@nestjs/common';
import {
  DEV_PRINCIPAL_MARKER,
  DevPrincipalInProductionError,
  assertDevPrincipalAllowed,
  devPrincipal,
  warnDevPrincipalActive,
} from './dev-principal';

describe('dev principal', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  // ---- the guarantee that matters ----

  it('refuses to produce an assignment in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => devPrincipal()).toThrow(DevPrincipalInProductionError);
    expect(() => assertDevPrincipalAllowed()).toThrow(DevPrincipalInProductionError);
    expect(() => warnDevPrincipalActive()).toThrow(DevPrincipalInProductionError);
  });

  it('names the rule it exists to work around, so the error is actionable', () => {
    process.env.NODE_ENV = 'production';

    expect(() => devPrincipal()).toThrow(/credential/);
    expect(() => devPrincipal()).toThrow(/M4/);
  });

  // ---- the marker ----

  it('carries a marker that cannot be read as a real credential', () => {
    expect(DEV_PRINCIPAL_MARKER._devPrincipal).toBe(true);
    expect(DEV_PRINCIPAL_MARKER._warning).toMatch(/NOT from a credential/);
  });

  // ---- the assignment ----

  it('defaults to a single entity and no roll-up', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
    delete process.env.DEV_PRINCIPAL_ROLLUP;

    expect(devPrincipal()).toEqual({
      subjectId: 'dev-principal',
      assignedEntityCodes: ['SG1'],
      rollUp: false,
    });
  });

  it('can be pointed at other entities without editing source', () => {
    process.env.NODE_ENV = 'test';
    process.env.DEV_PRINCIPAL_ENTITIES = 'HK1, APAC';
    process.env.DEV_PRINCIPAL_ROLLUP = 'true';

    expect(devPrincipal()).toEqual({
      subjectId: 'dev-principal',
      assignedEntityCodes: ['HK1', 'APAC'],
      rollUp: true,
    });
  });

  it('treats any value other than the exact string "true" as no roll-up', () => {
    process.env.NODE_ENV = 'test';
    process.env.DEV_PRINCIPAL_ROLLUP = 'yes';

    expect(devPrincipal().rollUp).toBe(false);
  });

  it('warns at boot rather than starting silently', () => {
    process.env.NODE_ENV = 'test';
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    warnDevPrincipalActive();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DEV PRINCIPAL ACTIVE'));
    warn.mockRestore();
  });
});
