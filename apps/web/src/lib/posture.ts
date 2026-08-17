/**
 * File: apps/web/src/lib/posture.ts
 * Purpose: The thresholds that turn a demo figure into a RAG letter.
 * Category: ui / design system
 * Scope: Phase W19
 *
 * Description:
 *   The fragments receive colour already decided — every cell arrives as a
 *   {{ c.bg }} / {{ c.ink }} hole. The banding itself lived in the prototype's
 *   logic class, which the handoff did not extract. So it has to be written
 *   here, and writing it is the honest option: the alternative is to hardcode
 *   the colours per row, which renders identically and is a lie the moment the
 *   fixture changes.
 *
 *   WHERE EVERY BOUNDARY COMES FROM, because the difference matters:
 *
 *   - The 16 boundary is the charter's (CLAUDE.md parameter #7: score >= 16
 *     must be treated, residual >= 16 enters the IT Risk Register).
 *     The G/A/R meanings are components/status.md's table — 'High / Critical'
 *     is one red band there, which is why riskBand collapses both onto R.
 *   - Every percentage and count in THRESHOLD is the design's own, from the
 *     `thresholds` collection at dc.html:5088-5092. No procedure in this repo
 *     states them, so the deliverable is the only source and it governs
 *     (parameter #11). The Admin screen renders that same collection, which is
 *     why it must read this module rather than carry a second copy.
 *
 *   This header used to claim the five were invented. They were not, and the
 *   claim hid a transcription drift: three matched the design exactly while
 *   RCSA completion (75 written as 70) and high/critical risks (5/9 written as
 *   4/7) did not, so nine screens banded two metrics against numbers nobody
 *   had chosen. Corrected 2026-08-17 — the mismatch surfaced only when the
 *   Admin screen put the design's numbers and this module's side by side.
 *
 *   regionPosture is the roll-up and the weakest claim on the page. The
 *   deliverable simply hardcoded 'A' for six entities, so there is no design
 *   answer to copy and no procedure to follow. The median is used because it
 *   is explainable in one sentence and does not let a single entity define the
 *   region in either direction. A governance-grade rule is an open question,
 *   not something this port should quietly settle.
 *
 * Key Components:
 *   - riskBand: residual score -> letter + band word
 *   - band / bandDesc: metric value -> letter, ascending and descending forms
 *   - regionPosture: entity letters -> one letter for the region
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Align completion + highRisks to dc.html:5088 (Phase W19) — drift
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/status.md
 */

import type { Rating } from './tok';

/**
 * Residual risk score to band.
 *
 * The score is Likelihood x Impact on a 5-point scale, so 1-25. 16 is the
 * charter's treatment threshold; 20 marks the top of the register where both
 * factors are at their worst.
 */
export function riskBand(score: number): { rating: Rating; label: string } {
  if (score >= 20) return { rating: 'R', label: 'Critical' };
  if (score >= 16) return { rating: 'R', label: 'High' };
  if (score >= 6) return { rating: 'A', label: 'Medium' };
  return { rating: 'G', label: 'Low' };
}

/** Higher is better — coverage, completion, attestation. */
export function band(value: number, good: number, watch: number): Rating {
  if (value >= good) return 'G';
  if (value >= watch) return 'A';
  return 'R';
}

/** Lower is better — overdue counts, open criticals, high-risk counts. */
export function bandDesc(value: number, good: number, watch: number): Rating {
  if (value <= good) return 'G';
  if (value <= watch) return 'A';
  return 'R';
}

/**
 * The thresholds, named so a call site reads as a sentence rather than as two
 * bare numbers. All five are the design's own, from dc.html:5088-5092 — see the
 * file header for how two of them had drifted and what that cost.
 */
export const THRESHOLD = {
  /** Control coverage %, higher is better. */
  coverage: { good: 90, watch: 80 },
  /** RCSA / assessment completion %, higher is better. */
  completion: { good: 90, watch: 75 },
  /** High and critical risks held open, lower is better. */
  highRisks: { good: 5, watch: 9 },
  /** Overdue actions, lower is better. */
  overdue: { good: 2, watch: 5 },
  /** Open critical issues, lower is better. Any one of them is already amber. */
  openCritical: { good: 0, watch: 1 },
} as const;

const ORDER: Record<string, number> = { G: 0, A: 1, R: 2 };
const LETTER: Rating[] = ['G', 'A', 'R'];

/**
 * One letter for the whole region.
 *
 * Median, not worst-of: with 13 entities a single red one would pin the region
 * to red permanently, and a region that is always red tells a board nothing.
 * Documented as an open question rather than presented as settled.
 */
export function regionPosture(letters: string[]): Rating {
  if (letters.length === 0) return 'N';
  const sorted = [...letters].map((l) => ORDER[l] ?? 1).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 1;
  return LETTER[median] ?? 'N';
}

/** Signed delta for a KPI footer, e.g. '+3' / '-1' / '0'. */
export function delta(now: number, prev: number): string {
  const d = Math.round(now - prev);
  return d > 0 ? `+${d}` : `${d}`;
}
