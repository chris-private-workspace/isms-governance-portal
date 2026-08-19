/**
 * File: apps/web/src/data/extended/ismsProfiles.ts
 * Purpose: The per-OpCo ISMS profile records, their version history and their catalogue.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and stays diffable against it; this one
 *   is not, so provenance is stated per collection.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:3798-3841  (ismsProfileData)
 *     design/ISMS Governance Platform.dc.html:3843-3848  (ismsVersions)
 *     design/ISMS Governance Platform.dc.html:3849-3851  (defaultVersions)
 *     design/ISMS Governance Platform.dc.html:4469-4483  (ismsItems / ismsCounts)
 *   The handoff's `data/README.md:28-45` says outright that these were skipped
 *   by the `data/` export and must be read from the logic class.
 *
 *   FOURTEEN RECORDS TRANSCRIBED, THIRTEEN KEPT. The RIN / Ricoh India Ltd
 *   record (dc.html:3835-3837) is dropped, exactly as opcos.ts drops the RIN
 *   row: confirmed parameter #4 excludes India, #12 says to ignore the India
 *   samples outright, and AD-Mockup-3 is explicit that it is DELETED and not
 *   swapped for a China one. The 13 keys here are the 13 codes in opcos.ts.
 *
 *   THREE FIELDS ARE NEUTRALISED RATHER THAN TRANSCRIBED, and it matters that
 *   the difference is written down:
 *     - leader.email  — dc.html carries live corporate addresses
 *       (`anand.kumar@ricoh.com.sg`). Rewritten onto the reserved `.example`
 *       TLD, the convention lib/personas.ts already uses. Guardrail 7 forbids
 *       demo data that reads as real personal data, and a named individual
 *       plus a working corporate mailbox is exactly that.
 *     - leader.phone  — dc.html carries dialable switchboard numbers. Masked to
 *       the country code plus X's, which cannot be dialled and cannot be
 *       mistaken for anyone's line.
 *     - RIN           — deleted, see above.
 *   Everything else, including site names and business addresses, is verbatim:
 *   a company's premises are not personal data, and inventing 20 plausible
 *   addresses would be less honest than transcribing the design's.
 *
 *   THE PROFILE HAS NO STORED SCOPE STATEMENT. `data/README.md:41` lists a
 *   `scope` field; the records do not have one. It is generated per OpCo by
 *   dc.html:4433 `genScope`, which branches on the OpCo's `role`. That sentence
 *   is copy, so it lives in the i18n dictionaries as two variants, and only the
 *   branch is decided here. README.md:37 also describes `standards` as
 *   `{iso27001, iso27017}`; the records hold an array. The records win.
 *
 * Key Components:
 *   - ISMS_PROFILES: 13 records keyed by OpCo code
 *   - ISMS_VERSIONS / DEFAULT_VERSIONS: RAPO has its own history, the rest share one
 *   - ismsItems / ismsCounts: the approved-catalogue generator, seeded by OpCo code
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — ISMS profiles port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/23-apac-isms-profiles.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/README.md
 */

import { catalogue } from '@/data/catalogue';
import type { OpCo } from '@/data/opcos';
import type { TranslationKey } from '@/i18n';

/**
 * `emp` widens to string because edit mode holds a draft of this same shape and
 * an <input> yields text. dc.html:4677 does the same — it stringifies on the
 * way to the view either way, so one type covers the record and its draft.
 */
export type IsmsSite = { name: string; address: string; emp: number | string };

export type IsmsLeader = {
  name: string;
  dept: string;
  /** Reserved `.example` TLD — see the file header. */
  email: string;
  address: string;
  /** Masked — see the file header. */
  phone: string;
};

export type IsmsProfile = {
  company: string;
  country: string;
  standards: string[];
  certCount: number | string;
  sites: IsmsSite[];
  leader: IsmsLeader;
};

/** The two standards the toggle offers (dc.html:4674). */
export const ISMS_STANDARDS = ['ISO 27001', 'ISO 27017'] as const;

/** dc.html:3798-3841, minus RIN. Keys match opcos.ts exactly. */
export const ISMS_PROFILES: Record<string, IsmsProfile> = {
  RAP: {
    company: 'Ricoh Asia Pacific Pte Ltd',
    country: 'Singapore',
    standards: ['ISO 27001', 'ISO 27017'],
    certCount: 2,
    sites: [
      { name: 'Regional Head Office', address: '103 Penang Road, #05-01, Singapore 238467', emp: 214 },
      { name: 'Regional Data Centre', address: '26 Ayer Rajah Crescent, Singapore 139944', emp: 38 },
    ],
    leader: {
      name: 'Anand Kumar',
      dept: 'Regional Information Security',
      email: 'anand.kumar@rap.example',
      address: '103 Penang Road, #05-01, Singapore 238467',
      phone: '+65 XXXX XXXX',
    },
  },
  RAPO: {
    company: 'Ricoh Asia Pacific Operations Ltd',
    country: 'Hong Kong',
    standards: ['ISO 27001', 'ISO 27017'],
    certCount: 1,
    sites: [
      {
        name: 'Kowloon Bay Office',
        address: '21/F, One Kowloon, 1 Wang Yuen Street, Kowloon Bay, Hong Kong',
        emp: 186,
      },
      {
        name: 'Tsing Yi Distribution Centre',
        address: 'Units 1-4, 9/F, Goodman Interlink, Tsing Yi, Hong Kong',
        emp: 64,
      },
    ],
    leader: {
      name: 'Wilson Cheung',
      dept: 'Information Security & Compliance',
      email: 'wilson.cheung@rapo.example',
      address: '21/F, One Kowloon, 1 Wang Yuen Street, Kowloon Bay, Hong Kong',
      phone: '+852 XXXX XXXX',
    },
  },
  RHK: {
    company: 'Ricoh Hong Kong Ltd',
    country: 'Hong Kong',
    standards: ['ISO 27001'],
    certCount: 1,
    sites: [
      {
        name: 'Kowloon Bay Head Office',
        address: '23/F, One Kowloon, 1 Wang Yuen Street, Kowloon Bay, Hong Kong',
        emp: 312,
      },
      {
        name: 'Kwai Chung Service Centre',
        address: 'Block B, 12/F, Kwai Chung Ind. Centre, Hong Kong',
        emp: 96,
      },
    ],
    leader: {
      name: 'Carmen Ng',
      dept: 'IT & Information Security',
      email: 'carmen.ng@rhk.example',
      address: '23/F, One Kowloon, 1 Wang Yuen Street, Kowloon Bay, Hong Kong',
      phone: '+852 XXXX XXXX',
    },
  },
  RSG: {
    company: 'Ricoh Singapore Pte Ltd',
    country: 'Singapore',
    standards: ['ISO 27001', 'ISO 27017'],
    certCount: 1,
    sites: [
      { name: 'Singapore Head Office', address: '103 Penang Road, #04-01, Singapore 238467', emp: 268 },
      { name: 'Refurbishment Centre', address: '8 Kaki Bukit Avenue 4, Singapore 415875', emp: 74 },
    ],
    leader: {
      name: 'Jason Lim',
      dept: 'Information Security Office',
      email: 'jason.lim@rsg.example',
      address: '103 Penang Road, #04-01, Singapore 238467',
      phone: '+65 XXXX XXXX',
    },
  },
  RAU: {
    company: 'Ricoh Australia Pty Ltd',
    country: 'Australia',
    standards: ['ISO 27001', 'ISO 27017'],
    certCount: 1,
    sites: [
      {
        name: 'North Ryde Head Office',
        address: '2 Richardson Place, North Ryde NSW 2113, Australia',
        emp: 394,
      },
      { name: 'Melbourne Office', address: '572 Swan Street, Richmond VIC 3121, Australia', emp: 142 },
      { name: 'Brisbane Office', address: '137 Kerry Road, Archerfield QLD 4108, Australia', emp: 88 },
    ],
    leader: {
      name: 'Sarah Nguyen',
      dept: 'Risk, Security & Compliance',
      email: 'sarah.nguyen@rau.example',
      address: '2 Richardson Place, North Ryde NSW 2113, Australia',
      phone: '+61 X XXXX XXXX',
    },
  },
  RNZ: {
    company: 'Ricoh New Zealand Ltd',
    country: 'New Zealand',
    standards: ['ISO 27001'],
    certCount: 1,
    sites: [
      {
        name: 'Auckland Head Office',
        address: '660 Great South Road, Ellerslie, Auckland 1051, New Zealand',
        emp: 164,
      },
    ],
    leader: {
      name: 'Sarah Nguyen',
      dept: 'Risk, Security & Compliance',
      email: 'sarah.nguyen@rnz.example',
      address: '660 Great South Road, Ellerslie, Auckland 1051, New Zealand',
      phone: '+64 X XXX XXXX',
    },
  },
  RMY: {
    company: 'Ricoh (Malaysia) Sdn Bhd',
    country: 'Malaysia',
    standards: ['ISO 27001'],
    certCount: 0,
    sites: [
      {
        name: 'Petaling Jaya Head Office',
        address:
          'Level 12, Menara Symphony, No. 5 Jalan Prof. Khoo Kay Kim, 46200 Petaling Jaya, Selangor',
        emp: 188,
      },
      {
        name: 'Shah Alam Service Centre',
        address: 'Lot 6, Jalan Astaka U8/84, Bukit Jelutong, 40150 Shah Alam, Selangor',
        emp: 72,
      },
    ],
    leader: {
      name: 'Rizal Abdullah',
      dept: 'IT Operations & Security',
      email: 'rizal.abdullah@rmy.example',
      address: 'Level 12, Menara Symphony, 46200 Petaling Jaya, Selangor',
      phone: '+60 X XXXX XXXX',
    },
  },
  RTH: {
    company: 'Ricoh (Thailand) Ltd',
    country: 'Thailand',
    standards: ['ISO 27001'],
    certCount: 1,
    sites: [
      { name: 'Bangkok Head Office', address: '341 Onnut Road, Prawet, Bangkok 10250, Thailand', emp: 246 },
    ],
    leader: {
      name: 'Pornchai Srisai',
      dept: 'Information Security',
      email: 'pornchai.srisai@rth.example',
      address: '341 Onnut Road, Prawet, Bangkok 10250, Thailand',
      phone: '+66 X XXX XXXX',
    },
  },
  RKR: {
    company: 'Ricoh Korea Co Ltd',
    country: 'Korea',
    standards: ['ISO 27001', 'ISO 27017'],
    certCount: 1,
    sites: [
      {
        name: 'Seoul Head Office',
        address: '12F, Ricoh Building, 45 Yeouido-dong, Yeongdeungpo-gu, Seoul 07242, Korea',
        emp: 198,
      },
    ],
    leader: {
      name: 'Hyun Park',
      dept: 'Information Security Team',
      email: 'hyun.park@rkr.example',
      address: '12F, Ricoh Building, 45 Yeouido-dong, Seoul 07242, Korea',
      phone: '+82 X XXXX XXXX',
    },
  },
  RTW: {
    company: 'Ricoh Taiwan Ltd',
    country: 'Taiwan',
    standards: ['ISO 27001'],
    certCount: 1,
    sites: [
      {
        name: 'Taipei Head Office',
        address: '8F, No. 100, Songren Road, Xinyi District, Taipei 110, Taiwan',
        emp: 176,
      },
    ],
    leader: {
      name: 'Yi-Ting Chen',
      dept: 'Information Security Office',
      email: 'yiting.chen@rtw.example',
      address: '8F, No. 100, Songren Road, Xinyi District, Taipei 110, Taiwan',
      phone: '+886 X XXXX XXXX',
    },
  },
  RID: {
    company: 'PT Ricoh Indonesia',
    country: 'Indonesia',
    standards: ['ISO 27001'],
    certCount: 0,
    sites: [
      {
        name: 'Jakarta Head Office',
        address: 'Menara Kadin Indonesia, 15F, Jl. HR Rasuna Said, Jakarta 12950',
        emp: 154,
      },
    ],
    leader: {
      name: 'Budi Santoso',
      dept: 'IT & Security',
      email: 'budi.santoso@rid.example',
      address: 'Menara Kadin Indonesia, 15F, Jl. HR Rasuna Said, Jakarta 12950',
      phone: '+62 XX XXXX XXXX',
    },
  },
  RPH: {
    company: 'Ricoh Philippines Inc',
    country: 'Philippines',
    standards: ['ISO 27001'],
    certCount: 1,
    sites: [
      {
        name: 'Makati Head Office',
        address: '18F, Zuellig Building, Makati Avenue, Makati City 1225, Philippines',
        emp: 132,
      },
    ],
    leader: {
      name: 'Maria Reyes',
      dept: 'Information Security',
      email: 'maria.reyes@rph.example',
      address: '18F, Zuellig Building, Makati Avenue, Makati City 1225, Philippines',
      phone: '+63 X XXXX XXXX',
    },
  },
  RVN: {
    company: 'Ricoh Vietnam Co Ltd',
    country: 'Vietnam',
    standards: [],
    certCount: 0,
    sites: [
      {
        name: 'Ho Chi Minh City Office',
        address: 'Level 9, Bitexco Financial Tower, 2 Hai Trieu, District 1, Ho Chi Minh City',
        emp: 86,
      },
    ],
    leader: {
      name: 'Thanh Nguyen',
      dept: 'IT',
      email: 'thanh.nguyen@rvn.example',
      address: 'Level 9, Bitexco Financial Tower, 2 Hai Trieu, District 1, Ho Chi Minh City',
      phone: '+84 XX XXXX XXXX',
    },
  },
};

export type IsmsVersion = {
  ver: string;
  date: string;
  /** A person stays a literal; a role is copy and resolves through the dictionary. */
  by: { name: string } | { key: TranslationKey };
  noteKey: TranslationKey;
  statusKey: TranslationKey;
};

/**
 * dc.html:3843-3848 — RAPO is the only OpCo with a hand-written history, which
 * is why it is the one the prototype opened on. Everything else falls back.
 */
/** @record-claim — a version chain with named authors for one profile. */
export const ISMS_VERSIONS: Record<string, IsmsVersion[]> = {
  RAPO: [
    {
      ver: 'v3.2',
      date: '2026-06-18',
      by: { name: 'W. Cheung' },
      noteKey: 'ismsProfile.ver.note.tsingYi',
      statusKey: 'ismsProfile.ver.status.published',
    },
    {
      ver: 'v3.1',
      date: '2025-11-04',
      by: { name: 'W. Cheung' },
      noteKey: 'ismsProfile.ver.note.headcount',
      statusKey: 'ismsProfile.ver.status.superseded',
    },
    {
      ver: 'v3.0',
      date: '2025-02-20',
      by: { name: 'W. Cheung' },
      noteKey: 'ismsProfile.ver.note.cloudControls',
      statusKey: 'ismsProfile.ver.status.superseded',
    },
    {
      ver: 'v2.4',
      date: '2024-07-09',
      by: { name: 'A. Kumar' },
      noteKey: 'ismsProfile.ver.note.annualNoChange',
      statusKey: 'ismsProfile.ver.status.superseded',
    },
  ],
};

/** dc.html:3849-3851 — the same three entries for every OpCo but RAPO. */
export const DEFAULT_VERSIONS: IsmsVersion[] = [
  {
    ver: 'v2.1',
    date: '2026-05-30',
    by: { key: 'ismsProfile.ver.by.profileOwner' },
    noteKey: 'ismsProfile.ver.note.annualConfirmed',
    statusKey: 'ismsProfile.ver.status.published',
  },
  {
    ver: 'v2.0',
    date: '2025-06-12',
    by: { key: 'ismsProfile.ver.by.profileOwner' },
    noteKey: 'ismsProfile.ver.note.sitesRefreshed',
    statusKey: 'ismsProfile.ver.status.superseded',
  },
  {
    ver: 'v1.0',
    date: '2024-04-02',
    by: { key: 'ismsProfile.ver.by.regionalIso' },
    noteKey: 'ismsProfile.ver.note.initial',
    statusKey: 'ismsProfile.ver.status.superseded',
  },
];

export type CatalogueStatus = 'Approved' | 'Conditional' | 'Pending';

export type IsmsCatalogueItem = (typeof catalogue)[number] & { status: CatalogueStatus };

/**
 * dc.html:4469-4476 — which catalogue entries an OpCo has approved.
 *
 * A deterministic filter over the shared catalogue, seeded from two characters
 * of the OpCo code, so every OpCo gets a different but stable subset. Kept as
 * the design wrote it rather than replaced by a stored per-OpCo list: a stored
 * list would be 13 x ~12 invented rows, and this reproduces the prototype
 * exactly. One consequence is worth knowing before reading the screen — RAP and
 * RAPO seed identically, because charCodeAt(1) and charCodeAt(2) see 'A' and
 * 'P' in both.
 */
export function ismsItems(opco: OpCo): IsmsCatalogueItem[] {
  const seed = opco.code.charCodeAt(1) + opco.code.charCodeAt(2);
  return catalogue.flatMap((c, ix) => {
    if ((ix * 7 + seed) % 11 >= (c.biz === 'OP' ? 8 : 6)) return [];
    const status: CatalogueStatus =
      opco.cert === 'Not in scope' && c.biz === 'OS'
        ? 'Pending'
        : (ix + seed) % 9 === 0
          ? 'Conditional'
          : 'Approved';
    return [{ ...c, status }];
  });
}

/** dc.html:4477-4483 — the four counts the KPI strip and the rail read. */
export function ismsCounts(opco: OpCo) {
  const items = ismsItems(opco);
  return {
    items,
    op: items.filter((c) => c.biz === 'OP' && c.status === 'Approved').length,
    os: items.filter((c) => c.biz === 'OS' && c.status === 'Approved').length,
    cond: items.filter((c) => c.status === 'Conditional').length,
    pending: items.filter((c) => c.status === 'Pending').length,
  };
}
