/**
 * File: apps/api/src/workflow/transition.guard.ts
 * Purpose: Refuse illegal Policy state changes, with an error that names what was allowed.
 * Category: workflow
 * Owner: docs/02-architecture/02a-data-model-spec.md §4 (Policy lifecycle)
 * Scope: Phase W25 (M5 spike — candidate A, data-driven)
 *
 * Description:
 *   ⚠️ "GUARD" HERE IS THE STATECHART SENSE — a boolean condition on a
 *   transition — NOT NestJS's `CanActivate`. The repo has no `CanActivate`
 *   implementations at all (W25 Day 1 measured zero), so nothing collides
 *   today, but the two meanings share a filename suffix in this ecosystem and a
 *   reader arriving from Nest would expect the other one. Nothing in this file
 *   touches a request, a container, or a database.
 *
 *   The whole enforcement is one predicate over transitions.ts plus an error
 *   that carries the rejected pair AND the legal alternatives. The second half
 *   is the part that is easy to skip and expensive to add later: a caller told
 *   only "illegal transition" has to read the specification to find out what it
 *   should have sent, and an operator reading it in a log has to read the code.
 *
 *   ⭐ WHAT THIS FILE DELIBERATELY DOES NOT DO: decide who may perform a
 *   transition, or record that one happened. Those are identity (M4, not built)
 *   and audit-trail (guardrail 5) respectively, and folding either into this
 *   predicate would make it untestable without a container and would put a
 *   second copy of an entity-scope rule outside entity-scope. The transition
 *   endpoint composes the three; this file is only the first.
 *
 * Key Components:
 *   - IllegalTransitionError: carries from, to, and the allowed set
 *   - assertTransition(): throws or returns; the enforcement point
 *
 * Created: 2026-08-21 (Phase W25)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Initial creation (Phase W25) — candidate A enforcement
 *
 * Related:
 *   - apps/api/src/workflow/transitions.ts — the table this reads
 *   - apps/api/src/core-model/risk-score.ts — the same "error names the field" precedent
 */
import type { PolicyStatus } from '../generated/prisma';
import { allowedTargets, canTransition, isTerminal } from './transitions';

/**
 * The caller's requested state change was not on the lifecycle.
 *
 * Distinguishable from a scope refusal on purpose: this one says the request was
 * wrong, not that the caller may not be told. 約束 8 requires an out-of-scope
 * resource to look absent, so scope is decided BEFORE this error can be raised —
 * otherwise "illegal transition" would confirm that the id exists.
 */
export class IllegalTransitionError extends Error {
  constructor(
    readonly from: PolicyStatus,
    readonly to: PolicyStatus,
    /** Legal targets from `from`. Empty when `from` is terminal. */
    readonly allowed: readonly PolicyStatus[],
  ) {
    super(
      allowed.length === 0
        ? `refusing ${from} -> ${to}: ${from} is a terminal state with no legal transitions`
        : `refusing ${from} -> ${to}: legal transitions from ${from} are ${allowed.join(', ')}`,
    );
    this.name = 'IllegalTransitionError';
  }
}

/**
 * Throw unless `from -> to` is on the lifecycle.
 *
 * ⚠️ A no-op change (`from === to`) is refused rather than silently accepted.
 * 02a §4 draws no self-edges, and accepting one would write an audit row saying
 * a transition happened when nothing changed — a false entry on the table
 * auditors read is worse than a rejected request.
 */
export function assertTransition(from: PolicyStatus, to: PolicyStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to, allowedTargets(from));
  }
}

/** Re-exported so callers need one import to ask both questions. */
export { isTerminal };
