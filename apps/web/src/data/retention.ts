/**
 * File: apps/web/src/data/retention.ts
 * Purpose: Sample records-retention schedule by document class, including legal-hold status.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `retention`, 6 rows,
 *   covering cls, keep, basis, hold, and disp.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/retention.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const retention = [
    { cls:'Security incident records', keep:'3 years after closure', basis:'ISO 27001 A.5.28 · Group records policy', hold:'2 under legal hold', disp:'Reviewed annually' },
    { cls:'Risk Management Report & SoA', keep:'3 years per version', basis:'RM procedure §12', hold:'—', disp:'Superseded versions archived' },
    { cls:'ISMS profile versions', keep:'3 years per version', basis:'Controlled document register', hold:'—', disp:'Archived, not deleted' },
    { cls:'Audit issues & evidence', keep:'6 years', basis:'Certification body requirement', hold:'1 under legal hold', disp:'Manual approval to dispose' },
    { cls:'External party assessments', keep:'Contract term + 2 years', basis:'A.5.19–A.5.22', hold:'—', disp:'Reviewed at contract exit' },
    { cls:'Platform audit log', keep:'7 years', basis:'Append-only · SHA-256 chained', hold:'—', disp:'Immutable — no disposal' },
  ];
