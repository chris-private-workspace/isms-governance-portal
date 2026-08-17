/**
 * File: apps/web/src/data/extended/issueWorkflow.ts
 * Purpose: The remediation checklist and activity feed shown on an issue detail.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and is diffable against it; this one is
 *   not, so every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:5276-5286  (idd.actions, idd.activity)
 *   `issues.ts` carries no sub-collections, and the handoff's `data/issues.js`
 *   does not either — the prototype attached the same four steps and the same
 *   three activity entries to whichever issue was open. Carried across at that
 *   fidelity rather than upgraded: a per-issue history would be invented data
 *   wearing the same clothes as the rest of the fixture.
 *
 *   Only the SHAPE is here. The sentences are copy and live in the i18n
 *   dictionaries (port rule 5); `who` on an activity entry is either the
 *   issue's own owner or a named party, which is why it is a discriminated
 *   union rather than a string.
 *
 *   `done` is fixed at two of four for every issue, matching the prototype. It
 *   is therefore NOT a function of the issue's status — an issue marked Closed
 *   still shows two open steps. Recorded here rather than quietly corrected,
 *   because correcting it would invent a rule the design never states.
 *
 * Key Components:
 *   - ISSUE_ACTIONS: the four-step remediation checklist
 *   - ISSUE_ACTIVITY: the three-entry timeline, newest first
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — issue detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/12-issue-detail.html
 */

import type { TranslationKey } from '@/i18n';

export type IssueAction = { titleKey: TranslationKey; done: boolean };

export type IssueActivity = {
  /** The owner named on the issue record, or a fixed party on the template. */
  who: { fromOwner: true } | { name: string } | { copyKey: TranslationKey };
  actionKey: TranslationKey;
  /** The Audit source gets an earlier timestamp; dc.html:5284 branches on it. */
  timeKey: TranslationKey | { audit: TranslationKey; other: TranslationKey };
  dot: string;
};

/** dc.html:5276-5281 — four steps, the first two complete. */
export const ISSUE_ACTIONS: IssueAction[] = [
  { titleKey: 'issueDetail.action.rca', done: true },
  { titleKey: 'issueDetail.action.plan', done: true },
  { titleKey: 'issueDetail.action.implement', done: false },
  { titleKey: 'issueDetail.action.validate', done: false },
];

/** dc.html:5282-5286 — newest first, so the connector reads downwards in time. */
export const ISSUE_ACTIVITY: IssueActivity[] = [
  {
    who: { fromOwner: true },
    actionKey: 'issueDetail.activity.updated',
    timeKey: 'issueDetail.activity.timeUpdated',
    dot: 'var(--primary)',
  },
  {
    who: { copyKey: 'issueDetail.activity.internalAudit' },
    actionKey: 'issueDetail.activity.raised',
    timeKey: {
      audit: 'issueDetail.activity.timeRaisedAudit',
      other: 'issueDetail.activity.timeRaisedOther',
    },
    dot: 'var(--rag-n)',
  },
  {
    // A person, so it stays a literal — the same treatment the shell gives
    // 'Mei Lin Tan' (AppShell.tsx:1093). Names are not translated.
    who: { name: 'M. Tan' },
    actionKey: 'issueDetail.activity.assigned',
    timeKey: 'issueDetail.activity.timeAssigned',
    dot: 'var(--rag-n)',
  },
];

/** dc.html:5273 — the prototype's fixed raised-on date for every issue. */
export const ISSUE_RAISED_DATE = '2026-06-18';
