/**
 * File: apps/web/src/data/extended/auditFinding.ts
 * Purpose: The lifecycle, tabs, action steps and evidence set of one audit finding.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and stays diffable against it; this one
 *   is not, so provenance is stated per collection.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4336-4344  (steps, tabs)
 *     design/ISMS Governance Platform.dc.html:4345-4352  (the five action steps)
 *     design/ISMS Governance Platform.dc.html:4353-4356  (the two evidence files)
 *     design/ISMS Governance Platform.dc.html:4357-4361  (the history entries)
 *   `auditIssues.ts` carries the finding — grade, clause, CAP text, owner, dates
 *   and a one-line `ev` summary — but not the itemised steps, the evidence files
 *   or the history. The prototype generated all three from the record, and the
 *   same five steps and two files attach to every finding.
 *
 *   THE STEPS ARE NOT STORED AS DONE / NOT DONE. Each one records the condition
 *   under which it is complete, because the prototype derives completion from
 *   the finding's position in the lifecycle (dc.html:4345-4350) rather than
 *   storing it. Keeping the condition rather than a boolean is what lets a
 *   Closed finding and an Overdue one show different checklists from one table.
 *
 *   `who` AND `due` ARE REFERENCES, NOT VALUES, for the same reason: three of
 *   the five steps belong to the finding's own owner and two to a fixed party,
 *   and the dates are the finding's `raised` and `due`. Writing them out would
 *   have invented five owners and ten dates per finding.
 *
 * Key Components:
 *   - AUDIT_STEPS / AUDIT_TABS: the five-stage lifecycle and the four tabs
 *   - AUDIT_ACTIONS: the corrective-action checklist and when each step closes
 *   - AUDIT_EVIDENCE: the two files a submitted CAP produces
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — audit issue detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/26-audit-issue-detail.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/data-display.md — LifecycleStepper
 */

import type { TranslationKey } from '@/i18n';

/**
 * dc.html:4336 — five stages, matched against the finding's English status.
 *
 * `status` sits beside the label key because `auditIssues.ts` stores the status
 * in English and dc.html:4337 locates the current stage with indexOf over
 * exactly these strings.
 */
export const AUDIT_STEPS: { status: string; labelKey: TranslationKey }[] = [
  { status: 'Raised', labelKey: 'auditDetail.step.raised' },
  { status: 'CAP submitted', labelKey: 'auditDetail.step.capSubmitted' },
  { status: 'CAP in progress', labelKey: 'auditDetail.step.capInProgress' },
  { status: 'Verification', labelKey: 'auditDetail.step.verification' },
  { status: 'Closed', labelKey: 'auditDetail.step.closed' },
];

export type AuditTabId = 'finding' | 'actions' | 'evidence' | 'history';

/** dc.html:4341 — the four tabs, in order. */
export const AUDIT_TABS: { id: AuditTabId; labelKey: TranslationKey }[] = [
  { id: 'finding', labelKey: 'auditDetail.tab.finding' },
  { id: 'actions', labelKey: 'auditDetail.tab.actions' },
  { id: 'evidence', labelKey: 'auditDetail.tab.evidence' },
  { id: 'history', labelKey: 'auditDetail.tab.history' },
];

export type AuditActionStep = {
  taskKey: TranslationKey;
  /** 'owner' is the finding's own owner; the other two are fixed parties. */
  who: 'owner' | 'regionalIso' | 'auditor';
  /** Which of the finding's two dates this step is measured against. */
  due: 'raised' | 'due';
  /** Complete always, once the lifecycle reaches a stage, or only on closure. */
  doneWhen: { always: true } | { minStage: number } | { closed: true };
};

/** dc.html:4345-4350 — the checklist, and the rule that closes each line. */
export const AUDIT_ACTIONS: AuditActionStep[] = [
  {
    taskKey: 'auditDetail.action.rootCause',
    who: 'owner',
    due: 'raised',
    doneWhen: { always: true },
  },
  {
    taskKey: 'auditDetail.action.capAgreed',
    who: 'owner',
    due: 'raised',
    doneWhen: { minStage: 1 },
  },
  {
    taskKey: 'auditDetail.action.implemented',
    who: 'owner',
    due: 'due',
    doneWhen: { minStage: 3 },
  },
  {
    taskKey: 'auditDetail.action.effectiveness',
    who: 'regionalIso',
    due: 'due',
    doneWhen: { minStage: 3 },
  },
  {
    taskKey: 'auditDetail.action.closure',
    who: 'auditor',
    due: 'due',
    doneWhen: { closed: true },
  },
];

export type AuditEvidenceFile = {
  /** Appended to the finding's reference to make the file name. */
  suffix: string;
  kindKey: TranslationKey;
  /** Which of the finding's two dates the upload is stamped with. */
  when: 'raised' | 'due';
  /** The CAP text truncated, or the record's own evidence line. */
  note: 'capExcerpt' | 'ev';
};

/**
 * dc.html:4353-4356 — two files, and only when the finding records evidence.
 *
 * A finding whose `ev` is '—' gets an empty list and the screen's own empty
 * state, which is the fragment's `noEv` branch (26-audit-issue-detail.html:116).
 */
/** @record-claim — evidence files uploaded by a named person for one finding. */
export const AUDIT_EVIDENCE: AuditEvidenceFile[] = [
  {
    suffix: '_CAP_submission.pdf',
    kindKey: 'auditDetail.evidence.kind.cap',
    when: 'raised',
    note: 'capExcerpt',
  },
  {
    suffix: '_evidence_pack.zip',
    kindKey: 'auditDetail.evidence.kind.implementation',
    when: 'due',
    note: 'ev',
  },
];

/** dc.html:4356 — the CAP excerpt is cut at 72 characters and elided. */
export const CAP_EXCERPT_LENGTH = 72;

/** dc.html:4361 — the fixed date the prototype stamps on an escalation. */
export const AUDIT_ESCALATION_DATE = '2026-08-06';
