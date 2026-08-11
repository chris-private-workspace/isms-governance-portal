/**
 * File: apps/api/src/core-model/risk-score.ts
 * Purpose: Application-layer half of risk-score validation, and the one written record of where the formula lives.
 * Category: core-model
 * Scope: Phase W05 (M1 slice 2)
 * Owner: docs/14-adr/0013-risk-scoring-and-calibration.md
 *
 * Description:
 *   ⚠️ THERE IS NO ARITHMETIC IN THIS FILE, AND THAT IS THE POINT.
 *
 *   ADR-0013 puts the score itself in a PostgreSQL generated column, so the
 *   database computes `LKH × MAX(FIN,BOP,LRY,REP,SIS)` in the same write that
 *   sets the inputs and a caller cannot supply a score at all. Recomputing that
 *   product in TypeScript would be a second implementation of one rule with no
 *   request-path caller — AP-6 and AP-1 in one file. W05 measured that nothing
 *   in the request path needs it: writes are computed by the database, reads
 *   come back from it, and the roll-up's sorting and filtering are SQL.
 *
 *   What is left for this layer is what the database cannot do well, and it is
 *   the same division extension-validator.ts already draws against its trigger:
 *
 *     1. fail before a round trip, so an invalid write costs nothing
 *     2. produce a structured error naming the COLUMN and the expectation,
 *        where a CHECK constraint can only raise its own name
 *
 *   The vocabulary is deliberately the database's: violations are reported as
 *   `lkh_before` / `sis_after`, the names 02a:194-195 specifies and the names
 *   the CHECK constraints carry. Two layers that describe the same rule in two
 *   vocabularies cannot be compared by anyone reading a bug report.
 *
 *   ⚠️ Two implementations of one rule is how AP-6 starts. What keeps this
 *   honest is that neither layer OWNS the rule alone: the CHECK constraints hold
 *   with this function neutralised, and the integration suite proves it by
 *   neutralising it (US-5). A second layer that cannot be shown to hold on its
 *   own is indistinguishable from a comment.
 *
 * Key Components:
 *   - RiskScoreValidationError: carries the column, so a form can mark the field
 *   - validateScoreSet(): pure; a candidate score set in, throw or return
 *   - SCORE_EXPRESSION_*: the authoritative formula text — see its own note
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-11
 *
 * Modification History (newest-first):
 *   - 2026-08-11: Initial creation (Phase W05) — validation only, by ADR-0013
 *
 * Related:
 *   - docs/02-architecture/02a-data-model-spec.md §2 (scoring), §3 (Risk fields)
 *   - apps/api/src/core-model/extension-validator.ts — the same division of work
 */

/**
 * The six columns that make up one score set. Order follows 02a:194 so a
 * violation message lists them the way the specification does.
 */
export const SCORE_SET_COLUMNS = ['lkh', 'fin', 'bop', 'lry', 'rep', 'sis'] as const;

export type ScoreSetColumn = (typeof SCORE_SET_COLUMNS)[number];

/** `before_control` (inherent) and `after_control` (residual) — 02a:140. */
export type ScorePhase = 'before' | 'after';

/**
 * A candidate score set. Every column is optional because the lifecycle at
 * 02a:343-353 guarantees rows where a whole set is still empty: a risk sits in
 * Identified with no before-scores, and in Treated with no after-scores.
 * Partially filled is the state that must never exist — see validateScoreSet.
 */
export type ScoreSet = Readonly<Partial<Record<ScoreSetColumn, number | null>>>;

/** Both likelihood and each impact type are scored 1–5 independently (02a:115-117). */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/**
 * Risk acceptance threshold (02a:120, 02a:141). A score of 16 or more requires
 * treatment; a residual score of 16 or more is recorded in the IT Risk Register.
 *
 * ⚠️ This is a group-standard constant, NOT a per-entity setting. 已確認參數 #7
 * permits governed per-entity calibration through configuration, and ADR-0013
 * records why that configuration table is not built today and what would
 * unblock it. Read the ADR before adding a second home for this number.
 *
 * ⚠️ The authoritative copy is inside the generated-column expressions below;
 * this export exists so the integration suite can assert the 15/16 boundary
 * against a named constant rather than a magic number. Nothing in the request
 * path reads it.
 */
export const TREATMENT_THRESHOLD = 16;

// === The formula's authoritative text ===
// Why these constants exist at all: ADR-0013 puts the formula in a generated
// column, so it is written in migration SQL and MIRRORED in schema.prisma as
// `@default(dbgenerated("..."))` — Prisma cannot express a generated column, and
// W05 measured that its diff engine compares that mirror to PostgreSQL's
// normalised expression BYTE FOR BYTE. A missing pair of outer parentheses makes
// every later `migrate dev` emit an `ALTER COLUMN ... SET DEFAULT` that then
// fails to apply, forever, for reasons the next session will not guess.
//
// So the text below is not documentation. The integration suite reads
// `pg_get_expr` off the live column and asserts equality with it, which pins the
// migration to the specification totally rather than at the fixture values a
// behavioural test happens to use.
//
// Alternative considered: derive the text from `prisma db pull`. Rejected — it
// rewrites the whole schema file and drops every `//` header comment (measured,
// W05 Day 1 R3). `pg_get_expr` gives the identical string with no side effects.
const impactMax = (phase: ScorePhase): string =>
  `GREATEST(fin_${phase}, bop_${phase}, lry_${phase}, rep_${phase}, sis_${phase})`;

/** `LKH × MAX(FIN,BOP,LRY,REP,SIS)` as PostgreSQL normalises it (02a:136). */
export const scoreExpression = (phase: ScorePhase): string =>
  `(lkh_${phase} * ${impactMax(phase)})`;

/** Distinguishable from a scope error: this one is the caller's data, not their rights. */
export class RiskScoreValidationError extends Error {
  constructor(
    message: string,
    /** The offending column, or undefined when the failure spans the whole set. */
    readonly column?: string,
  ) {
    super(message);
    this.name = 'RiskScoreValidationError';
  }
}

/** `lkh` + `before` -> `lkh_before`, the name in 02a, the migration and the error. */
export function scoreColumnName(phase: ScorePhase, column: ScoreSetColumn): string {
  return `${column}_${phase}`;
}

/**
 * Refuse a score set the database would also refuse, earlier and with a name.
 *
 * Two rules, in the order the specification states them:
 *
 *   1. every supplied value is an integer 1–5 (02a:115-117). Without this a
 *      likelihood of 7 would store a score of 35 and quietly leave the 1–25
 *      range 02a:119 defines.
 *   2. a set is complete or empty, never partial. This is the rule that costs
 *      the most to get wrong: `GREATEST` IGNORES nulls, so a set with two of
 *      five impacts filled produces a confident, plausible, wrong number
 *      (measured, W05 Day 0 P2). The database enforces it with
 *      `num_nonnulls(...) IN (0, 6)`; this is the same rule, said earlier.
 *
 * @param phase which score set — decides the column names in any violation
 * @param set the candidate; `null` and `undefined` both mean "not supplied"
 */
export function validateScoreSet(phase: ScorePhase, set: ScoreSet): void {
  const supplied: ScoreSetColumn[] = [];

  for (const column of SCORE_SET_COLUMNS) {
    const value = set[column];
    if (value === undefined || value === null) {
      continue;
    }

    if (!Number.isInteger(value) || value < RATING_MIN || value > RATING_MAX) {
      throw new RiskScoreValidationError(
        `${scoreColumnName(phase, column)} must be an integer ${RATING_MIN}–${RATING_MAX}, got ${value}`,
        scoreColumnName(phase, column),
      );
    }

    supplied.push(column);
  }

  if (supplied.length === 0 || supplied.length === SCORE_SET_COLUMNS.length) {
    return;
  }

  const missing = SCORE_SET_COLUMNS.filter((column) => !supplied.includes(column)).map((column) =>
    scoreColumnName(phase, column),
  );

  throw new RiskScoreValidationError(
    `a ${phase}-control score set must be complete or absent; missing: ${missing.join(', ')}`,
  );
}
