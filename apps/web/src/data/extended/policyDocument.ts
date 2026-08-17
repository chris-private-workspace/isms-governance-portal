/**
 * File: apps/web/src/data/extended/policyDocument.ts
 * Purpose: Structure of the 4-page policy facsimile the document viewer renders.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. Everything in that directory is a
 *   verbatim copy of a file the handoff ships under `data/`, so a diff against
 *   the deliverable is meaningful there. This directory holds collections the
 *   deliverable's `data/` folder does NOT export, and the distinction has to
 *   survive — so provenance is stated per file rather than assumed.
 *
 *   PROVENANCE — transcribed, not invented. `pv.outline` and `pv.page` are
 *   produced by the prototype's own logic class, which lives inside the design
 *   source rather than in the handoff's data folder:
 *     design/ISMS Governance Platform.dc.html:4386-4419  (pdfPages)
 *     design/ISMS Governance Platform.dc.html:4767-4784  (pv, outline)
 *   The page composition below — four pages, which blocks each carries, and
 *   their order — is that function's shape, unchanged.
 *
 *   WHAT IS NOT HERE: the words. Every sentence in the facsimile is copy, and
 *   copy lives in the i18n dictionaries (port rule 5). This file therefore
 *   holds only TranslationKeys, which also means a key deleted from the
 *   dictionary breaks the build instead of rendering a blank page.
 *
 *   Cover values are split by origin on purpose: four come from the policy
 *   record and four are authored constants on the document template. Modelling
 *   that difference keeps the record fields tracking the fixture when it moves.
 *
 * Key Components:
 *   - POLICY_PAGES: the four pages, cover first
 *   - COVER_LINES: the cover's eight metadata rows and where each value comes from
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — policy detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/10-policy-detail.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/document-viewer.md
 */

import type { TranslationKey } from '@/i18n';

/** Which field of the policy record fills a cover row. */
export type PolicyField = 'id' | 'version' | 'owner' | 'nextReview';

export type CoverLine = {
  labelKey: TranslationKey;
  /** Either a live field of the record, or a constant printed on every copy. */
  value: { field: PolicyField } | { copyKey: TranslationKey };
};

export type PolicyPage =
  | { no: number; kind: 'cover' }
  | {
      no: number;
      kind: 'body';
      titleKey: TranslationKey;
      paraKeys: TranslationKey[];
      /** Second heading part-way down the page; null when the page has one section. */
      headKey: TranslationKey | null;
      numberedKeys: TranslationKey[];
      bulletKeys: TranslationKey[];
    };

/** dc.html:4389-4392 — the cover's metadata table, in the order printed. */
export const COVER_LINES: CoverLine[] = [
  { labelKey: 'policyDetail.doc.cover.docNumber', value: { field: 'id' } },
  { labelKey: 'policyDetail.doc.cover.version', value: { field: 'version' } },
  {
    labelKey: 'policyDetail.doc.cover.classification',
    value: { copyKey: 'policyDetail.doc.cover.classificationValue' },
  },
  { labelKey: 'policyDetail.doc.cover.owner', value: { field: 'owner' } },
  {
    labelKey: 'policyDetail.doc.cover.approvedBy',
    value: { copyKey: 'policyDetail.doc.cover.approvedByValue' },
  },
  {
    labelKey: 'policyDetail.doc.cover.effective',
    value: { copyKey: 'policyDetail.doc.cover.effectiveValue' },
  },
  { labelKey: 'policyDetail.doc.cover.nextReview', value: { field: 'nextReview' } },
  {
    labelKey: 'policyDetail.doc.cover.appliesTo',
    value: { copyKey: 'policyDetail.doc.cover.appliesToValue' },
  },
];

/**
 * dc.html:4388-4418 — four pages for every policy in the library.
 *
 * The same four for every record, because the prototype generated them from
 * the record rather than storing a real document per policy. Carried across
 * as-is: the screen's own point is that the ATTACHED FILE is authoritative and
 * the preview is a rendering, which the toolbar and the footer strip both say.
 */
export const POLICY_PAGES: PolicyPage[] = [
  { no: 1, kind: 'cover' },
  {
    no: 2,
    kind: 'body',
    titleKey: 'policyDetail.doc.p2.title',
    paraKeys: [
      'policyDetail.doc.p2.para1',
      'policyDetail.doc.p2.para2',
      'policyDetail.doc.p2.para3',
    ],
    headKey: 'policyDetail.doc.p2.head',
    numberedKeys: [],
    bulletKeys: [
      'policyDetail.doc.p2.b1',
      'policyDetail.doc.p2.b2',
      'policyDetail.doc.p2.b3',
      'policyDetail.doc.p2.b4',
    ],
  },
  {
    no: 3,
    kind: 'body',
    titleKey: 'policyDetail.doc.p3.title',
    paraKeys: ['policyDetail.doc.p3.para1'],
    headKey: null,
    numberedKeys: [
      'policyDetail.doc.p3.n1',
      'policyDetail.doc.p3.n2',
      'policyDetail.doc.p3.n3',
      'policyDetail.doc.p3.n4',
      'policyDetail.doc.p3.n5',
      'policyDetail.doc.p3.n6',
    ],
    bulletKeys: [],
  },
  {
    no: 4,
    kind: 'body',
    titleKey: 'policyDetail.doc.p4.title',
    paraKeys: ['policyDetail.doc.p4.para1', 'policyDetail.doc.p4.para2'],
    headKey: 'policyDetail.doc.p4.head',
    numberedKeys: [],
    bulletKeys: [
      'policyDetail.doc.p4.b1',
      'policyDetail.doc.p4.b2',
      'policyDetail.doc.p4.b3',
    ],
  },
];

/** dc.html:4422 — the viewer clamps zoom here, and steps by 10, not 20. */
export const ZOOM = { min: 70, max: 160, step: 10, initial: 100 } as const;
