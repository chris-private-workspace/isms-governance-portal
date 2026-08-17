/**
 * File: apps/web/src/data/knowledgeSources.ts
 * Purpose: Sample connector status list for the AI assistant's ingested knowledge sources.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with one edit. Exports
 *   `knowledgeSources`, 8 rows, covering name, meta, count, status, and ok. The
 *   'APAC ISMS profiles' row's OpCo count was trimmed from 14 to 13 (`meta`, `count`).
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/knowledgeSources.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const knowledgeSources = [
    { name:'Policies & procedures', meta:'87 documents · SharePoint', count:'87', status:'Synced 12m ago', ok:true },
    { name:'Risk Management Report', meta:'6 asset-class worksheets · v2025.7', count:'214', status:'Synced 12m ago', ok:true },
    { name:'Control library & test evidence', meta:'Control library', count:'186', status:'Synced 12m ago', ok:true },
    { name:'Security incident records', meta:'FY24–FY26', count:'341', status:'Synced 4m ago', ok:true },
    { name:'External party assessments', meta:'Supplier register', count:'24', status:'Synced 1h ago', ok:true },
    { name:'APAC ISMS profiles', meta:'13 OpCos · approved catalogue', count:'13', status:'Synced 1h ago', ok:true },
    { name:'ISO/IEC 27001:2022 & 27017', meta:'Annex A reference corpus', count:'93', status:'Static', ok:true },
    { name:'Contract repository', meta:'Legal — restricted', count:'—', status:'Not connected', ok:false },
  ];
