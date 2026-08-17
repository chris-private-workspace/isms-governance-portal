/**
 * File: apps/web/src/data/opcos.ts
 * Purpose: The 13 in-scope OpCos. DEMO fixture — never a source of truth.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Ported from the design handoff's data/opcos.js with ONE deletion: the
 *   RIN / Ricoh India Ltd row (opcos.js:16). Confirmed parameter #4 excludes
 *   both India and China, and CLAUDE.md parameter #12 says to ignore the
 *   India/DPDP samples in the deliverables outright.
 *
 *   Removing that single row lands exactly on the charter: 13 OpCos across
 *   11 jurisdictions. Singapore and Hong Kong each hold two OpCos, which is
 *   why the flagship dashboard cannot key its roll-up by country — that is
 *   AD-Mockup-2, and it is why data.ts is rebuilt FROM this file rather than
 *   ported from the handoff's data.js.
 *
 *   AD-Mockup-3 is explicit that the India row is DELETED, not swapped for a
 *   China one. No RCN row is added.
 *
 *   Every value here is illustrative. Screens consuming it must render
 *   <DemoBadge/> — an unlabelled fixture is a Potemkin feature (AP-3).
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — 14 -> 13, India row dropped
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/opcos.js
 */

export type Posture = 'G' | 'A' | 'R';

export type OpCo = {
  /** Group-internal OpCo code. Stable identity — the roll-up keys on this. */
  code: string;
  name: string;
  country: string;
  role: string;
  cert: 'Certified' | 'In scope' | 'Not in scope';
  certNo: string;
  body: string;
  issued: string;
  expires: string;
  surv: string;
  /** Operational maturity, 1-10 as scored in the handoff fixture. */
  op: number;
  /** OS-portfolio maturity, 1-10. */
  os: number;
  iso: string;
  review: string;
  posture: Posture;
};

export const opcos: OpCo[] = [
  {
    code: 'RAP',
    name: 'Ricoh Asia Pacific Pte Ltd',
    country: 'Singapore',
    role: 'Regional HQ',
    cert: 'Certified',
    certNo: 'IS 728104',
    body: 'BSI',
    issued: '2023-11-02',
    expires: '2026-11-01',
    surv: '2026-10-12',
    op: 7,
    os: 9,
    iso: 'A. Kumar',
    review: '2026-05-30',
    posture: 'G',
  },
  {
    code: 'RAPO',
    name: 'Ricoh Asia Pacific Operations Ltd',
    country: 'Hong Kong',
    role: 'Supply chain',
    cert: 'Certified',
    certNo: 'IS 703556',
    body: 'BSI',
    issued: '2022-08-16',
    expires: '2026-08-15',
    surv: '2026-07-28',
    op: 8,
    os: 5,
    iso: 'W. Cheung',
    review: '2026-06-18',
    posture: 'A',
  },
  {
    code: 'RHK',
    name: 'Ricoh Hong Kong Ltd',
    country: 'Hong Kong',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 712880',
    body: 'BSI',
    issued: '2024-03-11',
    expires: '2027-03-10',
    surv: '2026-09-04',
    op: 9,
    os: 8,
    iso: 'C. Ng',
    review: '2026-06-02',
    posture: 'G',
  },
  {
    code: 'RSG',
    name: 'Ricoh Singapore Pte Ltd',
    country: 'Singapore',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 690441',
    body: 'BSI',
    issued: '2023-05-22',
    expires: '2026-05-21',
    surv: '2026-08-19',
    op: 8,
    os: 9,
    iso: 'J. Lim',
    review: '2026-04-27',
    posture: 'A',
  },
  {
    code: 'RAU',
    name: 'Ricoh Australia Pty Ltd',
    country: 'Australia',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 655013',
    body: 'BSI',
    issued: '2024-01-30',
    expires: '2027-01-29',
    surv: '2026-11-06',
    op: 9,
    os: 10,
    iso: 'S. Nguyen',
    review: '2026-06-11',
    posture: 'G',
  },
  {
    code: 'RNZ',
    name: 'Ricoh New Zealand Ltd',
    country: 'New Zealand',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 655014',
    body: 'BSI',
    issued: '2024-01-30',
    expires: '2027-01-29',
    surv: '2026-11-06',
    op: 7,
    os: 7,
    iso: 'S. Nguyen',
    review: '2026-06-11',
    posture: 'G',
  },
  {
    code: 'RMY',
    name: 'Ricoh (Malaysia) Sdn Bhd',
    country: 'Malaysia',
    role: 'Sales & service',
    cert: 'In scope',
    certNo: '—',
    body: '—',
    issued: '—',
    expires: '—',
    surv: '2026-09-30',
    op: 6,
    os: 4,
    iso: 'R. Abdullah',
    review: '2026-03-14',
    posture: 'R',
  },
  {
    code: 'RTH',
    name: 'Ricoh (Thailand) Ltd',
    country: 'Thailand',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 733902',
    body: 'BSI',
    issued: '2025-02-18',
    expires: '2028-02-17',
    surv: '2026-08-08',
    op: 7,
    os: 5,
    iso: 'P. Srisai',
    review: '2026-05-19',
    posture: 'A',
  },
  {
    code: 'RKR',
    name: 'Ricoh Korea Co Ltd',
    country: 'Korea',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 719044',
    body: 'BSI',
    issued: '2024-06-04',
    expires: '2027-06-03',
    surv: '2026-10-22',
    op: 8,
    os: 6,
    iso: 'H. Park',
    review: '2026-06-05',
    posture: 'G',
  },
  {
    code: 'RTW',
    name: 'Ricoh Taiwan Ltd',
    country: 'Taiwan',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 721455',
    body: 'BSI',
    issued: '2024-09-13',
    expires: '2027-09-12',
    surv: '2026-09-20',
    op: 7,
    os: 5,
    iso: 'Y. Chen',
    review: '2026-05-08',
    posture: 'A',
  },
  {
    code: 'RID',
    name: 'PT Ricoh Indonesia',
    country: 'Indonesia',
    role: 'Sales & service',
    cert: 'In scope',
    certNo: '—',
    body: '—',
    issued: '—',
    expires: '—',
    surv: '2026-12-01',
    op: 5,
    os: 3,
    iso: 'B. Santoso',
    review: '2026-02-26',
    posture: 'R',
  },
  {
    code: 'RPH',
    name: 'Ricoh Philippines Inc',
    country: 'Philippines',
    role: 'Sales & service',
    cert: 'Certified',
    certNo: 'IS 730118',
    body: 'BSI',
    issued: '2025-01-15',
    expires: '2028-01-14',
    surv: '2026-07-30',
    op: 6,
    os: 4,
    iso: 'M. Reyes',
    review: '2026-04-15',
    posture: 'A',
  },
  {
    code: 'RVN',
    name: 'Ricoh Vietnam Co Ltd',
    country: 'Vietnam',
    role: 'Sales & service',
    cert: 'Not in scope',
    certNo: '—',
    body: '—',
    issued: '—',
    expires: '—',
    surv: '—',
    op: 4,
    os: 2,
    iso: 'T. Nguyen',
    review: '—',
    posture: 'R',
  },
];

/** 11 — Singapore and Hong Kong each hold two OpCos. */
export const jurisdictionCount = new Set(opcos.map((o) => o.country)).size;
