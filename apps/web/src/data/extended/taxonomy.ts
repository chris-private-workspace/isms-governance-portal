/**
 * File: apps/web/src/data/extended/taxonomy.ts
 * Purpose: The seven risk categories and their sub-categories, for Admin.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:5111-5118  (taxonomy)
 *   Seven categories with their `n` risk counts and sub-category chips, in the
 *   prototype's order.
 *
 *   THE CATEGORY NAMES ARE NOT TRANSLATED, and that is a consistency decision
 *   rather than an omission. The same vocabulary is already the `category` field
 *   of data/risks.ts and already renders untranslated in the risk register's
 *   table and category filter. Translating it here alone would put 'Cyber &
 *   InfoSec' on one screen and a zh-Hant rendering of it on another, for the
 *   same taxonomy — worse than leaving both in the source language until the
 *   vocabulary is settled as a whole.
 *
 *   `n` IS CARRIED AS TRANSCRIBED and is NOT a count of data/risks.ts. The two
 *   answer different questions: `n` is how many risks the category holds across
 *   the region, while risks.ts is a twelve-row sample of the register. Counting
 *   the sample would print 2 next to 'Cyber & InfoSec' and quietly redefine what
 *   the number means. Port rule 10 governs counts the screen states ABOUT the
 *   data it renders; this is a value IN the data.
 *
 * Key Components:
 *   - TAXONOMY: the seven categories, in the design's order
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin taxonomy panel
 *
 * Related:
 *   - apps/web/src/data/risks.ts — carries the same `category` vocabulary
 */

export type TaxonomyCategory = {
  cat: string;
  /** Risks held region-wide. Transcribed — not a count of the risks fixture. */
  n: number;
  subs: string[];
};

/** dc.html:5111-5118, verbatim. */
export const TAXONOMY: TaxonomyCategory[] = [
  {
    cat: 'Cyber & InfoSec',
    n: 19,
    subs: ['Vulnerability & patch', 'Identity & access', 'Network security', 'Endpoint & malware'],
  },
  {
    cat: 'Data Privacy',
    n: 12,
    subs: [
      'Cross-border transfer',
      'Consent & data rights',
      'Retention & disposal',
      'Processor management',
    ],
  },
  {
    cat: 'Third-party',
    n: 11,
    subs: [
      'Concentration',
      'Onboarding due diligence',
      'Ongoing monitoring',
      'Exit & continuity',
    ],
  },
  {
    cat: 'Business Continuity',
    n: 8,
    subs: ['DR & failover', 'Backup integrity', 'Crisis management'],
  },
  {
    cat: 'Operational',
    n: 9,
    subs: ['Joiner-mover-leaver', 'Change management', 'Process error'],
  },
  {
    cat: 'Regulatory',
    n: 7,
    subs: ['Monitoring & reporting', 'Licensing', 'Regulatory change'],
  },
  { cat: 'Financial', n: 5, subs: ['Reconciliation', 'Reporting integrity'] },
];
