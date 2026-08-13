/**
 * File: apps/api/src/core-model/scope-refusal.ts
 * Purpose: Recognise the database refusing a write for being out of scope, so an
 *   authorisation decision does not surface as a server fault.
 * Category: core-model
 * Scope: Phase W03 (governed extensions)
 * Owner: CLAUDE.md 約束 8 · docs/rules-on-demand/multi-tenant-data.md
 *
 * Description:
 *   RLS refuses an out-of-scope INSERT with postgres 42501, which reaches the
 *   application as a Prisma error carrying that code several levels down. Left
 *   untranslated it becomes HTTP 500 — a refusal recorded as an outage, which
 *   loses the one signal an operator actually wants (someone attempted a
 *   cross-entity write) inside the noise of "the platform is broken".
 *
 *   ⚠️ The measurement that makes the 404 translation SAFE (W03 Day 3, against
 *   the running API): a POST naming an org entity that does not exist and a POST
 *   naming a real one belonging to another entity both produce 42501, and the
 *   foreign-key violation (23503) never fires at all — 4 × 42501, 0 × 23503.
 *   Postgres evaluates the RLS WITH CHECK before the constraint, so it has
 *   already collapsed "absent" and "not yours" into one error before this code
 *   sees anything. The two cannot be told apart here even deliberately, which is
 *   a stronger guarantee than a controller remembering to answer identically.
 *
 *   The alternative — map 42501 to 404 and leave the nonexistent case as 500 —
 *   would have introduced the very oracle 約束 8 forbids. It is only wrong under
 *   an assumption about evaluation order that turned out to be false; the
 *   integration suite now pins the ordering so a Postgres upgrade that reverses
 *   it fails loudly instead of quietly re-opening the distinction.
 *
 *   The code is matched structurally rather than by message text: the message is
 *   locale-dependent and version-dependent, the SQLSTATE is neither.
 *
 *   ⚠️ W05 FOUND THE SECOND REFUSAL POINT, and it is a different SQLSTATE. The
 *   measurement above is about the row's OWN org_entity_id. A risk also names an
 *   asset, and when a principal writes a risk for its own entity that references
 *   another entity's asset, the RLS WITH CHECK passes — the row is in scope —
 *   and the refusal comes from the composite foreign key as 23503 instead.
 *   Measured W05 Day 2: `risks_asset_id_org_entity_id_fkey`, and an asset id
 *   that does not exist at all produces the byte-identical error. So the same
 *   404 translation is safe here for the same reason, but it needs its own
 *   detector — a single code check would have let this one through as 500.
 *
 *   ⚠️ W09 ADDED A THIRD CODE, and it is not a scope refusal at all. 23514 is a
 *   CHECK violation, raised by `assessment_instances_sod` when a reviewer and an
 *   assignee are the same person. It lives here because the classification
 *   machinery is here, not because segregation of duties is a scoping concern —
 *   and the distinction matters for the HTTP mapping: 42501 and 23503 both become
 *   404 because answering anything else would confirm an id, while 23514 becomes
 *   422. The caller already knows both user ids; refusing to say why would hide
 *   a rule from the person who has to satisfy it, and reveal nothing in return.
 *
 * Key Components:
 *   - ScopeRefusedError: domain error; carries only what the caller supplied
 *   - isScopeRefusal(): structural search for SQLSTATE 42501 in a driver error
 *   - UnknownReferenceError / isUnknownReference(): the same, for 23503
 *   - isCheckViolation(): the same, for 23514 — a stated rule, not a hidden one
 *   - DuplicateKeyError / isUniqueViolation(): 23505 — safe only for scoped keys
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Add the 23505 predicate (W10) — a unique index ignores RLS
 *   - 2026-08-13: Add the 23514 predicate (W09) — a CHECK is a rule, not a refusal
 *   - 2026-08-11: Add the 23503 half (W05) — a composite FK moved the refusal point
 *   - 2026-08-10: Initial creation (Phase W03) — drive-through found 500 on refusal
 *
 * Related:
 *   - apps/api/src/core-model/policy.repository.ts · risk.repository.ts
 */

/** postgres `insufficient_privilege` — what a failed RLS WITH CHECK raises. */
const RLS_REFUSAL_SQLSTATE = '42501';

/** postgres `foreign_key_violation` — what the composite FK raises (W05). */
const FK_VIOLATION_SQLSTATE = '23503';

/** Nested keys a driver error hides its cause behind. Extend only when measured. */
const CAUSE_KEYS = ['cause', 'meta', 'driverAdapterError'] as const;

/** Keys that hold a SQLSTATE at some level of the chain. */
const CODE_KEYS = ['code', 'originalCode'] as const;

/**
 * Raised when the database refused a write because the row's entity is outside
 * the client's scope.
 *
 * ⚠️ It carries `orgEntityId` — which is the value the CALLER supplied, so
 * echoing it discloses nothing they did not already send. It must never be
 * extended with anything read from the database about that entity: whether it
 * exists is exactly the fact 約束 8 refuses to reveal.
 */
export class ScopeRefusedError extends Error {
  constructor(readonly orgEntityId: string) {
    super(`org entity ${orgEntityId} not found`);
    this.name = 'ScopeRefusedError';
  }
}

function collectCodes(value: unknown, depth: number): string[] {
  if (depth > 6 || value === null || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const codes: string[] = [];

  for (const key of CODE_KEYS) {
    if (typeof record[key] === 'string') {
      codes.push(record[key]);
    }
  }
  for (const key of CAUSE_KEYS) {
    codes.push(...collectCodes(record[key], depth + 1));
  }

  return codes;
}

/** True when anywhere in the error chain the database reported SQLSTATE 42501. */
export function isScopeRefusal(error: unknown): boolean {
  return collectCodes(error, 0).includes(RLS_REFUSAL_SQLSTATE);
}

/**
 * Raised when a write named a record it cannot reach — either because no such
 * record exists, or because it belongs to another entity.
 *
 * ⚠️ The two are NOT distinguished, and cannot be: the composite foreign key
 * produces the identical error for both (measured, W05 Day 2). It carries only
 * the field NAME, never the id — echoing the id back would be harmless, but
 * echoing anything the database said about it would not, and keeping the class
 * unable to hold that is cheaper than remembering not to add it.
 */
export class UnknownReferenceError extends Error {
  constructor(readonly field: string) {
    super(`${field} not found`);
    this.name = 'UnknownReferenceError';
  }
}

/** True when anywhere in the error chain the database reported SQLSTATE 23503. */
export function isUnknownReference(error: unknown): boolean {
  return collectCodes(error, 0).includes(FK_VIOLATION_SQLSTATE);
}

/** postgres `check_violation` — a stated rule the row broke. */
const CHECK_VIOLATION_SQLSTATE = '23514';

/**
 * True when anywhere in the error chain the database reported SQLSTATE 23514.
 *
 * ⚠️ Deliberately does NOT identify WHICH check. Today `assessment_instances` has
 * exactly one, so its caller can name the rule it broke; a second check on the
 * same table would make that inference wrong, and the fix then is to read
 * `meta.constraint` rather than to widen this. Recording it here so the next
 * person meets the assumption instead of the bug.
 */
export function isCheckViolation(error: unknown): boolean {
  return collectCodes(error, 0).includes(CHECK_VIOLATION_SQLSTATE);
}

/** postgres `unique_violation` — a caller-chosen tuple that already exists. */
const UNIQUE_VIOLATION_SQLSTATE = '23505';

/**
 * Raised when a write reused a value that must be unique.
 *
 * ⚠️ W10 ADDED A FOURTH CODE, AND IT IS THE ONE THAT IS ONLY SAFE CONDITIONALLY.
 * The three above are safe to surface because the database has already collapsed
 * "absent" and "not yours" before this code runs. A unique index has not: it does
 * not respect RLS, and it is checked BEFORE the foreign key. W10 Day 2 measured
 * what that meant for `rm_report_versions` — inserting into another entity's
 * report answered 23505 when the label collided with one of theirs and 23503 when
 * it did not, which enumerates their version history one guess at a time.
 *
 * The fix was in the schema, not here: 20260813153153_version_label_key_scoped
 * put org_entity_id into the key, so a probe carrying the caller's own entity
 * cannot collide with anyone else's rows. Re-measured: both cases now answer
 * 23503, and a genuine duplicate on the caller's OWN report still answers 23505.
 *
 * ⛔ So this predicate is safe for keys whose tuple is scoped or server-issued,
 * and NOT safe for a caller-supplied tuple that spans entities. Adding a unique
 * index means asking which kind it is; using this predicate is not the check.
 */
export class DuplicateKeyError extends Error {
  constructor(readonly field: string) {
    super(`${field} already exists`);
    this.name = 'DuplicateKeyError';
  }
}

/** True when anywhere in the error chain the database reported SQLSTATE 23505. */
export function isUniqueViolation(error: unknown): boolean {
  return collectCodes(error, 0).includes(UNIQUE_VIOLATION_SQLSTATE);
}
