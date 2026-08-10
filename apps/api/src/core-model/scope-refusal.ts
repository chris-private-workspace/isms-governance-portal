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
 * Key Components:
 *   - ScopeRefusedError: domain error; carries only what the caller supplied
 *   - isScopeRefusal(): structural search for SQLSTATE 42501 in a driver error
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W03) — drive-through found 500 on refusal
 *
 * Related:
 *   - apps/api/src/core-model/policy.repository.ts — the only thrower today
 */

/** postgres `insufficient_privilege` — what a failed RLS WITH CHECK raises. */
const RLS_REFUSAL_SQLSTATE = '42501';

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
