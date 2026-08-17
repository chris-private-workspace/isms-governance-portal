/**
 * File: apps/web/src/data/extended/supplierAssessment.ts
 * Purpose: The three assessment lists a supplier detail shows beside the record.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and stays diffable against it; this one
 *   is not, so provenance is stated per file.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4650-4652  (sd.risks / controls / tpControls)
 *     design/ISMS Governance Platform.dc.html:4643-4644  (the menus they are drawn from)
 *   `suppliers.ts` carries the assessment RECORD — adequacy ratings, dates,
 *   decision inputs — but not the itemised lists, and neither does the
 *   handoff's `data/suppliers.js`. The prototype attached the same three lists
 *   to every assessment, drawn from its `commonRisks` / `commonControls`
 *   menus; that is carried across unchanged.
 *
 *   THREE COLLECTIONS IN ONE FILE, deliberately. They are three columns of one
 *   card row, always rendered together, and each is four items long; three
 *   modules whose bodies are shorter than their headers would obscure rather
 *   than clarify where the data comes from.
 *
 *   Only keys are held here — the wording is copy and lives in the i18n
 *   dictionaries (port rule 5), which also makes a deleted key a build error.
 *
 * Key Components:
 *   - SUPPLIER_RISK_KEYS: risks of providing the access requested
 *   - SUPPLIER_CONTROL_KEYS: Ricoh-side controls already in place
 *   - SUPPLIER_TP_CONTROL_KEYS: controls the external party is relied on for
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — supplier detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/21-supplier-detail.html
 */

import type { TranslationKey } from '@/i18n';

/** dc.html:4650 — four of the five entries on the prototype's risk menu. */
export const SUPPLIER_RISK_KEYS: TranslationKey[] = [
  'supplierDetail.risk.theft',
  'supplierDetail.risk.disclosure',
  'supplierDetail.risk.physical',
  'supplierDetail.risk.logical',
];

/** dc.html:4651 — the first four entries on the prototype's control menu. */
export const SUPPLIER_CONTROL_KEYS: TranslationKey[] = [
  'supplierDetail.control.entry',
  'supplierDetail.control.nac',
  'supplierDetail.control.logging',
  'supplierDetail.control.monitoring',
];

/** dc.html:4652 — the external party's own obligations, three of them. */
export const SUPPLIER_TP_CONTROL_KEYS: TranslationKey[] = [
  'supplierDetail.tpControl.assessment',
  'supplierDetail.tpControl.nda',
  'supplierDetail.tpControl.review',
];
