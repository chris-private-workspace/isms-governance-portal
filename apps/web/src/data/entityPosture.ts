/**
 * File: apps/web/src/data/entityPosture.ts
 * Purpose: Per-OpCo posture rows for the flagship roll-up dashboard. DEMO fixture.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Replaces the handoff's data/data.js, which is the ONE fixture that could not
 *   be copied. That file held six rows keyed by COUNTRY, each labelled with a
 *   banking regulator ('Singapore (MAS)', 'China (PBoC)'). Both properties are
 *   wrong here: China is out of scope, and country is not a valid entity key
 *   because Singapore and Hong Kong each hold two OpCos (AD-Mockup-2).
 *
 *   So this module is DERIVED rather than authored: it maps over `opcos` and
 *   attaches metrics. The row count, the codes, the names and the RAG letter all
 *   come from opcos.ts. Adding or removing an OpCo there changes this table with
 *   no edit here, and the two can never disagree about how many entities exist —
 *   which is exactly the drift that produced a hardcoded "6 jurisdictions" in the
 *   deliverable.
 *
 *   `metrics` below is the only invented data. Every row's numbers are consistent
 *   with that OpCo's `posture` in opcos.ts: G rows sit above the good thresholds,
 *   R rows below the critical ones. A row whose cells contradict its own RAG
 *   letter would make the heatmap look broken during the demo.
 *
 * Key Components:
 *   - entityPosture: EntityPosture[] — one row per in-scope OpCo, 13 of them
 *   - EntityPosture: row type, derived so consumers never restate the shape
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — rebuilt from opcos, not copied
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/data.js (superseded)
 *   - fragments/screens/03-dashboard.html — the consumer
 */

import { opcos } from './opcos';

/** Two-letter badge shown in the entity cell. Keyed by the jurisdiction. */
const flagOf: Record<string, string> = {
  Singapore: 'SG',
  'Hong Kong': 'HK',
  Australia: 'AU',
  'New Zealand': 'NZ',
  Malaysia: 'MY',
  Thailand: 'TH',
  Korea: 'KR',
  Taiwan: 'TW',
  Indonesia: 'ID',
  Philippines: 'PH',
  Vietnam: 'VN',
};

type Metrics = {
  /** Display name — the legal name does not fit the 210px scorecard cell. */
  short: string;
  risks: number;
  high: number;
  cov: number;
  overdue: number;
  open: number;
  rcsa: number;
  prev: { cov: number; rcsa: number; high: number };
};

// === metrics: the only hand-authored numbers in this file ===
// Why they are not random: each row has to agree with its own posture letter in
// opcos.ts. A 'G' entity with 61% control coverage would render a green pill over
// a row of red cells, and the first question in the demo would be about the bug
// rather than the roll-up.
const metrics: Record<string, Metrics> = {
  RAP: { short: 'Ricoh Asia Pacific', risks: 58, high: 6, cov: 94, overdue: 1, open: 0, rcsa: 98, prev: { cov: 92, rcsa: 95, high: 7 } },
  RAPO: { short: 'Ricoh AP Operations', risks: 47, high: 7, cov: 85, overdue: 4, open: 1, rcsa: 78, prev: { cov: 86, rcsa: 74, high: 6 } },
  RHK: { short: 'Ricoh Hong Kong', risks: 52, high: 5, cov: 92, overdue: 2, open: 0, rcsa: 93, prev: { cov: 90, rcsa: 89, high: 6 } },
  RSG: { short: 'Ricoh Singapore', risks: 61, high: 9, cov: 83, overdue: 6, open: 1, rcsa: 70, prev: { cov: 84, rcsa: 72, high: 8 } },
  RAU: { short: 'Ricoh Australia', risks: 49, high: 4, cov: 96, overdue: 0, open: 0, rcsa: 95, prev: { cov: 93, rcsa: 91, high: 5 } },
  RNZ: { short: 'Ricoh New Zealand', risks: 31, high: 3, cov: 91, overdue: 1, open: 0, rcsa: 90, prev: { cov: 89, rcsa: 87, high: 4 } },
  RMY: { short: 'Ricoh Malaysia', risks: 43, high: 8, cov: 74, overdue: 7, open: 2, rcsa: 58, prev: { cov: 77, rcsa: 63, high: 6 } },
  RTH: { short: 'Ricoh Thailand', risks: 38, high: 5, cov: 86, overdue: 3, open: 0, rcsa: 81, prev: { cov: 83, rcsa: 79, high: 5 } },
  RKR: { short: 'Ricoh Korea', risks: 44, high: 4, cov: 90, overdue: 2, open: 0, rcsa: 92, prev: { cov: 88, rcsa: 90, high: 5 } },
  RTW: { short: 'Ricoh Taiwan', risks: 36, high: 6, cov: 82, overdue: 5, open: 1, rcsa: 76, prev: { cov: 80, rcsa: 77, high: 6 } },
  RID: { short: 'Ricoh Indonesia', risks: 29, high: 7, cov: 68, overdue: 8, open: 2, rcsa: 54, prev: { cov: 71, rcsa: 60, high: 5 } },
  RPH: { short: 'Ricoh Philippines', risks: 33, high: 5, cov: 84, overdue: 4, open: 0, rcsa: 79, prev: { cov: 82, rcsa: 75, high: 4 } },
  RVN: { short: 'Ricoh Vietnam', risks: 18, high: 6, cov: 61, overdue: 9, open: 3, rcsa: 41, prev: { cov: 64, rcsa: 47, high: 5 } },
};

export const entityPosture = opcos.map((o) => {
  const m = metrics[o.code];
  if (!m) throw new Error(`entityPosture: no metrics for OpCo ${o.code}`);
  return {
    /** Stable roll-up key. Country is NOT one — two OpCos share Singapore. */
    code: o.code,
    name: m.short,
    /** Sub-line under the name. Was 'MAS regulated' in the handoff. */
    local: `${o.country} · ${o.role}`,
    flag: flagOf[o.country] ?? '??',
    /** Jurisdiction alone. The handoff paired it with a financial regulator. */
    juris: o.country,
    overall: o.posture,
    risks: m.risks,
    high: m.high,
    cov: m.cov,
    overdue: m.overdue,
    open: m.open,
    rcsa: m.rcsa,
    prev: m.prev,
  };
});

export type EntityPosture = (typeof entityPosture)[number];

/** 11. Singapore and Hong Kong each hold two OpCos, so this is not 13. */
export const jurisdictionCount = new Set(entityPosture.map((e) => e.juris)).size;
