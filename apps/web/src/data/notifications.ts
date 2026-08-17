/**
 * File: apps/web/src/data/notifications.ts
 * Purpose: Sample in-app notification feed items with severity and relative timestamp.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with edits. Exports
 *   `notifications`, 6 rows, covering sev, title, meta, and time. 4 rows were
 *   re-pointed from country names to in-scope OpCo codes, and 1 title was replaced
 *   with an information-security equivalent.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/notifications.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const notifications = [
    { sev:'R', title:'RMY DR test overdue', meta:'RSK-1310 · Business Continuity', time:'12m ago' },
    { sev:'R', title:'Cross-border transfer executed without DPA', meta:'ISS-5490 · RTW · past SLA', time:'1h ago' },
    { sev:'A', title:'Security alerts aging beyond 30-day SLA', meta:'ISS-5388 · RHK', time:'3h ago' },
    { sev:'A', title:'Policy “Data Privacy” due for review', meta:'POL-318 · due 15 Jul', time:'Yesterday' },
    { sev:'G', title:'RAP RCSA cycle completed', meta:'98% · Q3 FY26', time:'Yesterday' },
    { sev:'N', title:'H. Park requested control sign-off', meta:'CTL-2201 · MFA', time:'2 days ago' },
  ];
