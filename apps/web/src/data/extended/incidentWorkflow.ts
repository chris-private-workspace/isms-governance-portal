/**
 * File: apps/web/src/data/extended/incidentWorkflow.ts
 * Purpose: The lifecycle, tabs, severity definitions and notification matrix of an incident.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and stays diffable against it; this one
 *   is not, so provenance is stated per collection.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:3973-3987  (notifyMatrix)
 *     design/ISMS Governance Platform.dc.html:3988-3996  (sevDef)
 *     design/ISMS Governance Platform.dc.html:4545-4553  (the 8-step order, tabs)
 *   `incidents.ts` carries the RECORD — severity, timestamps, owner, ticket,
 *   clause, description, impact — but no lifecycle, no notification list and no
 *   severity definition. The prototype held those centrally and attached them by
 *   severity, which is why they are one table here and not eight fixture rows.
 *
 *   THE STEP LIST IS MATCHED BY ENGLISH STATUS STRING, so `status` is kept
 *   beside the label key rather than derived from it. That is not redundancy:
 *   `incidents.ts` stores the status in English, and dc.html:4546 finds the
 *   current step with indexOf over exactly these strings.
 *
 *   ONE COLOUR DECISION DEPARTS FROM dc.html, deliberately. Its `sevDef` paints
 *   S2 amber and S3 neutral; components/status.md:27 — the handoff's own single
 *   source of status colour — maps S1/S2 to R, S3 to A and S4 to G, and the
 *   incidents register at app/(app)/incidents/page.tsx:56 already ships that
 *   mapping. Two screens in one product disagreeing about what S2 looks like is
 *   worse than either choice, so the register's mapping wins and lives at the
 *   call site, not here.
 *
 *   THERE IS NO S4 DEFINITION ANYWHERE IN THE HANDOFF. sevDef stops at S3 and
 *   no fixture row carries S4, so the severity paragraph is rendered only when a
 *   definition exists. An invented S4 paragraph would be a governance statement
 *   about when an incident is trivial — not something a UI port gets to decide.
 *
 * Key Components:
 *   - INCIDENT_STEPS / INCIDENT_TABS: the lifecycle and the four tabs
 *   - INCIDENT_SEVERITY: label, definition and reporting cadence per level
 *   - NOTIFY_MATRIX: who is told, in what role, over what channel, by when
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — incident detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/18-incident-detail.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/status.md
 */

import type { TranslationKey } from '@/i18n';

/** dc.html:4545 — eight steps, matched against the record's English status. */
export const INCIDENT_STEPS: { status: string; labelKey: TranslationKey }[] = [
  { status: 'Submitted', labelKey: 'incidentDetail.step.submitted' },
  { status: 'Auto-classified', labelKey: 'incidentDetail.step.autoClassified' },
  { status: 'Notified', labelKey: 'incidentDetail.step.notified' },
  { status: 'Investigation', labelKey: 'incidentDetail.step.investigation' },
  { status: 'Root cause analysis', labelKey: 'incidentDetail.step.rca' },
  { status: 'Corrective & preventive action', labelKey: 'incidentDetail.step.cpa' },
  { status: 'Closure report', labelKey: 'incidentDetail.step.closureReport' },
  { status: 'Approved', labelKey: 'incidentDetail.step.approved' },
];

export type IncidentTabId = 'report' | 'workflow' | 'actions' | 'approval';

/** dc.html:4552 — the four tabs, in order. */
export const INCIDENT_TABS: { id: IncidentTabId; labelKey: TranslationKey }[] = [
  { id: 'report', labelKey: 'incidentDetail.tab.report' },
  { id: 'workflow', labelKey: 'incidentDetail.tab.workflow' },
  { id: 'actions', labelKey: 'incidentDetail.tab.actions' },
  { id: 'approval', labelKey: 'incidentDetail.tab.approval' },
];

export type SeverityDefinition = {
  labelKey: TranslationKey;
  /** The company's own definition of the level. */
  defKey: TranslationKey;
  /** How soon the first report must go out. */
  initKey: TranslationKey;
  /** How often updates follow. */
  updKey: TranslationKey;
};

/** dc.html:3988-3996 — the colours are NOT taken from here; see the file header. */
export const INCIDENT_SEVERITY: Record<string, SeverityDefinition> = {
  S1: {
    labelKey: 'incidentDetail.sev.s1.label',
    defKey: 'incidentDetail.sev.s1.def',
    initKey: 'incidentDetail.sla.immediately',
    updKey: 'incidentDetail.sla.twiceADay',
  },
  S2: {
    labelKey: 'incidentDetail.sev.s2.label',
    defKey: 'incidentDetail.sev.s2.def',
    initKey: 'incidentDetail.sla.immediately',
    updKey: 'incidentDetail.sla.onceADay',
  },
  S3: {
    labelKey: 'incidentDetail.sev.s3.label',
    defKey: 'incidentDetail.sev.s3.def',
    initKey: 'incidentDetail.sla.nextDay',
    updKey: 'incidentDetail.sla.everyTwoDays',
  },
};

export type NotifyRow = {
  whoKey: TranslationKey;
  roleKey: TranslationKey;
  channelKey: TranslationKey;
  slaKey: TranslationKey;
};

/**
 * dc.html:3973-3987 — the notification list, per severity.
 *
 * Seven recipients at S1 down to two at S3. This is the escalation rule the
 * incident procedure actually turns on, so it is transcribed row for row rather
 * than summarised; `data/notifyRules.ts` is a different table (routing rules by
 * trigger event, shown in Admin) and is not a substitute for it.
 */
export const NOTIFY_MATRIX: Record<string, NotifyRow[]> = {
  S1: [
    {
      whoKey: 'incidentDetail.who.groupCiso',
      roleKey: 'incidentDetail.role.groupTokyo',
      channelKey: 'incidentDetail.ch.emailCall',
      slaKey: 'incidentDetail.sla.immediately',
    },
    {
      whoKey: 'incidentDetail.who.regionalIso',
      roleKey: 'incidentDetail.role.rapRapo',
      channelKey: 'incidentDetail.ch.emailTeams',
      slaKey: 'incidentDetail.sla.immediately',
    },
    {
      whoKey: 'incidentDetail.who.opcoPresident',
      roleKey: 'incidentDetail.role.reportingOpco',
      channelKey: 'incidentDetail.ch.emailCall',
      slaKey: 'incidentDetail.sla.immediately',
    },
    {
      whoKey: 'incidentDetail.who.regionalMd',
      roleKey: 'incidentDetail.role.ricohApac',
      channelKey: 'incidentDetail.ch.email',
      slaKey: 'incidentDetail.sla.immediately',
    },
    {
      whoKey: 'incidentDetail.who.isc',
      roleKey: 'incidentDetail.role.chairMembers',
      channelKey: 'incidentDetail.ch.email',
      slaKey: 'incidentDetail.sla.withinOneHour',
    },
    {
      whoKey: 'incidentDetail.who.legal',
      roleKey: 'incidentDetail.role.regional',
      channelKey: 'incidentDetail.ch.email',
      slaKey: 'incidentDetail.sla.withinOneHour',
    },
    {
      whoKey: 'incidentDetail.who.itOps',
      roleKey: 'incidentDetail.role.reportingOpco',
      channelKey: 'incidentDetail.ch.teams',
      slaKey: 'incidentDetail.sla.immediately',
    },
  ],
  S2: [
    {
      whoKey: 'incidentDetail.who.regionalIso',
      roleKey: 'incidentDetail.role.rapRapo',
      channelKey: 'incidentDetail.ch.email',
      slaKey: 'incidentDetail.sla.immediately',
    },
    {
      whoKey: 'incidentDetail.who.opcoIso',
      roleKey: 'incidentDetail.role.reportingOpco',
      channelKey: 'incidentDetail.ch.emailTeams',
      slaKey: 'incidentDetail.sla.immediately',
    },
    {
      whoKey: 'incidentDetail.who.buHead',
      roleKey: 'incidentDetail.role.affectedBu',
      channelKey: 'incidentDetail.ch.email',
      slaKey: 'incidentDetail.sla.withinFourHours',
    },
    {
      whoKey: 'incidentDetail.who.itOps',
      roleKey: 'incidentDetail.role.reportingOpco',
      channelKey: 'incidentDetail.ch.teams',
      slaKey: 'incidentDetail.sla.immediately',
    },
  ],
  S3: [
    {
      whoKey: 'incidentDetail.who.opcoIso',
      roleKey: 'incidentDetail.role.reportingOpco',
      channelKey: 'incidentDetail.ch.email',
      slaKey: 'incidentDetail.sla.nextDay',
    },
    {
      whoKey: 'incidentDetail.who.itOps',
      roleKey: 'incidentDetail.role.reportingOpco',
      channelKey: 'incidentDetail.ch.teams',
      slaKey: 'incidentDetail.sla.nextDay',
    },
  ],
};

/**
 * dc.html:4571 — the name the prototype prints as the CISO's delegate.
 *
 * A literal because it names a person, the same treatment AppShell gives its
 * persona names; the surrounding sentence is copy and lives in the dictionary.
 */
export const INCIDENT_REVIEWER_NAME = 'W. Cheung';
