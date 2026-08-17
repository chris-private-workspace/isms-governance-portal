/**
 * File: apps/web/src/data/rmVersions.ts
 * Purpose: Sample Risk Management Report version history with approver and effective date.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `rmVersions`, 5 rows,
 *   covering ver, by, note, eff, and appr.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/rmVersions.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const rmVersions = [
    { ver:'2025.7', by:'ITSC', note:'Annual review — no change to control set', eff:'2025-07-28', appr:'ISC' },
    { ver:'2024',   by:'ITSC', note:'Adopt Annex A controls of ISO/IEC 27001:2022', eff:'2024-04-30', appr:'ISC' },
    { ver:'1.2',    by:'ITSC', note:'Remove external NOC and SOC; add Regional Operation Centre', eff:'2023-10-16', appr:'ISC' },
    { ver:'1.1',    by:'ITSC', note:'Add cloud-specific controls from ISO/IEC 27017:2015', eff:'2022-05-30', appr:'ISC' },
    { ver:'1.0',    by:'ITSC', note:'Initial release', eff:'2021-08-16', appr:'ISC' },
  ];
