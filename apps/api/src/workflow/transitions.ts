/**
 * File: apps/api/src/workflow/transitions.ts
 * Purpose: The Policy lifecycle as data — every legal state change, and nothing else.
 * Category: workflow
 * Owner: docs/02-architecture/02a-data-model-spec.md §4 (Policy lifecycle)
 * Scope: Phase W25 (M5 spike — candidate A, data-driven)
 *
 * Description:
 *   ⚠️ THIS FILE HAS NO I/O AND NO NEST DECORATORS, AND THAT IS THE POINT.
 *
 *   OQ-7 asks where a lean state machine stops being lean. That question is only
 *   answerable if the lean candidate is actually lean, so candidate A is a table
 *   plus three total functions over it. Anything that needs a database, a
 *   request, or a container belongs on the other side of the guard.
 *
 *   The table is transcribed edge-for-edge from the stateDiagram at 02a:362-370.
 *   Seven state-to-state edges; `[*] --> Draft` and `Retired --> [*]` are
 *   pseudostates, not transitions, and are represented here as
 *   POLICY_INITIAL_STATUS and by `retired` having no targets.
 *
 *   ⭐ WHY AN EXHAUSTIVE Record RATHER THAN A LIST OF PAIRS. A
 *   `Record<PolicyStatus, ...>` keyed on the generated Prisma enum cannot be
 *   written without naming all six states, so adding a seventh to schema.prisma
 *   fails the build here rather than silently arriving as a state with no
 *   declared exits. A pair list compiles fine while saying nothing about the new
 *   value — the same shape as a guard that only covers the paths its author
 *   remembered.
 *
 *   ⚠️ No edge count is written down anywhere in this file. W25 Day 0 got that
 *   count wrong once (8 vs the real 7, by counting the two pseudostates), which
 *   is this repo's seventh hand-written counter to be caught wrong. Counts are
 *   derived from the table; see POLICY_TRANSITION_EDGES.
 *
 * Key Components:
 *   - POLICY_TRANSITIONS: the table; exhaustive over PolicyStatus
 *   - canTransition(): the predicate the guard is built on
 *   - allowedTargets() / isTerminal(): reads over the same table
 *   - POLICY_TRANSITION_EDGES: derived flat edge list — for tests and metrics
 *
 * Created: 2026-08-21 (Phase W25)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Initial creation (Phase W25) — candidate A transcribed from 02a §4
 *
 * Related:
 *   - apps/api/prisma/schema.prisma:373-382 — the PolicyStatus enum this is keyed on
 *   - apps/api/src/workflow/transition.guard.ts — the enforcement built on this table
 */
import type { PolicyStatus } from '../generated/prisma';

/**
 * Where a policy starts. 02a:362 draws this as `[*] --> Draft`, and
 * schema.prisma:336 defaults the column to the same value — two statements of
 * one fact, which is why this constant names it once for both to be checked
 * against.
 */
export const POLICY_INITIAL_STATUS = 'draft' satisfies PolicyStatus;

/**
 * Legal targets for each state, transcribed from 02a:362-370.
 *
 * ⚠️ The empty array on `retired` is a claim, not an omission: 02a:370 sends
 * Retired to the final pseudostate and gives it no outgoing edge. An absent key
 * would mean the same thing to `canTransition` and something quite different to
 * a reader, so it is written out.
 */
export const POLICY_TRANSITIONS: Readonly<Record<PolicyStatus, readonly PolicyStatus[]>> = {
  draft: ['in_review'],
  // 02a:365 labels the return edge "changes requested" — one state, two exits.
  in_review: ['approved', 'draft'],
  approved: ['published'],
  published: ['under_revision', 'retired'],
  under_revision: ['in_review'],
  retired: [],
} as const;

/** Every state named by the table, in the order schema.prisma:374-379 declares. */
export const POLICY_STATUSES = Object.keys(POLICY_TRANSITIONS) as readonly PolicyStatus[];

/**
 * The table flattened to `[from, to]` pairs. Derived rather than written, so it
 * cannot disagree with POLICY_TRANSITIONS the way a second hand-maintained list
 * eventually would.
 */
export const POLICY_TRANSITION_EDGES: readonly (readonly [PolicyStatus, PolicyStatus])[] =
  Object.entries(POLICY_TRANSITIONS).flatMap(([from, targets]) =>
    targets.map((to) => [from as PolicyStatus, to] as const),
  );

/** True when `to` is reachable from `from` in one step. Total over both arguments. */
export function canTransition(from: PolicyStatus, to: PolicyStatus): boolean {
  return POLICY_TRANSITIONS[from].includes(to);
}

/** The legal next states from `from`, possibly empty. */
export function allowedTargets(from: PolicyStatus): readonly PolicyStatus[] {
  return POLICY_TRANSITIONS[from];
}

/** A state with no exits. `retired` is the only one 02a §4 defines. */
export function isTerminal(status: PolicyStatus): boolean {
  return POLICY_TRANSITIONS[status].length === 0;
}
