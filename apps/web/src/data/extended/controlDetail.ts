/**
 * File: apps/web/src/data/extended/controlDetail.ts
 * Purpose: The collections a control detail renders that controls.ts does not carry.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and stays diffable against it; this one
 *   is not, so every file here states where its content came from.
 *
 *   PROVENANCE — TRANSCRIBED, not invented. The handoff's `data/` export
 *   skipped the prototype's logic class, so these lists exist only in
 *   `design/ISMS Governance Platform.dc.html`. Per collection:
 *     dc.html:5197       CONTROL_NATURE — frequency to Automated / Manual
 *     dc.html:5199-5210  CONTROL_FRAMEWORKS, keyed by control id
 *     dc.html:5211       CONTROL_FRAMEWORK_FALLBACK
 *     dc.html:5214-5219  controlTestHistory()
 *     dc.html:5220-5224  controlEvidence()
 *     dc.html:5230-5234  controlSignOff()
 *     dc.html:5235-5241  controlAuditTrail()
 *     dc.html:5242       CONTROL_NEXT_TEST
 *   Linked obligations are NOT here: the prototype derives them from the
 *   framework mapping (dc.html:5212), so the page does the same.
 *
 *   ⚠ ONE MAPPING IS DOMAIN-WRONG AND IS CARRIED ACROSS ANYWAY. CTL-2012 maps
 *   to SOC 1 (SSAE 18) 'Controls over financial reporting' (dc.html:5207),
 *   because the prototype keyed fwLib by control ID and controls.ts later
 *   renamed CTL-2012 to 'Monthly log review sign-off' — an infosec control. The
 *   citation now sits on the wrong kind of control. Transcribed rather than
 *   silently re-mapped: inventing a replacement would be an undocumented design
 *   change, and this is one line to correct once someone decides what it should
 *   say. Same shape, milder, on CTL-2088 and CTL-2360, which cite ISO 37301
 *   (compliance management) for alert-triage and anti-malware controls.
 *
 *   WHY BUILDERS, NOT CONSTANTS: all four lists are templates with holes filled
 *   from the record — the last test date, the coverage figure, the result. Copy
 *   still resolves through i18n: the builders emit keys, never sentences.
 *
 * Key Components:
 *   - CONTROL_FRAMEWORKS: control id -> its standards citations
 *   - controlTestHistory / controlEvidence / controlSignOff / controlAuditTrail
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — control detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/08-control-detail.html
 *   - apps/web/src/data/extended/riskDetail.ts — the audit-trail shape both share
 */

import type { TranslationKey } from '@/i18n';

// The two detail screens render the same ledger block from the same shaped
// rows, so the shape is declared once. A type-only import is erased at build
// time, so this costs no runtime coupling between the two fixtures.
import type { TrailEntry } from './riskDetail';

/** One citation row: the standard, the clause, and what the clause requires. */
export type FrameworkRef = { fw: string; ref: string; nameKey: TranslationKey };

/** dc.html:5197 — nature is read off the test frequency, not stored. */
export const CONTROL_NATURE: Record<string, TranslationKey> = {
  Continuous: 'controlDetail.nature.automated',
  Daily: 'controlDetail.nature.automated',
  'Per event': 'controlDetail.nature.semiAutomated',
};

/** Anything not continuous, daily or event-driven is operated by hand. */
export const CONTROL_NATURE_FALLBACK: TranslationKey = 'controlDetail.nature.manual';

/** dc.html:5199-5210 — the standards each control in the library maps to. */
export const CONTROL_FRAMEWORKS: Record<string, FrameworkRef[]> = {
  'CTL-2201': [
    { fw: 'ISO 27001:2022', ref: 'A.5.17 / A.8.5', nameKey: 'controlDetail.fw.authInfo' },
    { fw: 'SOC 2', ref: 'CC6.1', nameKey: 'controlDetail.fw.logicalAccess' },
    { fw: 'NIST CSF', ref: 'PR.AC-7', nameKey: 'controlDetail.fw.usersAuthenticated' },
  ],
  'CTL-2140': [
    { fw: 'ISO 27001:2022', ref: 'A.5.18', nameKey: 'controlDetail.fw.accessReview' },
    { fw: 'SOC 2', ref: 'CC6.2 / CC6.3', nameKey: 'controlDetail.fw.accessProvisioning' },
    { fw: 'NIST CSF', ref: 'PR.AC-4', nameKey: 'controlDetail.fw.permissionsManaged' },
  ],
  'CTL-2255': [
    { fw: 'ISO 27701', ref: '7.5.1', nameKey: 'controlDetail.fw.transferBasis' },
    { fw: 'GDPR', ref: 'Art. 46', nameKey: 'controlDetail.fw.transferSafeguards' },
    { fw: 'SOC 2', ref: 'P6.7', nameKey: 'controlDetail.fw.crossBorder' },
  ],
  'CTL-2300': [
    { fw: 'ISO 27001:2022', ref: 'A.8.15 / A.8.18', nameKey: 'controlDetail.fw.logging' },
    { fw: 'SOC 2', ref: 'CC7.2', nameKey: 'controlDetail.fw.privilegedMonitoring' },
    { fw: 'NIST CSF', ref: 'PR.PT-1', nameKey: 'controlDetail.fw.auditRecords' },
  ],
  'CTL-2410': [
    { fw: 'ISO 22301', ref: '8.5', nameKey: 'controlDetail.fw.exercising' },
    { fw: 'ISO 27001:2022', ref: 'A.5.30', nameKey: 'controlDetail.fw.ictReadiness' },
    { fw: 'SOC 2', ref: 'A1.3', nameKey: 'controlDetail.fw.recoveryTesting' },
  ],
  'CTL-2150': [
    { fw: 'ISO 27001:2022', ref: 'A.6.3', nameKey: 'controlDetail.fw.awareness' },
    { fw: 'SOC 2', ref: 'CC1.4', nameKey: 'controlDetail.fw.competence' },
    { fw: 'NIST CSF', ref: 'PR.AT-1', nameKey: 'controlDetail.fw.usersTrained' },
  ],
  'CTL-2199': [
    { fw: 'ISO 27001:2022', ref: 'A.5.18 / A.6.5', nameKey: 'controlDetail.fw.postEmployment' },
    { fw: 'SOC 2', ref: 'CC6.2', nameKey: 'controlDetail.fw.deprovisioning' },
  ],
  // See the file header: this citation belongs to a control the fixture has
  // since renamed. Transcribed, flagged, not quietly replaced.
  'CTL-2012': [
    { fw: 'SOC 1 (SSAE 18)', ref: '—', nameKey: 'controlDetail.fw.financialReporting' },
    { fw: 'ISO 27001:2022', ref: 'A.5.1', nameKey: 'controlDetail.fw.policies' },
  ],
  'CTL-2088': [
    { fw: 'ISO 37301', ref: '8.1', nameKey: 'controlDetail.fw.complianceObligations' },
    { fw: 'SOC 2', ref: 'CC2.2', nameKey: 'controlDetail.fw.internalComms' },
  ],
  'CTL-2360': [
    { fw: 'ISO 37301', ref: '8.1', nameKey: 'controlDetail.fw.complianceObligations' },
    { fw: 'SOC 2', ref: 'CC7.1', nameKey: 'controlDetail.fw.anomalyDetection' },
  ],
};

/**
 * dc.html:5211 — what an unmapped control shows.
 *
 * Every id in controls.ts is in the table above, so this is not reachable from
 * the current fixture. It stays because the lookup is by string key and the
 * alternative is a non-null assertion that would render an empty card instead.
 */
export const CONTROL_FRAMEWORK_FALLBACK: FrameworkRef[] = [
  { fw: 'ISO 27001:2022', ref: 'A.5.1', nameKey: 'controlDetail.fw.policies' },
  { fw: 'SOC 2', ref: 'CC1.1', nameKey: 'controlDetail.fw.controlEnvironment' },
];

/** dc.html:5242 — one next-test date across the whole demo library. */
/** @record-claim — a test commitment about one control. */
export const CONTROL_NEXT_TEST = '2026-09-30';

/** dc.html:5215-5218 — the result vocabulary, and its RAG letter. */
export const CONTROL_RESULT: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Effective: { rating: 'G', labelKey: 'controlDetail.result.effective' },
  Partial: { rating: 'A', labelKey: 'controlDetail.result.partial' },
  Ineffective: { rating: 'R', labelKey: 'controlDetail.result.ineffective' },
};

export type TestRun = {
  date: string;
  testerKey: TranslationKey;
  /** The value as controls.ts spells it, so CONTROL_RESULT can key on it. */
  result: string;
  sample: string;
  noteKey: TranslationKey;
};

/**
 * dc.html:5214-5219 — four runs, newest first.
 *
 * Only the newest run reflects the record. The three below it are a fixed
 * history whose middle row branches on coverage, which is why a control at 40%
 * shows an older Ineffective run and one at 96% shows a Partial one. The dates
 * are the same for every control in the library, as in the prototype.
 */
export function controlTestHistory(record: {
  lastTest: string;
  result: string;
  cov: number;
}): TestRun[] {
  const weak = record.cov < 70;
  return [
    {
      date: record.lastTest,
      testerKey: 'controlDetail.tester.internalAudit',
      result: record.result,
      sample: '25 / 25',
      noteKey:
        record.result === 'Effective'
          ? 'controlDetail.note.noExceptions'
          : record.result === 'Partial'
            ? 'controlDetail.note.twoExceptions'
            : 'controlDetail.note.designGap',
    },
    {
      date: '2026-02-14',
      testerKey: 'controlDetail.tester.controlOwner',
      result: 'Effective',
      sample: '25 / 25',
      noteKey: 'controlDetail.note.noExceptions',
    },
    {
      date: '2025-11-03',
      testerKey: 'controlDetail.tester.internalAudit',
      result: weak ? 'Ineffective' : 'Partial',
      sample: '20 / 25',
      noteKey: weak ? 'controlDetail.note.multiple' : 'controlDetail.note.minor',
    },
    {
      date: '2025-08-08',
      testerKey: 'controlDetail.tester.controlOwner',
      result: 'Partial',
      sample: '25 / 25',
      noteKey: 'controlDetail.note.baseline',
    },
  ];
}

export type EvidenceFile = {
  /** Carries a {date} hole for the workpaper; the other two are fixed names. */
  nameKey: TranslationKey;
  nameVars?: Record<string, string>;
  metaKey: TranslationKey;
  hash: string;
};

/** dc.html:5220-5224 — three artefacts, all dated to the last test. */
/** @record-claim — evidence artefacts with hashes, for one control. */
export function controlEvidence(record: { lastTest: string }): EvidenceFile[] {
  return [
    {
      nameKey: 'controlDetail.evidence.workpaper',
      nameVars: { date: record.lastTest },
      metaKey: 'controlDetail.evidence.metaUploadedAudit',
      hash: 'f3a1·9c22',
    },
    {
      nameKey: 'controlDetail.evidence.config',
      metaKey: 'controlDetail.evidence.metaGenerated',
      hash: 'b70e·4d18',
    },
    {
      nameKey: 'controlDetail.evidence.sampling',
      metaKey: 'controlDetail.evidence.metaUploadedOwner',
      hash: '19cd·8f0a',
    },
  ];
}

export type ControlSignOffWho =
  | { tag: 'entityTeam'; entity: string }
  | { tag: 'internalAudit' }
  | { tag: 'regionalGovernance'; name: string };

export type ControlSignOffStep = {
  roleKey: TranslationKey;
  who: ControlSignOffWho;
  date: string;
  done: boolean;
};

/**
 * dc.html:5230-5234 — three signatures.
 *
 * Unlike the risk chain, the last one is CONDITIONAL: an Ineffective control is
 * not approved, so its third circle stays hollow and reads 'pending'. That is
 * the design's own rule and it is the only place either detail screen lets the
 * record decide whether a signature exists.
 */
/** @record-claim — named people signing one control, with dates. */
export function controlSignOff(record: {
  entity: string;
  lastTest: string;
  result: string;
}): ControlSignOffStep[] {
  return [
    {
      roleKey: 'controlDetail.signOff.owner',
      who: { tag: 'entityTeam', entity: record.entity },
      date: '12 May 2026',
      done: true,
    },
    {
      roleKey: 'controlDetail.signOff.tested',
      who: { tag: 'internalAudit' },
      date: record.lastTest,
      done: true,
    },
    {
      roleKey: 'controlDetail.signOff.approved',
      who: { tag: 'regionalGovernance', name: 'M. Tan' },
      date: '15 May 2026',
      done: record.result !== 'Ineffective',
    },
  ];
}

/**
 * dc.html:5235-5241 — five ledger rows, newest first.
 *
 * `resultKey` is the same key the header pill and the test table resolve, so
 * the ledger cannot claim a different result from the panel beside it. Three of
 * the five timestamps are derived from the last test date, which is why the
 * ledger re-times itself per control instead of showing one frozen day.
 */
/** @record-claim — a SHA-256 ledger for one control. */
export function controlAuditTrail(record: {
  id: string;
  cov: number;
  lastTest: string;
  resultKey: TranslationKey;
}): TrailEntry[] {
  return [
    {
      seq: '#0088',
      dot: 'var(--primary)',
      actionKey: 'controlDetail.audit.action.resultRecorded',
      fieldKey: 'controlDetail.audit.field.result',
      before: { key: 'controlDetail.result.partial' },
      after: { key: record.resultKey },
      actor: { key: 'controlDetail.audit.actor.internalAudit' },
      role: { key: 'controlDetail.audit.role.secondLine' },
      ts: `${record.lastTest} 15:40 SGT`,
      hash: 'c1d4·77a9·0b2e',
    },
    {
      seq: '#0084',
      dot: 'var(--rag-n)',
      actionKey: 'controlDetail.audit.action.evidenceAttached',
      fieldKey: 'controlDetail.audit.field.evidence',
      before: { text: '—' },
      after: { text: `WP-${record.id}.pdf` },
      actor: { key: 'controlDetail.audit.actor.internalAudit' },
      role: { key: 'controlDetail.audit.role.secondLine' },
      ts: `${record.lastTest} 15:38 SGT`,
      hash: 'a002·55fd·9c1a',
    },
    {
      seq: '#0079',
      dot: 'var(--rag-a)',
      actionKey: 'controlDetail.audit.action.coverageUpdated',
      fieldKey: 'controlDetail.audit.field.coverage',
      before: { text: `${Math.max(0, record.cov - 4)}%` },
      after: { text: `${record.cov}%` },
      actor: { key: 'controlDetail.audit.actor.system' },
      role: { key: 'controlDetail.audit.role.automated' },
      ts: `${record.lastTest} 15:30 SGT`,
      hash: '44be·1e77·6d30',
    },
    {
      seq: '#0071',
      dot: 'var(--rag-n)',
      actionKey: 'controlDetail.audit.action.mappingRevised',
      fieldKey: 'controlDetail.audit.field.mapping',
      before: { text: 'ISO 27001:2013' },
      after: { text: 'ISO 27001:2022' },
      actor: { text: 'M. Tan' },
      role: { key: 'controlDetail.audit.role.regionalGovernance' },
      ts: '2026-03-02 10:12 SGT',
      hash: 'de90·0a4c·2b58',
    },
    {
      seq: '#0055',
      dot: 'var(--rag-n)',
      actionKey: 'controlDetail.audit.action.created',
      fieldKey: 'controlDetail.audit.field.status',
      before: { text: '—' },
      after: { key: 'controlDetail.audit.value.active' },
      actor: { key: 'controlDetail.audit.actor.system' },
      role: { key: 'controlDetail.audit.role.automated' },
      ts: '2025-08-08 09:00 SGT',
      hash: '0071·f3aa·118c',
    },
  ];
}
