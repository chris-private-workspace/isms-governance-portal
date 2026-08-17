/**
 * File: apps/web/src/data/reportLibrary.ts
 * Purpose: Sample scheduled/manual report definitions with audience, frequency, and format.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `reportLibrary`,
 *   7 rows, covering name, aud, freq, next, fmt, owner, and status.
 *
 *   DEMO fixture. Screens consuming it must render the demo marker; unlabelled
 *   fixture data presented as real is an anti-pattern in this project.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — copied from the design handoff
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/reportLibrary.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const reportLibrary = [
    { name:'ISMS management review pack', aud:'Information Security Committee', freq:'Quarterly', next:'2026-09-30', fmt:'PDF + PPTX', owner:'Regional ISO', status:'Scheduled' },
    { name:'Regional risk & control posture', aud:'Regional Managing Director', freq:'Monthly', next:'2026-09-01', fmt:'PDF', owner:'Regional ISO', status:'Scheduled' },
    { name:'Incident summary & SLA performance', aud:'OpCo presidents', freq:'Monthly', next:'2026-09-05', fmt:'PDF', owner:'SOC', status:'Scheduled' },
    { name:'Audit issue status by OpCo', aud:'Internal Audit', freq:'Fortnightly', next:'2026-08-18', fmt:'XLSX', owner:'Internal Audit', status:'Scheduled' },
    { name:'Supplier assessment due list', aud:'Procurement', freq:'Monthly', next:'2026-09-01', fmt:'XLSX', owner:'Procurement', status:'Scheduled' },
    { name:'Statement of Applicability export', aud:'Certification body', freq:'On demand', next:'—', fmt:'PDF', owner:'Regional ISO', status:'Manual' },
    { name:'OS portfolio security posture', aud:'OS business heads', freq:'Quarterly', next:'2026-10-01', fmt:'PDF', owner:'OS Portfolio Lead', status:'Draft' },
  ];
