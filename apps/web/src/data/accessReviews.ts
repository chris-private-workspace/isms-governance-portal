/**
 * File: apps/web/src/data/accessReviews.ts
 * Purpose: Sample access-recertification campaigns tracked to completion by due date.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with one edit. Exports
 *   `accessReviews`, 3 rows, covering camp, scope, due, done, total, and owner. The
 *   'OpCo administrator recertification' row's OpCo count was trimmed from 14 to 13
 *   to match the 13 in-scope OpCos (`scope` and `total`).
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/accessReviews.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const accessReviews = [
    { camp:'H2 FY26 privileged access review', scope:'Platform admin & Regional ISO', due:'2026-09-30', done:62, total:74, owner:'A. Kumar' },
    { camp:'OpCo administrator recertification', scope:'13 OpCos · profile editors', due:'2026-09-15', done:11, total:13, owner:'W. Cheung' },
    { camp:'Read-only & auditor accounts', scope:'External parties', due:'2026-08-31', done:5, total:9, owner:'A. Kumar' },
  ];
