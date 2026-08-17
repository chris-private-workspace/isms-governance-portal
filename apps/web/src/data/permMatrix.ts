/**
 * File: apps/web/src/data/permMatrix.ts
 * Purpose: Sample role-permission matrix mapping each module to a per-role permission array.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `permMatrix`, 11 rows,
 *   covering mod and p — a per-role permission-level array for each module.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/permMatrix.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const permMatrix = [
    { mod:'Dashboards & reporting',      p:['F','F','R','R','R','R'] },
    { mod:'Risk register & assessments', p:['F','F','E','R','—','R'] },
    { mod:'Risk programme (RM report)',  p:['F','A','E','R','—','R'] },
    { mod:'Controls & testing',          p:['F','F','E','E','—','R'] },
    { mod:'Policies',                    p:['F','A','R','R','R','R'] },
    { mod:'Security incidents',          p:['F','F','E','E','C','R'] },
    { mod:'Supplier assessments',        p:['F','F','E','—','—','R'] },
    { mod:'ISMS profiles',               p:['F','E','R','—','R','R'] },
    { mod:'OS portfolio',                p:['F','E','R','—','E','R'] },
    { mod:'Audit issues',                p:['F','F','E','E','—','F'] },
    { mod:'Administration',              p:['F','—','—','—','—','—'] },
  ];
