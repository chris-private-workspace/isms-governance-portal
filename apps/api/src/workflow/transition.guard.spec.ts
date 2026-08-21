/**
 * File: apps/api/src/workflow/transition.guard.spec.ts
 * Purpose: The negative half of US-1 — illegal Policy transitions are refused, and the table still matches the schema.
 * Category: Test (unit — no database, no container)
 * Scope: Phase W25 (M5 spike — candidate A)
 *
 * Description:
 *   ⚠️ THE POSITIVE CASES ARE THE CHEAP HALF. A test that walks the seven legal
 *   edges passes just as happily against a guard that returns `true`
 *   unconditionally, which is why the neutralisation record in
 *   W25 progress.md Day 1 is part of this file's acceptance and not a footnote.
 *
 *   Three groups, and the third is the one that earns its keep:
 *     1. legal edges are accepted        — derived from the table, so it cannot drift from it
 *     2. named illegal edges are refused — the specific ones checklist 1.2 lists
 *     3. structural invariants           — properties of the DIAGRAM that are not
 *        the table restated: exactly one terminal state, every state reachable
 *        from draft, no self-edges, and coverage equal to the Prisma enum AT
 *        RUNTIME. A transcription slip that drops an edge keeps groups 1 and 2
 *        green and fails group 3.
 *
 * Created: 2026-08-21 (Phase W25)
 * Last Modified: 2026-08-21
 */
import { PolicyStatus } from '../generated/prisma';
import { IllegalTransitionError, assertTransition } from './transition.guard';
import {
  POLICY_INITIAL_STATUS,
  POLICY_STATUSES,
  POLICY_TRANSITIONS,
  POLICY_TRANSITION_EDGES,
  allowedTargets,
  canTransition,
  isTerminal,
} from './transitions';

describe('policy transition guard', () => {
  // === 1. Legal edges ======================================================
  // Derived from the table rather than listed again: a second hand-written list
  // of seven pairs is a mirror, and a mirror agrees with a wrong table.

  it.each(POLICY_TRANSITION_EDGES)('accepts %s -> %s', (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
    expect(canTransition(from, to)).toBe(true);
  });

  // === 2. The named illegal edges (checklist 1.2) ==========================

  it('refuses draft -> approved, which skips review', () => {
    expect(() => assertTransition('draft', 'approved')).toThrow(IllegalTransitionError);
  });

  it('refuses published -> draft, which runs the lifecycle backwards', () => {
    expect(() => assertTransition('published', 'draft')).toThrow(IllegalTransitionError);
  });

  it('refuses retired -> published, and says the state is terminal', () => {
    expect(() => assertTransition('retired', 'published')).toThrow(/retired is a terminal state/);
  });

  it('refuses a no-op change', () => {
    // 02a §4 draws no self-edges. Accepting one would write an audit row
    // claiming a transition that did not happen.
    expect(() => assertTransition('draft', 'draft')).toThrow(IllegalTransitionError);
  });

  it('names the legal alternatives in the error, not just the refusal', () => {
    let caught: IllegalTransitionError | undefined;
    try {
      assertTransition('in_review', 'published');
    } catch (error) {
      caught = error as IllegalTransitionError;
    }

    expect(caught).toBeInstanceOf(IllegalTransitionError);
    expect(caught?.from).toBe('in_review');
    expect(caught?.to).toBe('published');
    // Both exits, including the "changes requested" return edge at 02a:365.
    expect(caught?.allowed).toEqual(['approved', 'draft']);
    expect(caught?.message).toContain('approved, draft');
  });

  // === 3. Structural invariants of the diagram ============================

  it('covers exactly the PolicyStatus values the schema declares', () => {
    // Runtime, not just types: this catches a table that type-checks because
    // someone cast, and it is the link that makes "add a state to schema.prisma"
    // fail here rather than arrive as a state with undefined behaviour.
    expect([...POLICY_STATUSES].sort()).toEqual(Object.values(PolicyStatus).sort());
  });

  it('has exactly one terminal state, and it is retired', () => {
    const terminal = POLICY_STATUSES.filter(isTerminal);
    expect(terminal).toEqual(['retired']);
  });

  it('declares no self-edges', () => {
    expect(POLICY_TRANSITION_EDGES.filter(([from, to]) => from === to)).toEqual([]);
  });

  it('reaches every state from the initial one', () => {
    // A dropped edge orphans a state while leaving every other assertion green.
    const seen = new Set([POLICY_INITIAL_STATUS as string]);
    const queue: string[] = [POLICY_INITIAL_STATUS];
    while (queue.length > 0) {
      for (const next of allowedTargets(queue.shift() as PolicyStatus)) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }

    expect([...seen].sort()).toEqual([...POLICY_STATUSES].sort());
  });

  it('starts where the schema default starts', () => {
    // 02a:362 and schema.prisma:336 state the same fact; they must not drift.
    expect(POLICY_INITIAL_STATUS).toBe('draft');
    expect(POLICY_TRANSITIONS[POLICY_INITIAL_STATUS]).not.toHaveLength(0);
  });
});
