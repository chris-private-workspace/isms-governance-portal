/**
 * File: apps/web/src/data/accessRequests.ts
 * Purpose: Sample access-request tickets pending or resolved by ISO approval.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `accessRequests`, 4 rows,
 *   covering ref, who, opco, ask, reason, raised, appr, and status.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/accessRequests.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const accessRequests = [
    { ref:'AR-2418', who:'T. Nguyen', opco:'RVN', ask:'OpCo admin — ISMS profile', reason:'Preparing Vietnam ISMS profile for certification scope', raised:'2026-08-04', appr:'Regional ISO', status:'Pending' },
    { ref:'AR-2417', who:'P. Srisai', opco:'RTH', ask:'Incident module — create & edit', reason:'Named incident coordinator for Thailand', raised:'2026-08-03', appr:'Regional ISO', status:'Pending' },
    { ref:'AR-2415', who:'External — BSI auditor', opco:'—', ask:'Auditor (read-only) — 14 days', reason:'Surveillance audit evidence review', raised:'2026-08-01', appr:'Platform admin', status:'Approved' },
    { ref:'AR-2411', who:'B. Santoso', opco:'RID', ask:'Supplier assessments — edit', reason:'Local vendor onboarding', raised:'2026-07-28', appr:'Regional ISO', status:'Rejected' },
  ];
