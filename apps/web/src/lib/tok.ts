/**
 * File: apps/web/src/lib/tok.ts
 * Purpose: The single source of status colour, ported verbatim from the handoff.
 * Category: ui / design system
 * Scope: Phase W19
 *
 * Description:
 *   components/status.md:3-19 states the rule outright: every rating in the
 *   product — risk level, control health, posture, SLA state, incident
 *   severity, audit grade, assessment result — resolves to one of four
 *   tokens, through ONE helper used everywhere. The switch below is that
 *   helper, copied as-is.
 *
 *   Every value is a CSS custom property, never a literal. That is what lets
 *   the fixtures carry colour without tripping the hardcoded-colour guard,
 *   and what makes the dark theme work for free — tokens.css:67 redefines
 *   the same names.
 *
 *   Domain mappings onto G/A/R/N live in status.md's table and belong at the
 *   call site, not here: "Effective -> G" is a control-domain fact, and
 *   folding it in would make this helper know about domains it should not.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/status.md
 */

export type Rating = 'G' | 'A' | 'R' | 'N';

export type RatingTokens = {
  /** Fill behind a pill or cell. */
  bg: string;
  /** Text colour on that fill. */
  ink: string;
  /** The 6-8px dot, and progress-bar fill. */
  dot: string;
};

export function tok(rating: string): RatingTokens {
  switch (rating) {
    case 'G':
      return { bg: 'var(--rag-g-bg)', ink: 'var(--rag-g-ink)', dot: 'var(--rag-g)' };
    case 'A':
      return { bg: 'var(--rag-a-bg)', ink: 'var(--rag-a-ink)', dot: 'var(--rag-a)' };
    case 'R':
      return { bg: 'var(--rag-r-bg)', ink: 'var(--rag-r-ink)', dot: 'var(--rag-r)' };
    default:
      return { bg: 'var(--surface-3)', ink: 'var(--text-2)', dot: 'var(--rag-n)' };
  }
}
