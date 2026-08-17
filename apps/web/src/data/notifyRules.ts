/**
 * File: apps/web/src/data/notifyRules.ts
 * Purpose: Sample notification routing rules mapping trigger events to recipients and SLA.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `notifyRules`, 8 rows,
 *   covering ev, to, ch, sla, and on — the routing rules from trigger event to
 *   recipients, channel, and SLA.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/notifyRules.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const notifyRules = [
    { ev:'S1 incident submitted', to:'Group CISO, Regional ISO, OpCo president, Regional MD', ch:'Email + Teams + SMS', sla:'Immediate', on:true },
    { ev:'S2 incident submitted', to:'Regional ISO, OpCo ISO, BU head', ch:'Email + Teams', sla:'Immediate', on:true },
    { ev:'Audit issue overdue', to:'Issue owner, OpCo ISO, Internal Audit', ch:'Email', sla:'Daily digest', on:true },
    { ev:'Major audit finding raised', to:'Regional ISO, OpCo president', ch:'Email + Teams', sla:'Within 4 hours', on:true },
    { ev:'ISMS profile saved as new version', to:'Regional ISO', ch:'Email', sla:'Daily digest', on:true },
    { ev:'Supplier re-assessment due in 30 days', to:'Assessment owner, Procurement', ch:'Email', sla:'Weekly digest', on:true },
    { ev:'Control test overdue', to:'Control owner, Regional ISO', ch:'Email', sla:'Weekly digest', on:true },
    { ev:'Certificate expiring in 90 days', to:'OpCo ISO, Regional ISO', ch:'Email', sla:'Monthly', on:false },
  ];
