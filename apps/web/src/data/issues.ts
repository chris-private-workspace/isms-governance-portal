/**
 * File: apps/web/src/data/issues.ts
 * Purpose: Sample governance issues tracked by source, severity, owner, and due date.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with edits. Exports `issues`,
 *   10 rows, covering id, title, source, severity, entity, owner, due, and status. The
 *   `entity` and matching `owner` were changed from country/name to OpCo code/person
 *   on affected rows, and 3 titles (ISS-5680, ISS-5388, ISS-5301) were replaced.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/issues.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const issues = [
    { id:'ISS-5490', title:'Cross-border transfer executed without DPA', source:'Regulatory', severity:'Critical', entity:'RTW', owner:'Y. Chen', due:'2026-07-08', status:'Overdue' },
    { id:'ISS-5610', title:'DR test not performed in FY26', source:'Self-identified', severity:'Critical', entity:'RMY', owner:'R. Abdullah', due:'2026-07-31', status:'Open' },
    { id:'ISS-5521', title:'MFA not enforced on 3 legacy admin accounts', source:'Audit', severity:'High', entity:'RKR', owner:'H. Park', due:'2026-07-15', status:'In progress' },
    { id:'ISS-5388', title:'Security alerts aging beyond 30-day SLA', source:'Audit', severity:'High', entity:'RHK', owner:'C. Ng', due:'2026-07-20', status:'In progress' },
    { id:'ISS-5555', title:'Privileged sessions not recorded', source:'Incident', severity:'High', entity:'RMY', owner:'R. Abdullah', due:'2026-08-05', status:'Open' },
    { id:'ISS-5680', title:'Service in production outside certified scope', source:'Regulatory', severity:'High', entity:'RTW', owner:'Y. Chen', due:'2026-07-18', status:'In progress' },
    { id:'ISS-5301', title:'Backup restore evidence missing (May)', source:'Self-identified', severity:'Medium', entity:'RAU', owner:'S. Nguyen', due:'2026-07-25', status:'In progress' },
    { id:'ISS-5720', title:'Contractor access active 14 days post-exit', source:'Audit', severity:'Medium', entity:'RHK', owner:'C. Ng', due:'2026-08-12', status:'Open' },
    { id:'ISS-5150', title:'BCP policy attestation below 90%', source:'Self-identified', severity:'Low', entity:'RMY', owner:'R. Abdullah', due:'2026-08-20', status:'Open' },
    { id:'ISS-5210', title:'Phishing click-rate above 8% threshold', source:'Self-identified', severity:'Medium', entity:'RKR', owner:'H. Park', due:'2026-08-01', status:'Closed' },
  ];
