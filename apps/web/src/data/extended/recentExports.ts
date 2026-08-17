/**
 * File: apps/web/src/data/extended/recentExports.ts
 * Purpose: The last three exports, with the classification of what left.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4223-4226  (recentExports)
 *   Three rows, verbatim. `recentExports` sits on the logic class beside the
 *   collections the handoff's `data/` folder did export, which is why it is
 *   missing from data/ and present here.
 *
 *   The filenames are the point of the panel, not decoration: the card's own
 *   subtitle is that every export is logged WITH THE CLASSIFICATION OF THE DATA
 *   IT CONTAINS, so file, actor, size and class are the record. They render as
 *   written, like every other fixture record in this port.
 *
 * Key Components:
 *   - RECENT_EXPORTS: three rows, newest first
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin reporting panel
 *
 * Related:
 *   - apps/web/src/data/reportLibrary.ts — the panel this sits beneath
 */

export type RecentExport = {
  file: string;
  by: string;
  when: string;
  size: string;
  /** Handling classification of the exported content. */
  cls: string;
};

/** dc.html:4223-4226, verbatim. */
export const RECENT_EXPORTS: RecentExport[] = [
  {
    file: 'ISMS_Management_Review_Q2FY26.pdf',
    by: 'A. Kumar',
    when: '2026-07-30 16:02',
    size: '4.2 MB',
    cls: 'Restricted',
  },
  {
    file: 'Audit_Issues_RAPO_2026-07.xlsx',
    by: 'Internal Audit',
    when: '2026-07-28 09:14',
    size: '318 KB',
    cls: 'Internal',
  },
  {
    file: 'Risk_Management_Report_v2025.7.xlsx',
    by: 'W. Cheung',
    when: '2026-07-21 11:47',
    size: '1.1 MB',
    cls: 'Restricted',
  },
];
