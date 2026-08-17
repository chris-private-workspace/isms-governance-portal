/**
 * File: apps/web/src/data/riskRegister.ts
 * Purpose: Sample IT Risk Register entries, each a residual risk at or above threshold 16.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with one edit. Exports
 *   `riskRegister`, 4 rows, covering item, tv, desc, existing, add, who, target,
 *   status, and score. The item-3 `who` owner name was changed from L. Wang to
 *   Y. Chen.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/riskRegister.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const riskRegister = [
    { item:1, tv:'Ransomware / delayed patching of legacy jump host', desc:'Residual exposure on legacy remote-access infrastructure at RMY pending decommission.', existing:'EDR, network segmentation, daily backup with offline copy', add:'Decommission legacy jump host; enforce PAM for all remote administration', who:'R. Abdullah — IT Operations Lead', target:'2026-09-30', status:'In progress', score:16 },
    { item:2, tv:'Improper disposal / MFP disks returned without wipe', desc:'Reverse-logistics workflow allows a batch to bypass the wipe-certificate step.', existing:'Contracted disposal vendor, wipe certificate per device', add:'System-enforced gate: no dispatch without wipe certificate ID', who:'J. Lim — Vendor Risk Manager', target:'2026-08-31', status:'In progress', score:16 },
    { item:3, tv:'Cross-border personal data transfer without DPA', desc:'Transfers executed ahead of the data-processing agreement being countersigned.', existing:'DPA review control (CTL-2255), privacy training', add:'Block transfer at gateway until DPA reference recorded', who:'Y. Chen — Data Protection Officer', target:'2026-10-15', status:'Open', score:20 },
    { item:4, tv:'DR failover not tested in FY26', desc:'Annual DR test overdue for the Malaysia and Indonesia environments.', existing:'Documented DR plan, offsite backup', add:'Execute full failover test and record results in the ISMS evidence store', who:'R. Abdullah — IT Operations Lead', target:'2026-09-15', status:'Open', score:20 },
  ];
