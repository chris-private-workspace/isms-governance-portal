/**
 * File: apps/web/src/data/suppliers.ts
 * Purpose: Sample external-party risk assessment register entries with adequacy ratings.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `suppliers`, 8 rows,
 *   covering ref, date, party, asset, access, cls, dur, people, reason, adequate,
 *   tpAdequate, newCtl, by, opco, review, and status.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/suppliers.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const suppliers = [
    { ref:'EPR-024', date:'2026-06-18', party:'Fortalis Security Advisory', asset:'ISMS documents and system settings', access:'Physical, Logical, Onsite', cls:'Confidential', dur:'On demand', people:'Onsite consultants (3)', reason:'ISMS consultancy and internal audit support', adequate:'Yes', tpAdequate:'Yes', newCtl:'No', by:'RISO', opco:'RAPO', review:'2027-06-18', status:'Approved' },
    { ref:'EPR-023', date:'2026-05-30', party:'Microsoft — Azure (CSP)', asset:'Cloud platform settings and logs', access:'Logical', cls:'Confidential', dur:'Realtime', people:'Vendor support staff', reason:'Azure platform and support services', adequate:'Yes', tpAdequate:'Yes', newCtl:'No', by:'RISO', opco:'RAP', review:'2027-05-30', status:'Approved' },
    { ref:'EPR-022', date:'2026-05-12', party:'NexGen NOC Services', asset:'Network device configuration and logs', access:'Logical, Offsite', cls:'Confidential', dur:'Realtime', people:'Regional NOC engineers', reason:'24×7 network operations centre', adequate:'Partial', tpAdequate:'Yes', newCtl:'Yes', by:'RISO', opco:'RAPO', review:'2026-11-12', status:'Conditional' },
    { ref:'EPR-021', date:'2026-04-22', party:'CrowdStrike — Falcon MDR', asset:'Endpoint telemetry and detections', access:'Logical', cls:'Confidential', dur:'Realtime', people:'MDR analysts', reason:'Managed detection and response', adequate:'Yes', tpAdequate:'Yes', newCtl:'No', by:'RISO', opco:'RAP', review:'2027-04-22', status:'Approved' },
    { ref:'EPR-020', date:'2026-03-09', party:'Iron Vault Document Destruction', asset:'Retired media and paper records', access:'Physical, Onsite', cls:'Restricted', dur:'Monthly', people:'Collection crew', reason:'Secure disposal of media and records', adequate:'Partial', tpAdequate:'Partial', newCtl:'Yes', by:'Local ISO', opco:'RSG', review:'2026-09-09', status:'Under review' },
    { ref:'EPR-019', date:'2026-02-14', party:'Sentra Firewall Support', asset:'Firewall configurations', access:'Offsite, Logical', cls:'Confidential', dur:'Realtime', people:'Vendor support staff', reason:'Perimeter firewall maintenance', adequate:'Yes', tpAdequate:'Yes', newCtl:'No', by:'RISO', opco:'RAPO', review:'2027-02-14', status:'Approved' },
    { ref:'EPR-018', date:'2025-12-03', party:'Meridian Logistics', asset:'Devices in transit, delivery manifests', access:'Physical', cls:'Internal', dur:'Daily', people:'Drivers and warehouse staff', reason:'Device delivery and reverse logistics', adequate:'Partial', tpAdequate:'No', newCtl:'Yes', by:'Local ISO', opco:'RMY', review:'2026-08-03', status:'Remediation' },
    { ref:'EPR-017', date:'2025-10-21', party:'Talentbridge Training', asset:'Staff training records', access:'Logical', cls:'Confidential', dur:'On demand', people:'RISO team accounts', reason:'Security awareness training platform', adequate:'Yes', tpAdequate:'Yes', newCtl:'No', by:'RISO', opco:'RAP', review:'2026-10-21', status:'Approved' },
  ];
