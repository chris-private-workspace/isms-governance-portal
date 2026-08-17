/**
 * File: apps/web/src/data/controls.ts
 * Purpose: Sample control-library entries with test frequency, last result, and coverage.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with edits. Exports `controls`,
 *   10 rows, covering id, name, type, freq, entity, lastTest, result, and cov. The
 *   `entity` field was changed from a country name to an OpCo code on every row, and
 *   3 titles (CTL-2088, CTL-2012, CTL-2360) were replaced with infosec equivalents.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/controls.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const controls = [
    { id:'CTL-2201', name:'MFA on all administrator accounts', type:'Preventive', freq:'Continuous', entity:'RKR', lastTest:'2026-05-12', result:'Effective', cov:96 },
    { id:'CTL-2140', name:'Quarterly access recertification', type:'Detective', freq:'Quarterly', entity:'RSG', lastTest:'2026-06-30', result:'Effective', cov:100 },
    { id:'CTL-2255', name:'Data transfer DPA review', type:'Preventive', freq:'Per event', entity:'RTW', lastTest:'2026-04-18', result:'Partial', cov:78 },
    { id:'CTL-2088', name:'Security alert triage SLA', type:'Detective', freq:'Daily', entity:'RHK', lastTest:'2026-06-25', result:'Partial', cov:82 },
    { id:'CTL-2300', name:'Privileged session recording', type:'Detective', freq:'Continuous', entity:'RMY', lastTest:'2026-03-09', result:'Ineffective', cov:61 },
    { id:'CTL-2012', name:'Monthly log review sign-off', type:'Detective', freq:'Monthly', entity:'RAU', lastTest:'2026-06-05', result:'Effective', cov:94 },
    { id:'CTL-2410', name:'Annual DR test', type:'Corrective', freq:'Annual', entity:'RMY', lastTest:'2025-08-22', result:'Ineffective', cov:40 },
    { id:'CTL-2150', name:'Phishing simulation program', type:'Preventive', freq:'Monthly', entity:'RKR', lastTest:'2026-06-14', result:'Effective', cov:90 },
    { id:'CTL-2199', name:'Joiner-mover-leaver workflow', type:'Preventive', freq:'Per event', entity:'RHK', lastTest:'2026-05-28', result:'Partial', cov:74 },
    { id:'CTL-2360', name:'Anti-malware signature auto-update', type:'Preventive', freq:'Daily', entity:'RTW', lastTest:'2026-06-30', result:'Effective', cov:99 },
  ];
