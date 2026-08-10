/**
 * File: apps/api/src/core-model/extension-validator.ts
 * Purpose: Application-layer half of governed-extension validation (ADR-0005).
 * Category: core-model
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0005-governed-extension-storage.md
 *
 * Description:
 *   The database trigger `validate_extensions()` is the authority: it refuses
 *   undeclared keys, wrong types and missing required fields regardless of what
 *   the application did. This function checks the same three rules earlier, for
 *   two reasons the trigger cannot serve:
 *
 *     1. it fails before a round trip, so an invalid write costs nothing
 *     2. it produces a structured error naming the key and the expectation,
 *        where the trigger can only raise a formatted string
 *
 *   ⚠️ Two implementations of one rule is how AP-6 (mock/real divergence)
 *   starts. Two things keep it honest:
 *
 *     - both read the SAME catalog rows. Neither hard-codes a field list, so
 *       they cannot disagree about *what is declared* — only about how they
 *       interpret it.
 *     - the integration suite includes a meta-verification: neutralise this
 *       function and the database must still refuse. A second layer that cannot
 *       be shown to hold on its own is indistinguishable from a comment
 *       (ADR-0004 rejected option C on exactly that ground).
 *
 *   The type names match `jsonb_typeof` output on purpose — 'string' / 'number'
 *   / 'boolean' — so the two layers compare the same vocabulary rather than one
 *   mapping into the other's.
 *
 * Key Components:
 *   - ExtensionValidationError: carries the key, so callers can render a field error
 *   - validateExtensions(): pure; catalog in, throw or return
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W03)
 *
 * Related:
 *   - apps/api/prisma/migrations/20260810134319_governed_extensions/migration.sql
 */
import type { ExtensionField } from '../generated/prisma';

/** Distinguishable from a scope error: this one is the caller's data, not their rights. */
export class ExtensionValidationError extends Error {
  constructor(
    message: string,
    /** The offending key, or undefined when the failure is a missing required field. */
    readonly key?: string,
  ) {
    super(message);
    this.name = 'ExtensionValidationError';
  }
}

/** What `jsonb_typeof` would say about a JS value, or null when it has no JSON type. */
function jsonTypeOf(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return typeof value;
  }
  return null;
}

/**
 * @param extensions the candidate extension object (an empty object is valid
 *        unless a required field is declared)
 * @param catalog the rows visible for this entity — global (org_entity_id null)
 *        plus the entity's own. Filtering is the caller's job because it is the
 *        caller that holds the scoped client.
 */
export function validateExtensions(
  extensions: Readonly<Record<string, unknown>>,
  catalog: readonly ExtensionField[],
): void {
  const live = catalog.filter((f) => f.retiredAt === null);

  for (const [key, value] of Object.entries(extensions)) {
    const declared = live.find((f) => f.key === key);

    if (!declared) {
      throw new ExtensionValidationError(`extension key "${key}" is not declared`, key);
    }

    const actual = jsonTypeOf(value);
    if (actual !== declared.dataType) {
      throw new ExtensionValidationError(
        `extension key "${key}" expects ${declared.dataType} but got ${actual ?? typeof value}`,
        key,
      );
    }
  }

  const missing = live
    .filter((f) => f.required && !Object.prototype.hasOwnProperty.call(extensions, f.key))
    .map((f) => f.key)
    .sort();

  if (missing.length > 0) {
    throw new ExtensionValidationError(
      `required extension field(s) missing: ${missing.join(', ')}`,
    );
  }
}
