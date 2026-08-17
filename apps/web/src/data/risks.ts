/**
 * File: apps/web/src/data/risks.ts
 * Purpose: Sample risk register entries with inherent score, treatment status, and controls.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with edits. Exports `risks`,
 *   10 rows, covering id, title, entity, category, imp, lik, inh, controls, status,
 *   owner, role, and updated. `entity` and matching `owner`/`role` were changed from
 *   country/name to OpCo code/person, and 3 titles were replaced with infosec ones.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/risks.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const risks = [
    { id:'RSK-1042', title:'Unpatched externally-facing systems', entity:'RKR', category:'Cyber & InfoSec', imp:5, lik:4, inh:25, controls:6, status:'Treatment', owner:'H. Park', role:'Head of IT Security', updated:'2 days ago' },
    { id:'RSK-1310', title:'DR failover not tested in FY26', entity:'RMY', category:'Business Continuity', imp:5, lik:4, inh:20, controls:2, status:'Open', owner:'R. Abdullah', role:'IT Operations Lead', updated:'4 days ago' },
    { id:'RSK-0987', title:'Cross-border personal data transfer', entity:'RTW', category:'Data Privacy', imp:4, lik:4, inh:20, controls:4, status:'Treatment', owner:'Y. Chen', role:'Data Protection Officer', updated:'5 days ago' },
    { id:'RSK-1200', title:'Privileged access sprawl', entity:'RMY', category:'Cyber & InfoSec', imp:4, lik:4, inh:20, controls:2, status:'Treatment', owner:'R. Abdullah', role:'IAM Manager', updated:'Yesterday' },
    { id:'RSK-0765', title:'Security event monitoring gaps', entity:'RHK', category:'Cyber & InfoSec', imp:5, lik:3, inh:20, controls:3, status:'Open', owner:'C. Ng', role:'Head of IT Security', updated:'3 days ago' },
    { id:'RSK-0512', title:'Phishing susceptibility above threshold', entity:'RKR', category:'Cyber & InfoSec', imp:3, lik:4, inh:16, controls:5, status:'Monitored', owner:'H. Park', role:'Security Awareness Lead', updated:'1 week ago' },
    { id:'RSK-1120', title:'Cloud provider concentration', entity:'RSG', category:'Third-party', imp:4, lik:3, inh:16, controls:5, status:'Monitored', owner:'J. Lim', role:'Vendor Risk Manager', updated:'1 week ago' },
    { id:'RSK-0430', title:'Live service outside the certified scope', entity:'RTW', category:'Regulatory', imp:5, lik:2, inh:15, controls:4, status:'Accepted', owner:'Y. Chen', role:'ISMS Manager', updated:'3 weeks ago' },
    { id:'RSK-0640', title:'Backup restore verification not performed', entity:'RAU', category:'Business Continuity', imp:3, lik:3, inh:12, controls:4, status:'Monitored', owner:'S. Nguyen', role:'IT Operations Lead', updated:'2 weeks ago' },
    { id:'RSK-1155', title:'Contractor offboarding delays', entity:'RHK', category:'Operational', imp:3, lik:3, inh:12, controls:3, status:'Monitored', owner:'C. Ng', role:'HR Operations', updated:'6 days ago' },
  ];
