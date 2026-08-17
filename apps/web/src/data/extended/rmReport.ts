/**
 * File: apps/web/src/data/extended/rmReport.ts
 * Purpose: The Risk Management Report worksheets — six sheets of scored rows.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4010       (rmSheets)
 *     design/ISMS Governance Platform.dc.html:4011-4054  (rmRows)
 *     design/ISMS Governance Platform.dc.html:4624       (rp.abbrev)
 *   Six worksheets holding thirty threat-vulnerability pairs between them, each
 *   scored before and after control. This is the asset-based method of confirmed
 *   parameter #8 — asset group, threat, vulnerability, CIA — with the Annex A
 *   controls that close the gap between the two scores.
 *
 *   THE STORED RISK SCORE IS DELIBERATELY NOT STORED. The prototype's `b` and
 *   `a` are seven numbers: likelihood, five impacts, and the product. Only the
 *   first six are kept here and the seventh is recomputed by riskScore() in
 *   extended/riskModel.ts. Two reasons, and the second is the real one:
 *     1. Likelihood x MAX(impacts) is confirmed parameter #7. A stored total can
 *        drift from its own inputs; a computed one cannot.
 *     2. It makes the transcription checkable. All 60 arrays (30 rows x before
 *        and after) were verified to satisfy stored == likelihood x max, so any
 *        digit mistyped during transcription would have shown up as a mismatch
 *        rather than as a plausible wrong number on screen.
 *
 *   `ctl` holds ISO/IEC 27001 Annex A clause references — identifiers, not copy,
 *   and rendered as written. `cia` likewise: 'C', 'CIA' and 'C/I/A' all appear in
 *   the source and the difference between them is the worksheet's, not ours.
 *
 * Key Components:
 *   - RM_SHEETS: the six worksheet names, in the workbook's order
 *   - RM_ROWS: sheet name -> its rows
 *   - RM_ABBREV: the seven column abbreviations, expanded
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — risk programme report tab
 *
 * Related:
 *   - apps/web/src/data/extended/riskModel.ts — the arithmetic and the dimensions
 */

/** dc.html:4010, in the workbook's own order. */
export const RM_SHEETS = [
  'Services',
  'People',
  'Intangible',
  'Physical & Virtual',
  'Software',
  'Information',
] as const;

export type RmSheet = (typeof RM_SHEETS)[number];

export type RmRow = {
  /** Asset group. */
  grp: string;
  /** The concrete assets in that group. */
  det: string;
  threat: string;
  vuln: string;
  /** Which of confidentiality / integrity / availability is at stake. */
  cia: string;
  owner: string;
  /** Before control: [likelihood, FIN, BOP, LRY, REP, SIS]. */
  b: [number, number, number, number, number, number];
  /** ISO/IEC 27001 Annex A references applied between the two scores. */
  ctl: string;
  /** After control: [likelihood, FIN, BOP, LRY, REP, SIS]. */
  a: [number, number, number, number, number, number];
};

/** dc.html:4011-4054, verbatim but for the dropped seventh score. */
export const RM_ROWS: Record<RmSheet, RmRow[]> = {
  Services: [
    {
      grp: 'External Services Providers',
      det: 'Cloud service provider, external vulnerability scanning provider',
      threat: 'Espionage and intellectual theft',
      vuln: 'Insufficient visitor control and monitoring',
      cia: 'C',
      owner: 'Information Security Officer',
      b: [2, 3, 3, 3, 2, 3],
      ctl: 'A.5.9, A.5.11, A.5.12, A.5.13, A.5.14, A.5.15, A.7.1, A.8.1, A.8.12, A.5.19–A.5.22',
      a: [1, 2, 2, 2, 2, 2],
    },
    {
      grp: 'External Services Providers',
      det: 'Cloud service provider',
      threat: 'Illegal or unauthorised operations',
      vuln: 'Deficiency in service contract management',
      cia: 'CIA',
      owner: 'Information Security Officer',
      b: [2, 3, 3, 3, 2, 3],
      ctl: 'A.7.10, A.8.13, A.5.19, A.5.20, A.5.21, A.5.22, A.5.23',
      a: [1, 2, 3, 3, 2, 3],
    },
    {
      grp: 'External Services Providers',
      det: 'Disposal contractor',
      threat: 'Improper disposal of waste or retired backup media',
      vuln: 'Insufficient service review and monitoring',
      cia: 'C',
      owner: 'Information Security Officer',
      b: [3, 3, 3, 4, 4, 4],
      ctl: 'A.5.9, A.5.12, A.5.13, A.6.3, A.7.10, A.7.14, A.5.24–A.5.28, A.6.8',
      a: [1, 2, 2, 3, 3, 3],
    },
    {
      grp: 'Internal Services Providers',
      det: 'Regional operation centre, internal IT services provider',
      threat: 'Unauthorised logical access',
      vuln: 'Insufficient network and system access controls',
      cia: 'CIA',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 3, 2, 4],
      ctl: 'A.5.15–A.5.18, A.8.1, A.8.2, A.8.3, A.8.5, A.8.20–A.8.23, A.8.9',
      a: [1, 2, 3, 2, 2, 3],
    },
    {
      grp: 'Network Connectivity',
      det: 'Internet connectivity, intranet connectivity',
      threat: 'External intruder attacks or denial of service',
      vuln: 'Configuration errors on routers and firewalls',
      cia: 'C/I/A',
      owner: 'Information Security Officer',
      b: [3, 3, 4, 3, 4, 3],
      ctl: 'A.5.5, A.5.6, A.5.7, A.8.8, A.8.20–A.8.23, A.8.15–A.8.17',
      a: [1, 2, 3, 2, 3, 2],
    },
    {
      grp: 'Utilities for Office',
      det: 'Power, air conditioning',
      threat: 'Electrical shock, power failure and spike',
      vuln: 'Lack of regular maintenance',
      cia: 'I/A',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 3, 3, 4],
      ctl: 'A.7.5, A.7.8, A.7.11, A.7.13, A.5.22, A.5.30',
      a: [1, 2, 3, 2, 2, 3],
    },
  ],
  People: [
    {
      grp: 'Management Staff',
      det: 'Regional and OpCo management',
      threat: 'Employee sabotage',
      vuln: 'Insufficient background check and access monitoring',
      cia: 'C/I/A',
      owner: 'Regional MD',
      b: [2, 4, 4, 3, 3, 4],
      ctl: 'A.5.4, A.6.1–A.6.6, A.5.15–A.5.18, A.8.1–A.8.5, A.7.1–A.7.4',
      a: [1, 3, 3, 2, 3, 3],
    },
    {
      grp: 'Management Staff',
      det: 'Regional and OpCo management',
      threat: 'Fraud and collusion',
      vuln: 'Inadequate separation of duties',
      cia: 'C/I/A',
      owner: 'Regional MD',
      b: [2, 4, 4, 4, 4, 4],
      ctl: 'A.5.3, A.5.4, A.5.37, A.6.1–A.6.4, A.6.8',
      a: [1, 2, 3, 3, 3, 3],
    },
    {
      grp: 'Management Staff',
      det: 'Regional and OpCo management',
      threat: 'Unauthorised access to malicious or work-unrelated websites',
      vuln: 'Lack of web filtering mechanism',
      cia: 'C/I/A',
      owner: 'Regional MD',
      b: [3, 3, 3, 2, 3, 4],
      ctl: 'A.6.3, A.6.4, A.8.23, A.5.23–A.5.28, A.6.8',
      a: [1, 3, 2, 2, 2, 3],
    },
    {
      grp: 'Technical Staff',
      det: 'IT, service and support engineers',
      threat: 'Improper handling of sensitive output',
      vuln: 'Lack of user security awareness',
      cia: 'C',
      owner: 'Respective team head',
      b: [3, 3, 4, 3, 4, 4],
      ctl: 'A.5.1, A.5.9–A.5.14, A.8.11, A.8.12, A.6.2–A.6.6',
      a: [1, 2, 3, 3, 3, 3],
    },
    {
      grp: 'Technical Staff',
      det: 'IT, service and support engineers',
      threat: 'Improper handling of security incidents',
      vuln: 'Lack of incident reporting and handling procedure',
      cia: 'C/I/A',
      owner: 'Respective team head',
      b: [2, 3, 4, 3, 4, 4],
      ctl: 'A.5.2, A.5.24–A.5.28, A.6.3, A.6.8',
      a: [1, 2, 3, 2, 3, 3],
    },
    {
      grp: 'All Staff',
      det: 'All employees and contractors',
      threat: 'Social engineering',
      vuln: 'Lack of user security awareness',
      cia: 'C',
      owner: 'Regional MD',
      b: [2, 3, 3, 2, 3, 3],
      ctl: 'A.6.3, A.6.4, A.8.23, A.5.24–A.5.28, A.6.8',
      a: [1, 2, 3, 2, 2, 2],
    },
  ],
  Intangible: [
    {
      grp: 'Company Reputation',
      det: 'Ricoh brand in APAC',
      threat: 'Loss of organisation reputation',
      vuln: 'Inadequate or ineffective security mechanism',
      cia: 'C/I/A',
      owner: 'Regional MD',
      b: [2, 3, 3, 3, 4, 3],
      ctl: 'A.5.1, A.5.2, A.5.35, A.5.36, A.8.34',
      a: [1, 2, 2, 2, 3, 2],
    },
    {
      grp: 'Company Reputation',
      det: 'Ricoh brand in APAC',
      threat: 'Non-compliance with contractual, legal and regulatory requirements',
      vuln: 'Unaware of contractual, legal and regulatory requirements',
      cia: 'A',
      owner: 'Regional MD',
      b: [2, 4, 4, 3, 4, 3],
      ctl: 'A.5.1, A.5.31, A.5.32, A.5.33, A.5.34',
      a: [1, 3, 3, 2, 3, 2],
    },
    {
      grp: 'Service Commitment',
      det: 'Cloud and managed services SLAs',
      threat: 'Unable to deliver services as committed',
      vuln: 'Lack of business continuity plan or replacement staff',
      cia: 'A',
      owner: 'Regional MD',
      b: [2, 3, 4, 3, 4, 3],
      ctl: 'A.5.1, A.5.29, A.5.30, A.8.13, A.8.14',
      a: [1, 2, 3, 2, 3, 2],
    },
  ],
  'Physical & Virtual': [
    {
      grp: 'Staff Owned Mobile Devices',
      det: 'Notebooks, smartphones, removable media',
      threat: 'Loss of removable storage device or smartphone',
      vuln: 'Insufficient physical protection of mobile devices',
      cia: 'C',
      owner: 'Information Security Officer',
      b: [3, 3, 3, 3, 3, 4],
      ctl: 'A.5.11, A.6.3, A.7.9, A.7.10, A.8.1, A.5.24–A.5.28',
      a: [1, 2, 3, 2, 2, 3],
    },
    {
      grp: 'Staff Owned Mobile Devices',
      det: 'Smartphones',
      threat: 'Unauthorised connection of smartphone for data transfer',
      vuln: 'Ineffective USB port control on desktops and notebooks',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [3, 2, 3, 2, 3, 4],
      ctl: 'A.5.1, A.6.3, A.6.4, A.7.7',
      a: [1, 2, 2, 2, 2, 3],
    },
    {
      grp: 'Backup Media',
      det: 'Backup tapes and disks',
      threat: 'Improper disposal of retired backup media',
      vuln: 'Lack of secure disposal tool',
      cia: 'C',
      owner: 'Information Security Officer',
      b: [3, 2, 3, 4, 4, 4],
      ctl: 'A.5.9, A.5.12, A.5.13, A.6.3, A.7.10, A.7.14, A.5.36',
      a: [1, 2, 2, 3, 3, 3],
    },
    {
      grp: 'Physical Security Systems',
      det: 'Access control system, access cards, CCTV',
      threat: 'Incorrect access settings in physical access control systems',
      vuln: 'Delayed removal of terminated staff records',
      cia: 'I',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 3, 4, 3],
      ctl: 'A.7.1–A.7.4, A.7.7, A.7.12, A.5.19–A.5.22',
      a: [1, 2, 3, 2, 3, 2],
    },
    {
      grp: 'Office Equipment',
      det: 'MFPs, printers, meeting room devices',
      threat: 'Unauthorised physical access or theft',
      vuln: 'Insufficient entry control and monitoring',
      cia: 'C/I/A',
      owner: 'Information Security Officer',
      b: [2, 2, 4, 4, 4, 2],
      ctl: 'A.7.1–A.7.4, A.7.7, A.7.12, A.5.19–A.5.22',
      a: [1, 2, 3, 3, 3, 2],
    },
  ],
  Software: [
    {
      grp: 'Cloud Platform Management Console',
      det: 'Azure / cloud tenant consoles',
      threat: 'External intruder attacks',
      vuln: 'Ineffective intrusion detection and prevention',
      cia: 'C/I/A',
      owner: 'Information Security Officer',
      b: [3, 3, 4, 3, 3, 4],
      ctl: 'A.5.23, A.5.5–A.5.7, A.8.8, A.8.20–A.8.23, A.8.15–A.8.17',
      a: [1, 2, 3, 2, 2, 3],
    },
    {
      grp: 'Cloud Platform Management Console',
      det: 'Azure / cloud tenant consoles',
      threat: 'Password guessing and cracking',
      vuln: 'Poor choice of passwords, lack of multi-factor authentication',
      cia: 'C/I/A',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 3, 3, 4],
      ctl: 'A.5.1, A.5.16, A.5.17, A.6.3, A.8.5, A.5.24–A.5.28',
      a: [1, 2, 3, 2, 2, 3],
    },
    {
      grp: 'Virtual Firewall Software',
      det: 'Perimeter and cloud firewalls',
      threat: 'Unauthorised configuration change',
      vuln: 'Inadequate separation of duties',
      cia: 'I',
      owner: 'Information Security Officer',
      b: [2, 4, 4, 4, 3, 4],
      ctl: 'A.5.1, A.5.3, A.5.15–A.5.18, A.8.18, A.8.19, A.8.31',
      a: [1, 2, 2, 3, 3, 3],
    },
    {
      grp: 'All Production Software',
      det: 'Antivirus, OS, admin tools, PC software',
      threat: 'Unauthorised logical access',
      vuln: 'Delayed installation of security patches',
      cia: 'C/I/A',
      owner: 'Information Security Officer',
      b: [2, 2, 3, 3, 3, 4],
      ctl: 'A.5.15–A.5.18, A.8.1–A.8.5, A.8.8, A.8.20–A.8.23',
      a: [1, 2, 2, 2, 2, 3],
    },
    {
      grp: 'Software Security Token',
      det: 'MFA tokens and authenticators',
      threat: 'Unauthorised access and usage of software security token',
      vuln: 'Use of weak password for operating system login',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [2, 2, 3, 2, 2, 4],
      ctl: 'A.5.1, A.5.16, A.5.17, A.6.3, A.8.5',
      a: [1, 2, 2, 2, 2, 1],
    },
  ],
  Information: [
    {
      grp: 'Customer Information',
      det: 'Cloud service customer data, derived data',
      threat: 'Customer information protection failure',
      vuln: 'Incorrect access control setting',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 4, 4, 4],
      ctl: 'A.5.1, A.5.9–A.5.14, A.8.11, A.8.12, A.5.15–A.5.18, A.8.1–A.8.5',
      a: [1, 2, 3, 3, 3, 3],
    },
    {
      grp: 'Customer Information',
      det: 'Cloud service customer data',
      threat: 'Transmission over unprotected communications',
      vuln: 'Lack of user security awareness',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 4, 4, 4],
      ctl: 'A.6.3, A.6.4, A.5.9, A.5.12–A.5.14, A.8.23, A.8.24',
      a: [1, 2, 3, 3, 3, 3],
    },
    {
      grp: 'Staff Personal Data',
      det: 'HR and payroll records',
      threat: 'Transmission over unprotected communications',
      vuln: 'Lack of user security awareness',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [3, 2, 3, 4, 4, 4],
      ctl: 'A.6.3, A.6.4, A.5.9, A.5.12–A.5.14, A.8.23, A.8.24',
      a: [1, 2, 3, 3, 3, 3],
    },
    {
      grp: 'Encryption Keys',
      det: 'Platform and backup encryption keys',
      threat: 'Encryption key compromise',
      vuln: 'Ineffective key management practices',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [2, 3, 4, 3, 3, 4],
      ctl: 'A.5.9, A.5.12–A.5.14, A.8.13, A.8.24, A.5.24–A.5.28',
      a: [1, 2, 3, 3, 3, 3],
    },
    {
      grp: 'Archived Records',
      det: 'Contracts, statutory and audit records',
      threat: 'Customer information protection failure',
      vuln: 'Improper backup media management',
      cia: 'C/I',
      owner: 'Information Security Officer',
      b: [2, 2, 3, 3, 4, 4],
      ctl: 'A.5.1, A.5.9–A.5.14, A.8.11, A.8.12, A.7.1–A.7.4',
      a: [1, 2, 2, 2, 3, 3],
    },
  ],
};

/** dc.html:4624, verbatim. The footer legend under the worksheet. */
export const RM_ABBREV: { k: string; v: string }[] = [
  { k: 'LKH', v: 'Likelihood' },
  { k: 'FIN', v: 'Finance' },
  { k: 'BOP', v: 'Business operations' },
  { k: 'LRY', v: 'Legal & regulatory' },
  { k: 'REP', v: 'Reputation' },
  { k: 'SIS', v: 'Sensitive information & life safety' },
  { k: 'C / I / A', v: 'Confidentiality, integrity, availability' },
];
