/**
 * File: apps/api/src/core-model/risk-score.spec.ts
 * Purpose: The refusals this layer owes, plus the two absences it must NOT refuse.
 * Category: core-model
 * Scope: Phase W05
 *
 * Description:
 *   ⚠️ The FORMULA is not tested here, on purpose. ADR-0013 puts it in a
 *   generated column, so a unit test asserting a TypeScript product would prove
 *   a function no request ever calls. The formula is proven in risk.int.spec.ts
 *   against the real column, with fixtures where MAX and SUM differ — swap the
 *   migration's `GREATEST` for `+` and that suite turns red.
 *
 *   What IS proven here is the rule that costs the most to get wrong: a score
 *   set is complete or empty, never partial. `GREATEST` ignores nulls, so a
 *   partial set does not fail — it produces a confident wrong number.
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-11
 */
import {
  RATING_MAX,
  RATING_MIN,
  RiskScoreValidationError,
  SCORE_SET_COLUMNS,
  scoreColumnName,
  scoreExpression,
  TREATMENT_THRESHOLD,
  validateScoreSet,
} from './risk-score';

const COMPLETE = { lkh: 4, fin: 2, bop: 5, lry: 1, rep: 3, sis: 1 } as const;

/** The offending column, or a rethrow — never a silently passing assertion. */
function violationOf(run: () => void): RiskScoreValidationError {
  try {
    run();
  } catch (error) {
    if (error instanceof RiskScoreValidationError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a RiskScoreValidationError, nothing was thrown');
}

describe('validateScoreSet', () => {
  // ---- the absences that are legitimate lifecycle states (02a:343-353) ----

  it('accepts an entirely empty set — a risk in Identified has no scores yet', () => {
    expect(() => validateScoreSet('before', {})).not.toThrow();
  });

  it('accepts an entirely null set — absent and explicitly-null mean the same', () => {
    const allNull = { lkh: null, fin: null, bop: null, lry: null, rep: null, sis: null };
    expect(() => validateScoreSet('after', allNull)).not.toThrow();
  });

  it('accepts a complete set', () => {
    expect(() => validateScoreSet('before', COMPLETE)).not.toThrow();
  });

  it('accepts both ends of the 1–5 scale', () => {
    const floor = {
      lkh: RATING_MIN,
      fin: RATING_MIN,
      bop: RATING_MIN,
      lry: RATING_MIN,
      rep: RATING_MIN,
      sis: RATING_MIN,
    };
    const ceiling = {
      lkh: RATING_MAX,
      fin: RATING_MAX,
      bop: RATING_MAX,
      lry: RATING_MAX,
      rep: RATING_MAX,
      sis: RATING_MAX,
    };
    expect(() => validateScoreSet('before', floor)).not.toThrow();
    expect(() => validateScoreSet('before', ceiling)).not.toThrow();
  });

  // ---- refusals ----

  it.each(SCORE_SET_COLUMNS.map((column) => [column]))(
    'refuses a set missing only %s, and names the missing column',
    (column) => {
      const partial = { ...COMPLETE, [column]: null };
      const error = violationOf(() => validateScoreSet('after', partial));

      expect(error.message).toContain(scoreColumnName('after', column));
      // The whole set is wrong, not one field — so no single column is blamed.
      expect(error.column).toBeUndefined();
    },
  );

  it('refuses a set with only likelihood — the shape GREATEST would silently accept', () => {
    const error = violationOf(() => validateScoreSet('before', { lkh: 4 }));
    expect(error.message).toContain('complete or absent');
    expect(error.message).toContain('fin_before');
    expect(error.message).toContain('sis_before');
  });

  it.each([
    [0, 'below the scale'],
    [6, 'above the scale'],
    [-1, 'negative'],
    [2.5, 'fractional'],
    [Number.NaN, 'not a number'],
  ])('refuses %p (%s) and names the column', (value) => {
    const error = violationOf(() => validateScoreSet('before', { ...COMPLETE, lkh: value }));
    expect(error.column).toBe('lkh_before');
    expect(error.message).toContain('lkh_before');
  });

  it('names the phase it was given, not a fixed one', () => {
    expect(violationOf(() => validateScoreSet('after', { ...COMPLETE, sis: 9 })).column).toBe(
      'sis_after',
    );
    expect(violationOf(() => validateScoreSet('before', { ...COMPLETE, sis: 9 })).column).toBe(
      'sis_before',
    );
  });

  it('reports the band violation before the completeness one when both hold', () => {
    // Which of the two CHECK constraints PostgreSQL reports first is not
    // specified, so this pins only THIS layer's order. It exists so a change to
    // the order is a decision someone made rather than one that drifted.
    const error = violationOf(() => validateScoreSet('before', { lkh: 9 }));
    expect(error.column).toBe('lkh_before');
  });
});

describe('scoreExpression', () => {
  // The text itself is pinned against the live column in risk.int.spec.ts; what
  // is asserted here is only that the two phases do not share one set of columns
  // — a copy-paste that would make the residual score read the inherent inputs.
  it('references only its own phase', () => {
    expect(scoreExpression('after')).not.toContain('_before');
    expect(scoreExpression('before')).not.toContain('_after');
  });

  it('covers all five impact types', () => {
    for (const column of ['fin', 'bop', 'lry', 'rep', 'sis']) {
      expect(scoreExpression('before')).toContain(`${column}_before`);
    }
  });
});

describe('TREATMENT_THRESHOLD', () => {
  it('is the 16 the acceptance criteria state (02a:120)', () => {
    expect(TREATMENT_THRESHOLD).toBe(16);
  });
});
