/**
 * File: apps/web/src/data/extended/myTasks.ts
 * Purpose: The four RCSA self-assessment tasks shown in the /assessments side card.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   Why this directory exists at all: everything in apps/web/src/data/ proper is
 *   a verbatim copy of a handoff data/*.js file, and being diffable against that
 *   file is the point. This collection has no such file, so putting it there
 *   would quietly break that property for every other reader.
 *
 *   It is NOT invented, and the distinction is worth keeping straight. The rows
 *   below are transcribed from the design SOURCE — design/ISMS Governance
 *   Platform.dc.html:5063-5067 — where myTasks is assembled inside the
 *   prototype's logic class instead of in data/. Same provenance as the
 *   fragments; different file in the deliverable.
 *
 *   The per-row style holes the fragment reads ({{ t.boxBorder }}, {{ t.boxBg }},
 *   {{ t.titleColor }}, {{ t.strike }}) are deliberately NOT stored here. Every
 *   one of them is a pure function of `done`, and the design's own logic derives
 *   them at render time; storing them would let a row's colour disagree with its
 *   own state.
 *
 * Key Components:
 *   - AssessmentTask: one row — title, meta, done
 *   - myTasks: AssessmentTask[] — 4 rows, 2 of them done
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — transcribed from the design source
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/design/ISMS Governance Platform.dc.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/13-assessments.html
 */

export type AssessmentTask = {
  title: string;
  /** Record reference plus control type, as the design writes it. */
  meta: string;
  done: boolean;
};

export const myTasks: AssessmentTask[] = [
  { title: 'Confirm access-control risk rating', meta: 'RSK-1120 · Cloud provider concentration', done: true },
  { title: 'Attest MFA control operating', meta: 'CTL-2201 · Preventive', done: true },
  { title: 'Review third-party onboarding risk', meta: 'RSK-1155 · Operational', done: false },
  { title: 'Complete phishing-control self-assessment', meta: 'CTL-2150 · Monthly', done: false },
];
