/**
 * File: apps/web/src/data/extended/riskDetail.ts
 * Purpose: The collections a risk detail renders that risks.ts does not carry.
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
 *     dc.html:4915-4937  RISK_CATEGORY_META — appetite, obligations, assets
 *     dc.html:4941-4949  the description library, folded into the same record
 *     dc.html:4953       RISK_STAGES
 *     dc.html:4969-4973  RISK_DECISIONS and their notes
 *     dc.html:5004-5008  RISK_ASSESSMENT_CYCLES
 *     dc.html:5018-5022  riskSignOff()
 *     dc.html:5026-5033  riskAuditTrail()
 *     dc.html:5035       RISK_NEXT_REVIEW
 *
 *   TWO DELIBERATE OMISSIONS, stated so they are not mistaken for transcription
 *   errors:
 *     - the 'Financial' category (dc.html:4934-4936, 4948) is dropped. No row
 *       in risks.ts carries it, so it is unreachable — and its content (SOC 1,
 *       ERP / general ledger, reconciliation) is financial-reporting framing
 *       rather than ISMS.
 *     - the generic description fallback (dc.html:4950) is dropped. The
 *       prototype falls back TWICE and inconsistently: the category record
 *       falls back to Operational, the sentence to a generic one. Folding the
 *       sentence into the record leaves one fallback instead of two.
 *
 *   WHY BUILDERS, NOT CONSTANTS: sign-off and audit trail are templates whose
 *   holes are filled from the record — a residual score, an owner, a decision.
 *   The alternative was a mini-DSL of field tags, which hides the citation
 *   behind an indirection. Copy still resolves through i18n: the builders emit
 *   keys, never sentences, and translated text arrives as an argument.
 *
 * Key Components:
 *   - RISK_CATEGORY_META: category -> appetite, description, obligations, assets
 *   - RISK_STAGES / RISK_DECISIONS / RISK_ASSESSMENT_CYCLES: fixed templates
 *   - riskSignOff / riskAuditTrail: the two record-dependent templates
 *   - TrailText / TrailEntry: the audit-trail shape, shared with controlDetail
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — risk detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/06-risk-detail.html
 */

import type { TranslationKey } from '@/i18n';

/**
 * One value inside an audit-trail row.
 *
 * Three cases because the prototype mixes three kinds of value in the same
 * position: a figure read off the record (`text`), a fixed word that is copy
 * (`key`), and a fixed word carrying a value (`key` + `vars`).
 */
export type TrailText =
  | { text: string }
  | { key: TranslationKey }
  | { key: TranslationKey; vars: Record<string, string | number> };

/** One append-only ledger row. Identical shape on both detail screens. */
export type TrailEntry = {
  seq: string;
  /** Already a token — dc.html maps its dot letter to a var() at the end. */
  dot: string;
  actionKey: TranslationKey;
  fieldKey: TranslationKey;
  before: TrailText;
  after: TrailText;
  actor: TrailText;
  role: TrailText;
  ts: string;
  hash: string;
};

export type ObligationRef = { ref: string; nameKey: TranslationKey };

export type AssetRef = { nameKey: TranslationKey; typeKey: TranslationKey };

export type RiskCategoryMeta = {
  /** 'Low appetite' / 'Moderate appetite' / 'Averse appetite' as one unit. */
  appetiteKey: TranslationKey;
  /** Residual at or below this sits within appetite (dc.html:4967). */
  apScore: number;
  /** dc.html:4968 — Moderate reads amber, Low and Averse read red. */
  appetiteRating: 'A' | 'R';
  /** The category's description sentence; carries an {entity} hole. */
  descKey: TranslationKey;
  obligations: ObligationRef[];
  assets: AssetRef[];
};

/** dc.html:4938 — an unrecognised category is treated as Operational. */
export const RISK_CATEGORY_FALLBACK = 'Operational';

/**
 * dc.html:4915-4937 + 4941-4949, keyed exactly as risks.ts spells the category.
 *
 * The description is per CATEGORY, not per risk, in the prototype. Four
 * different Cyber & InfoSec risks therefore share one sentence about unpatched
 * software. Carried across at that fidelity rather than quietly improved.
 */
export const RISK_CATEGORY_META: Record<string, RiskCategoryMeta> = {
  'Cyber & InfoSec': {
    appetiteKey: 'riskDetail.appetite.low',
    apScore: 8,
    appetiteRating: 'R',
    descKey: 'riskDetail.desc.cyber',
    obligations: [
      { ref: 'ISO 27001:2022 A.8.8', nameKey: 'riskDetail.ob.vulnMgmt' },
      { ref: 'SOC 2 CC7.1', nameKey: 'riskDetail.ob.vulnDetect' },
      { ref: 'NIST CSF PR.IP-12', nameKey: 'riskDetail.ob.vulnPlan' },
      { ref: 'Group InfoSec Std 6.2', nameKey: 'riskDetail.ob.patchSla' },
    ],
    assets: [
      { nameKey: 'riskDetail.asset.webPlatform', typeKey: 'riskDetail.assetType.appTier1' },
      { nameKey: 'riskDetail.asset.apiGateway', typeKey: 'riskDetail.assetType.infraTier1' },
      { nameKey: 'riskDetail.asset.wafCluster', typeKey: 'riskDetail.assetType.infraTier2' },
    ],
  },
  'Data Privacy': {
    appetiteKey: 'riskDetail.appetite.low',
    apScore: 8,
    appetiteRating: 'R',
    descKey: 'riskDetail.desc.privacy',
    obligations: [
      { ref: 'GDPR Art. 44–49', nameKey: 'riskDetail.ob.transferThird' },
      { ref: 'PDPA (SG) §26', nameKey: 'riskDetail.ob.transferLimit' },
      { ref: 'ISO 27701 7.5.1', nameKey: 'riskDetail.ob.transferBasis' },
      { ref: 'SOC 2 P6.7', nameKey: 'riskDetail.ob.transferDisclosure' },
    ],
    assets: [
      { nameKey: 'riskDetail.asset.piiStore', typeKey: 'riskDetail.assetType.dataRestricted' },
      { nameKey: 'riskDetail.asset.warehouse', typeKey: 'riskDetail.assetType.dataConfidential' },
      { nameKey: 'riskDetail.asset.crm', typeKey: 'riskDetail.assetType.appTier1' },
    ],
  },
  'Third-party': {
    appetiteKey: 'riskDetail.appetite.moderate',
    apScore: 12,
    appetiteRating: 'A',
    descKey: 'riskDetail.desc.thirdParty',
    obligations: [
      { ref: 'ISO 27001:2022 A.5.19', nameKey: 'riskDetail.ob.supplierSecurity' },
      { ref: 'SOC 2 CC9.2', nameKey: 'riskDetail.ob.vendorRisk' },
      { ref: 'Group TPRM Std 3.1', nameKey: 'riskDetail.ob.concentration' },
    ],
    assets: [
      { nameKey: 'riskDetail.asset.cloudRegion', typeKey: 'riskDetail.assetType.infraTier1' },
      { nameKey: 'riskDetail.asset.idp', typeKey: 'riskDetail.assetType.appTier1' },
      { nameKey: 'riskDetail.asset.cdn', typeKey: 'riskDetail.assetType.infraTier2' },
    ],
  },
  'Business Continuity': {
    appetiteKey: 'riskDetail.appetite.low',
    apScore: 8,
    appetiteRating: 'R',
    descKey: 'riskDetail.desc.continuity',
    obligations: [
      { ref: 'ISO 22301 8.5', nameKey: 'riskDetail.ob.exercising' },
      { ref: 'ISO 27001:2022 A.5.30', nameKey: 'riskDetail.ob.ictReadiness' },
      { ref: 'SOC 2 A1.3', nameKey: 'riskDetail.ob.recoveryTesting' },
    ],
    assets: [
      { nameKey: 'riskDetail.asset.serviceCluster', typeKey: 'riskDetail.assetType.infraTier1' },
      { nameKey: 'riskDetail.asset.drSite', typeKey: 'riskDetail.assetType.infraTier1' },
      { nameKey: 'riskDetail.asset.runbooks', typeKey: 'riskDetail.assetType.dataInternal' },
    ],
  },
  Regulatory: {
    appetiteKey: 'riskDetail.appetite.averse',
    apScore: 6,
    appetiteRating: 'R',
    descKey: 'riskDetail.desc.regulatory',
    obligations: [
      { ref: 'ISO 37301 8.1', nameKey: 'riskDetail.ob.complianceObligations' },
      { ref: 'Group Compliance Std 4.2', nameKey: 'riskDetail.ob.regMonitoring' },
    ],
    assets: [
      { nameKey: 'riskDetail.asset.complianceTool', typeKey: 'riskDetail.assetType.appTier2' },
    ],
  },
  Operational: {
    appetiteKey: 'riskDetail.appetite.moderate',
    apScore: 12,
    appetiteRating: 'A',
    descKey: 'riskDetail.desc.operational',
    obligations: [
      { ref: 'ISO 27001:2022 A.5.18', nameKey: 'riskDetail.ob.accessRights' },
      { ref: 'SOC 2 CC6.2', nameKey: 'riskDetail.ob.deprovisioning' },
    ],
    assets: [
      { nameKey: 'riskDetail.asset.directory', typeKey: 'riskDetail.assetType.appTier1' },
      {
        nameKey: 'riskDetail.asset.contractorRegistry',
        typeKey: 'riskDetail.assetType.dataInternal',
      },
    ],
  },
};

/** dc.html:4953 — the five lifecycle stages, in order. */
export const RISK_STAGES: TranslationKey[] = [
  'riskDetail.stage.identified',
  'riskDetail.stage.assessed',
  'riskDetail.stage.treated',
  'riskDetail.stage.monitored',
  'riskDetail.stage.closed',
];

/** dc.html:4954 — status to the stage index the record has reached. */
export const RISK_STATUS_STAGE: Record<string, number> = {
  Open: 2,
  Treatment: 2,
  Monitored: 3,
  Accepted: 3,
};

/** dc.html:4969 — Accepted is the only status that is not a Reduce. */
export const RISK_STATUS_DECISION: Record<string, string> = {
  Open: 'Reduce',
  Treatment: 'Reduce',
  Monitored: 'Reduce',
  Accepted: 'Accept',
};

export const RISK_DECISION_FALLBACK = 'Reduce';

/** dc.html:4971-4973 — the four treatment options and the note each carries. */
export const RISK_DECISIONS: { value: string; labelKey: TranslationKey; noteKey: TranslationKey }[] =
  [
    {
      value: 'Accept',
      labelKey: 'riskDetail.decision.accept',
      noteKey: 'riskDetail.decisionNote.accept',
    },
    {
      value: 'Reduce',
      labelKey: 'riskDetail.decision.reduce',
      noteKey: 'riskDetail.decisionNote.reduce',
    },
    {
      value: 'Transfer',
      labelKey: 'riskDetail.decision.transfer',
      noteKey: 'riskDetail.decisionNote.transfer',
    },
    {
      value: 'Avoid',
      labelKey: 'riskDetail.decision.avoid',
      noteKey: 'riskDetail.decisionNote.avoid',
    },
  ];

/** dc.html:5035 — one review date for every risk in the demo library. */
export const RISK_NEXT_REVIEW = '30 Sep 2026';

export type AssessmentCycle = {
  cycleKey: TranslationKey;
  date: string;
  /** The record's own owner, or the prototype's fixed predecessor. */
  assessor: { fromOwner: true } | { key: TranslationKey };
  /** Added to the current residual, then clamped to 25 (dc.html:5006-5007). */
  residualOffset: number;
  /** The newest cycle shows the live decision; older ones are fixed. */
  decision: { current: true } | { key: TranslationKey };
};

/**
 * dc.html:5004-5008 — three cycles, newest first.
 *
 * The inherent score is the SAME on all three rows in the prototype, which is
 * why it is not modelled here: only the residual moves. That is coherent —
 * inherent risk is the exposure before controls, so it should not drift with
 * each test — and it is what makes the table read as an improvement trend.
 */
export const RISK_ASSESSMENT_CYCLES: AssessmentCycle[] = [
  {
    cycleKey: 'riskDetail.cycle.q3',
    date: '2026-06-28',
    assessor: { fromOwner: true },
    residualOffset: 0,
    decision: { current: true },
  },
  {
    cycleKey: 'riskDetail.cycle.q2',
    date: '2026-03-30',
    assessor: { fromOwner: true },
    residualOffset: 2,
    decision: { key: 'riskDetail.decision.reduce' },
  },
  {
    cycleKey: 'riskDetail.cycle.q1',
    date: '2025-12-22',
    assessor: { key: 'riskDetail.assessor.prior' },
    residualOffset: 4,
    decision: { key: 'riskDetail.decision.reduce' },
  },
];

export type SignOffWho =
  | { tag: 'preparedBy'; owner: string; role: string }
  | { tag: 'internalAudit' }
  | { tag: 'regionalGovernance'; name: string };

export type SignOffStep = {
  roleKey: TranslationKey;
  who: SignOffWho;
  date: string;
  done: boolean;
};

/**
 * dc.html:5018-5022 — three signatures, all complete for every risk.
 *
 * `done` is unconditionally true in the prototype, so a risk still sitting at
 * Open shows a fully signed chain. Kept: making it depend on status would be a
 * governance rule the design never states, and inventing one here is how a
 * demo starts asserting things the procedure has not decided.
 */
export function riskSignOff(record: { owner: string; role: string }): SignOffStep[] {
  return [
    {
      roleKey: 'riskDetail.signOff.prepared',
      who: { tag: 'preparedBy', owner: record.owner, role: record.role },
      date: '28 Jun 2026',
      done: true,
    },
    {
      roleKey: 'riskDetail.signOff.reviewed',
      who: { tag: 'internalAudit' },
      date: '29 Jun 2026',
      done: true,
    },
    {
      roleKey: 'riskDetail.signOff.approved',
      who: { tag: 'regionalGovernance', name: 'M. Tan' },
      date: '30 Jun 2026',
      done: true,
    },
  ];
}

/**
 * dc.html:5026-5033 — six ledger rows, newest first.
 *
 * `statusKey` is the same key the header pill resolves, so the two cannot drift
 * apart. `decisionLabel` has to arrive already translated instead: it lands
 * inside a sentence with a hole, and a key cannot be substituted into one.
 *
 * The before/after pairs are arithmetic on the record — the ledger claims the
 * residual came down by 2 and the likelihood by 1 — so they move with the
 * fixture instead of freezing a number that would contradict the panel above.
 */
export function riskAuditTrail(record: {
  owner: string;
  role: string;
  lik: number;
  residual: number;
  statusKey: TranslationKey;
  decisionLabel: string;
  /** First linked control's id, or the prototype's default when none exists. */
  workpaper: string;
}): TrailEntry[] {
  return [
    {
      seq: '#0051',
      dot: 'var(--primary)',
      actionKey: 'riskDetail.audit.action.residualReassessed',
      fieldKey: 'riskDetail.audit.field.residual',
      before: { text: String(Math.min(25, record.residual + 2)) },
      after: { text: String(record.residual) },
      actor: { text: record.owner },
      role: { text: record.role },
      ts: '2026-06-28 14:22 SGT',
      hash: 'a91f·3d2c·77b0',
    },
    {
      seq: '#0050',
      dot: 'var(--primary)',
      actionKey: 'riskDetail.audit.action.likelihoodRevised',
      fieldKey: 'riskDetail.audit.field.likelihood',
      before: { text: String(Math.min(5, record.lik + 1)) },
      after: { text: String(record.lik) },
      actor: { text: record.owner },
      role: { text: record.role },
      ts: '2026-06-28 14:20 SGT',
      hash: '7c04·b18e·2a19',
    },
    {
      seq: '#0047',
      dot: 'var(--rag-n)',
      actionKey: 'riskDetail.audit.action.evidenceAttached',
      fieldKey: 'riskDetail.audit.field.evidence',
      before: { text: '—' },
      after: { text: `WP-${record.workpaper}.pdf` },
      actor: { text: 'K. Sato' },
      role: { key: 'riskDetail.audit.role.controlOwner' },
      ts: '2026-06-10 09:05 SGT',
      hash: 'e5aa·90f1·c3d7',
    },
    {
      seq: '#0043',
      dot: 'var(--rag-a)',
      actionKey: 'riskDetail.audit.action.treatmentApproved',
      fieldKey: 'riskDetail.audit.field.treatment',
      before: { key: 'riskDetail.audit.value.proposed' },
      after: {
        key: 'riskDetail.audit.value.decisionApproved',
        vars: { decision: record.decisionLabel },
      },
      actor: { text: 'M. Tan' },
      role: { key: 'riskDetail.audit.role.regionalGovernance' },
      ts: '2026-05-30 16:48 SGT',
      hash: '2b77·c4da·0e6f',
    },
    {
      seq: '#0039',
      dot: 'var(--rag-n)',
      actionKey: 'riskDetail.audit.action.ownerReassigned',
      fieldKey: 'riskDetail.audit.field.owner',
      before: { key: 'riskDetail.audit.value.priorOwner' },
      after: { text: record.owner },
      actor: { key: 'riskDetail.audit.actor.system' },
      role: { key: 'riskDetail.audit.role.automated' },
      ts: '2026-05-18 11:12 SGT',
      hash: 'd0c9·7a55·91ab',
    },
    {
      seq: '#0021',
      dot: 'var(--rag-n)',
      actionKey: 'riskDetail.audit.action.created',
      fieldKey: 'riskDetail.audit.field.status',
      before: { text: '—' },
      after: { key: record.statusKey },
      actor: { key: 'riskDetail.audit.actor.system' },
      role: { key: 'riskDetail.audit.role.automated' },
      ts: '2026-04-02 10:00 SGT',
      hash: '00f2·1b3a·5c8d',
    },
  ];
}

/** dc.html:5026 — the workpaper id used when the entity has no controls. */
export const RISK_DEFAULT_WORKPAPER = 'CTL-2201';
