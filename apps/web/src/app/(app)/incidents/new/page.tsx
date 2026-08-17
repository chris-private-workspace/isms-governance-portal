'use client';

/**
 * File: apps/web/src/app/(app)/incidents/new/page.tsx
 * Purpose: Report a security incident; the triage answers set the severity, live.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/17-incident-report-form.html (125 lines)
 *   under the five port rules in AppShell.tsx. Inline style values are
 *   unchanged; the one mechanism change is style-hover -> data-hov="s3".
 *
 *   THE ONE THING THIS SCREEN MUST GET RIGHT is that the right-hand column is
 *   not decoration. Ticking a triage box re-classifies the severity, which
 *   changes the notification list, the recipient count in the footer sentence,
 *   and whether the root-cause section is marked mandatory. Those four are
 *   driven from one function (severityOf) reproducing the prototype's
 *   computedSev, so they cannot disagree with each other. A severity badge that
 *   updated while the notification list underneath it did not would be worse
 *   than a static one — it would look computed and be wrong.
 *
 *   MANDATORY IS MADE REAL, NOT PAINTED: the fragment shows a red
 *   "MANDATORY FOR S1" badge over the root-cause section. Here that badge also
 *   gates Submit, so the word means something. At S3 the badge reads "Optional
 *   at Level 3" and the gate lifts, exactly as the fragment's two <sc-if>
 *   branches describe.
 *
 *   NO BACKEND, so Submit does not pretend to submit. It raises an inline
 *   notice stating no incident was filed and no notification was sent — which
 *   also neutralises the footer sentence's claim about starting a reporting
 *   clock. Every field is controlled state so typing genuinely works.
 *
 *   TWO COUNTS DIFFER FROM THE FRAGMENT'S HINTS, both deliberately:
 *   the OpCo list is `opcos` (13) where hint-placeholder-count said 14 — the
 *   handoff fixture carried one row more than confirmed parameter #4 allows;
 *   and the recipient count in the footer is computed from the notification
 *   list for the current severity rather than copied.
 *
 *   The three date fields keep the fragment's literal defaults rather than
 *   today's date: a server-rendered `new Date()` disagrees with the client's
 *   and produces a hydration mismatch, and the demo badge already says these
 *   are sample values.
 *
 * Key Components:
 *   - IncidentFormPage: the screen
 *   - severityOf / SEV / NOTIFY: the triage -> severity -> notification chain
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — second of the three form screens
 *
 * Related:
 *   - fragments/screens/17-incident-report-form.html
 *   - design/ISMS Governance Platform.dc.html:3971-3995 — incTypes, notifyMatrix, sevDef
 */

import Link from 'next/link';
import { useState, type ChangeEvent } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { useShell } from '@/components/shell/shell-state';
import { opcos } from '@/data/opcos';
import { tok } from '@/lib/tok';

type Severity = 'S1' | 'S2' | 'S3';

/**
 * Fragment :64 — hint-placeholder-count="4".
 *
 * The first three drive Level 1 and the fourth drives Level 2; that mapping is
 * the prototype's computedSev, reproduced in severityOf below rather than
 * stored per row, so there is one place that decides the level.
 */
const TRIAGE = [
  {
    k: 'sensitive',
    labelKey: 'incidentForm.triage.sensitive',
    subKey: 'incidentForm.triage.drives1',
  },
  {
    k: 'critical',
    labelKey: 'incidentForm.triage.critical',
    subKey: 'incidentForm.triage.drives1',
  },
  { k: 'media', labelKey: 'incidentForm.triage.media', subKey: 'incidentForm.triage.drives1' },
  {
    k: 'noncritical',
    labelKey: 'incidentForm.triage.noncritical',
    subKey: 'incidentForm.triage.drives2',
  },
] as const;

/** The prototype's computedSev, copied. Any Level 1 answer wins outright. */
function severityOf(ticked: string[]): Severity {
  if (ticked.includes('sensitive') || ticked.includes('critical') || ticked.includes('media')) {
    return 'S1';
  }
  return ticked.includes('noncritical') ? 'S2' : 'S3';
}

/**
 * sevDef from the design source, with the colours replaced by a RAG letter.
 *
 * The source wrote the tokens out per level (S3 used --surface-3 / --text-2 /
 * --rag-n). Those are exactly tok('N'), so routing through tok() keeps the
 * rendered colours identical while leaving one helper in charge of status
 * colour, which is the rule status.md states.
 */
const SEV = {
  S1: {
    rating: 'R',
    labelKey: 'incidentForm.sev.s1.label',
    defKey: 'incidentForm.sev.s1.def',
    initKey: 'incidentForm.sev.s1.init',
    updKey: 'incidentForm.sev.s1.upd',
  },
  S2: {
    rating: 'A',
    labelKey: 'incidentForm.sev.s2.label',
    defKey: 'incidentForm.sev.s2.def',
    initKey: 'incidentForm.sev.s2.init',
    updKey: 'incidentForm.sev.s2.upd',
  },
  S3: {
    rating: 'N',
    labelKey: 'incidentForm.sev.s3.label',
    defKey: 'incidentForm.sev.s3.def',
    initKey: 'incidentForm.sev.s3.init',
    updKey: 'incidentForm.sev.s3.upd',
  },
} as const;

/** notifyMatrix from the design source. Fragment :114 hinted 4 rows; S1 has 7. */
const NOTIFY = {
  S1: [
    {
      whoKey: 'incidentForm.notify.who.groupCiso',
      roleKey: 'incidentForm.notify.role.groupTokyo',
      chKey: 'incidentForm.notify.ch.emailCall',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
    {
      whoKey: 'incidentForm.notify.who.riso',
      roleKey: 'incidentForm.notify.role.rapRapo',
      chKey: 'incidentForm.notify.ch.emailTeams',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
    {
      whoKey: 'incidentForm.notify.who.opcoPresident',
      roleKey: 'incidentForm.notify.role.reportingOpco',
      chKey: 'incidentForm.notify.ch.emailCall',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
    {
      whoKey: 'incidentForm.notify.who.regionalMd',
      roleKey: 'incidentForm.notify.role.rap',
      chKey: 'incidentForm.notify.ch.email',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
    {
      whoKey: 'incidentForm.notify.who.committee',
      roleKey: 'incidentForm.notify.role.chairMembers',
      chKey: 'incidentForm.notify.ch.email',
      slaKey: 'incidentForm.notify.sla.hour1',
    },
    {
      whoKey: 'incidentForm.notify.who.legal',
      roleKey: 'incidentForm.notify.role.regional',
      chKey: 'incidentForm.notify.ch.email',
      slaKey: 'incidentForm.notify.sla.hour1',
    },
    {
      whoKey: 'incidentForm.notify.who.itOps',
      roleKey: 'incidentForm.notify.role.reportingOpco',
      chKey: 'incidentForm.notify.ch.teams',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
  ],
  S2: [
    {
      whoKey: 'incidentForm.notify.who.riso',
      roleKey: 'incidentForm.notify.role.rapRapo',
      chKey: 'incidentForm.notify.ch.email',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
    {
      whoKey: 'incidentForm.notify.who.opcoIso',
      roleKey: 'incidentForm.notify.role.reportingOpco',
      chKey: 'incidentForm.notify.ch.emailTeams',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
    {
      whoKey: 'incidentForm.notify.who.buHead',
      roleKey: 'incidentForm.notify.role.affectedBu',
      chKey: 'incidentForm.notify.ch.email',
      slaKey: 'incidentForm.notify.sla.hours4',
    },
    {
      whoKey: 'incidentForm.notify.who.itOps',
      roleKey: 'incidentForm.notify.role.reportingOpco',
      chKey: 'incidentForm.notify.ch.teams',
      slaKey: 'incidentForm.notify.sla.immediately',
    },
  ],
  S3: [
    {
      whoKey: 'incidentForm.notify.who.opcoIso',
      roleKey: 'incidentForm.notify.role.reportingOpco',
      chKey: 'incidentForm.notify.ch.email',
      slaKey: 'incidentForm.notify.sla.nextDay',
    },
    {
      whoKey: 'incidentForm.notify.who.itOps',
      roleKey: 'incidentForm.notify.role.reportingOpco',
      chKey: 'incidentForm.notify.ch.teams',
      slaKey: 'incidentForm.notify.sla.nextDay',
    },
  ],
} as const;

/** incTypes from the design source — 10, matching fragment :37's hint exactly. */
const TYPES = [
  { value: 'Malware / Ransomware', labelKey: 'incidentForm.type.malware' },
  { value: 'Unauthorised access attempt', labelKey: 'incidentForm.type.unauthorisedAccess' },
  { value: 'Information leakage', labelKey: 'incidentForm.type.leakage' },
  { value: 'Phishing / social engineering', labelKey: 'incidentForm.type.phishing' },
  { value: 'Lost / stolen device or media', labelKey: 'incidentForm.type.lostDevice' },
  { value: 'Improper disposal / handling', labelKey: 'incidentForm.type.disposal' },
  { value: 'Physical security breach', labelKey: 'incidentForm.type.physical' },
  { value: 'System outage / availability', labelKey: 'incidentForm.type.outage' },
  { value: 'Third-party / supplier', labelKey: 'incidentForm.type.thirdParty' },
  { value: 'Policy violation', labelKey: 'incidentForm.type.policyViolation' },
] as const;

/** Fragment :40 — the only select this screen writes out by hand. */
const STATUSES = [
  { value: 'New — under triage', labelKey: 'incidentForm.status.new' },
  { value: 'Contained', labelKey: 'incidentForm.status.contained' },
  { value: 'Investigation', labelKey: 'incidentForm.status.investigation' },
] as const;

/** Card shell, copied from fragment :18. */
const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
  overflow: 'hidden',
};

/** Section heading strip, copied from fragment :19. */
const SECTION: React.CSSProperties = {
  padding: '12px 18px',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '.3px',
};

/** Two-column field grid, copied from fragment :20. */
const GRID2: React.CSSProperties = {
  padding: '18px',
  display: 'grid',
  gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
  gap: '14px 18px',
};

/** Field caption, copied from fragment :21. */
const CAPTION: React.CSSProperties = {
  display: 'block',
  fontSize: '11.5px',
  fontWeight: 600,
  color: 'var(--text-2)',
  marginBottom: '6px',
};

/** Text input and select, copied from fragment :22. */
const FIELD: React.CSSProperties = {
  width: '100%',
  height: '38px',
  padding: '0 11px',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  background: 'var(--surface-2)',
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
};

/** Dates, ticket and ISO clause are mono at 12.5px in the fragment (:28,:30,:91). */
const FIELD_MONO: React.CSSProperties = {
  ...FIELD,
  fontFamily: 'var(--mono)',
  fontSize: '12.5px',
};

/** Textarea, copied from fragment :50. */
const AREA: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  background: 'var(--surface-2)',
  fontFamily: 'inherit',
  fontSize: '13px',
  lineHeight: 1.55,
  color: 'var(--text)',
  outline: 'none',
  resize: 'vertical',
};

/** The fragment's literal defaults (:28,:32,:34). See the header on why. */
const INITIAL = {
  bu: '',
  reportDate: '2026-08-02',
  ticket: '',
  occurred: '2026-08-02 09:20',
  discovered: '2026-08-02 09:45',
  type: TYPES[0].value as string,
  status: STATUSES[0].value as string,
  title: '',
  desc: '',
  impact: '',
  location: '',
  rootCause: '',
  workaround: '',
  actionOwner: '',
  corrective: '',
  preventive: '',
  clause: '',
};

export default function IncidentFormPage() {
  const { tr, trf, entity } = useShell();

  const [fields, setFields] = useState(INITIAL);
  // null = "follow the topbar", the same arrangement the risk form uses.
  const [opcoCode, setOpcoCode] = useState<string | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [awareness, setAwareness] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // One handler for seventeen fields. The value is read out of the event
  // BEFORE the updater closes over it, so the updater never touches the
  // synthetic event — the shape that breaks the moment anything defers it.
  const set =
    (key: keyof typeof INITIAL) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value } = e.target;
      setFields((f) => ({ ...f, [key]: value }));
    };

  const selectedOpco = opcoCode ?? entity?.code ?? opcos[0]?.code ?? '';

  const severity = severityOf(ticked);
  const sev = SEV[severity];
  const sevTok = tok(sev.rating);
  const recipients = NOTIFY[severity];
  // Level 3 is the only level where the root-cause section is optional.
  const rcaMandatory = severity !== 'S3';

  const complete =
    [
      fields.bu,
      fields.reportDate,
      fields.occurred,
      fields.discovered,
      fields.title,
      fields.desc,
      fields.impact,
      fields.location,
    ].every((v) => v.trim().length > 0) &&
    selectedOpco !== '' &&
    (!rcaMandatory || fields.rootCause.trim().length > 0);

  const requiredMark = (
    <span aria-hidden="true" title={tr('incidentForm.required')}>
      {' *'}
    </span>
  );

  return (
    <div data-screen-label="Incident report form">
      <DemoBadge />

      <Link
        href="/incidents"
        data-hov="s3"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          height: '30px',
          padding: '0 10px 0 6px',
          border: '1px solid var(--border-strong)',
          borderRadius: '8px',
          background: 'var(--surface)',
          color: 'var(--text-2)',
          fontFamily: 'inherit',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '14px',
          textDecoration: 'none',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {tr('incidentForm.back')}
      </Link>

      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '.5px',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          {tr('incidentForm.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('incidentForm.heading')}
        </h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 320px',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={CARD}>
            <div style={SECTION}>{tr('incidentForm.section.general')}</div>
            <div style={GRID2}>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.opco.label')}
                  {requiredMark}
                </span>
                <select
                  value={selectedOpco}
                  onChange={(e) => setOpcoCode(e.target.value)}
                  required
                  aria-required="true"
                  style={FIELD}
                >
                  {opcos.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.bu.label')}
                  {requiredMark}
                </span>
                <input
                  value={fields.bu}
                  onChange={set('bu')}
                  required
                  aria-required="true"
                  placeholder={tr('incidentForm.bu.placeholder')}
                  style={FIELD}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.reportDate.label')}
                  {requiredMark}
                </span>
                <input
                  value={fields.reportDate}
                  onChange={set('reportDate')}
                  required
                  aria-required="true"
                  style={FIELD_MONO}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>{tr('incidentForm.ticket.label')}</span>
                <input
                  value={fields.ticket}
                  onChange={set('ticket')}
                  placeholder={tr('incidentForm.ticket.placeholder')}
                  style={FIELD_MONO}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.occurred.label')}
                  {requiredMark}
                </span>
                <input
                  value={fields.occurred}
                  onChange={set('occurred')}
                  required
                  aria-required="true"
                  style={FIELD_MONO}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.discovered.label')}
                  {requiredMark}
                </span>
                <input
                  value={fields.discovered}
                  onChange={set('discovered')}
                  required
                  aria-required="true"
                  style={FIELD_MONO}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.type.label')}
                  {requiredMark}
                </span>
                <select
                  value={fields.type}
                  onChange={set('type')}
                  required
                  aria-required="true"
                  style={FIELD}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {tr(t.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.status.label')}
                  {requiredMark}
                </span>
                <select
                  value={fields.status}
                  onChange={set('status')}
                  required
                  aria-required="true"
                  style={FIELD}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {tr(s.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div style={CARD}>
            <div style={SECTION}>{tr('incidentForm.section.details')}</div>
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.title.label')}
                  {requiredMark}
                </span>
                <input
                  value={fields.title}
                  onChange={set('title')}
                  required
                  aria-required="true"
                  placeholder={tr('incidentForm.title.placeholder')}
                  style={FIELD}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.desc.label')}
                  {requiredMark}
                </span>
                <textarea
                  rows={4}
                  value={fields.desc}
                  onChange={set('desc')}
                  required
                  aria-required="true"
                  placeholder={tr('incidentForm.desc.placeholder')}
                  style={AREA}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.impact.label')}
                  {requiredMark}
                </span>
                <textarea
                  rows={3}
                  value={fields.impact}
                  onChange={set('impact')}
                  required
                  aria-required="true"
                  placeholder={tr('incidentForm.impact.placeholder')}
                  style={AREA}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.location.label')}
                  {requiredMark}
                </span>
                <input
                  value={fields.location}
                  onChange={set('location')}
                  required
                  aria-required="true"
                  placeholder={tr('incidentForm.location.placeholder')}
                  style={FIELD}
                />
              </label>
            </div>
          </div>

          <div style={CARD}>
            <div
              style={{
                padding: '12px 18px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.3px' }}>
                {tr('incidentForm.section.triage')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {tr('incidentForm.triage.hint')}
              </span>
            </div>
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {TRIAGE.map((q) => {
                const on = ticked.includes(q.k);
                return (
                  // The fragment puts onClick on a plain <div>, which no
                  // keyboard can reach. A toggle button carries the same
                  // declarations and is operable by Space and Enter for free.
                  <button
                    key={q.k}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setTicked((cur) =>
                        cur.includes(q.k) ? cur.filter((x) => x !== q.k) : [...cur, q.k],
                      )
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '11px',
                      padding: '12px 14px',
                      border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '9px',
                      background: on ? 'var(--primary-tint)' : 'var(--surface-2)',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      color: 'var(--text)',
                    }}
                  >
                    <span
                      style={{
                        width: '17px',
                        height: '17px',
                        borderRadius: '5px',
                        border: '1.5px solid',
                        background: on ? 'var(--primary)' : 'transparent',
                        borderColor: on ? 'var(--primary)' : 'var(--border-strong)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          lineHeight: 1.45,
                          textWrap: 'pretty',
                        }}
                      >
                        {tr(q.labelKey)}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          color: 'var(--text-3)',
                          marginTop: '2px',
                        }}
                      >
                        {tr(q.subKey)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={CARD}>
            <div
              style={{
                padding: '12px 18px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '.3px' }}>
                {tr('incidentForm.section.rca')}
              </span>
              {rcaMandatory && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    fontFamily: 'var(--mono)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--rag-r-bg)',
                    color: 'var(--rag-r-ink)',
                  }}
                >
                  {trf('incidentForm.rca.mandatory', { sev: severity })}
                </span>
              )}
              {!rcaMandatory && (
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-3)' }}>
                  {tr('incidentForm.rca.optional')}
                </span>
              )}
            </div>
            <div style={GRID2}>
              <label style={{ display: 'block', gridColumn: 'span 2' }}>
                <span style={CAPTION}>
                  {tr('incidentForm.rootCause.label')}
                  {rcaMandatory && requiredMark}
                </span>
                <textarea
                  rows={2}
                  value={fields.rootCause}
                  onChange={set('rootCause')}
                  required={rcaMandatory}
                  aria-required={rcaMandatory}
                  placeholder={tr('incidentForm.rootCause.placeholder')}
                  style={AREA}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>{tr('incidentForm.workaround.label')}</span>
                <input
                  value={fields.workaround}
                  onChange={set('workaround')}
                  placeholder={tr('incidentForm.workaround.placeholder')}
                  style={FIELD}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>{tr('incidentForm.actionOwner.label')}</span>
                <input
                  value={fields.actionOwner}
                  onChange={set('actionOwner')}
                  placeholder={tr('incidentForm.actionOwner.placeholder')}
                  style={FIELD}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>{tr('incidentForm.corrective.label')}</span>
                <input
                  value={fields.corrective}
                  onChange={set('corrective')}
                  placeholder={tr('incidentForm.corrective.placeholder')}
                  style={FIELD}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>{tr('incidentForm.preventive.label')}</span>
                <input
                  value={fields.preventive}
                  onChange={set('preventive')}
                  placeholder={tr('incidentForm.preventive.placeholder')}
                  style={FIELD}
                />
              </label>
              <label style={{ display: 'block' }}>
                <span style={CAPTION}>{tr('incidentForm.clause.label')}</span>
                <input
                  value={fields.clause}
                  onChange={set('clause')}
                  placeholder={tr('incidentForm.clause.placeholder')}
                  style={FIELD_MONO}
                />
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  fontSize: '12.5px',
                  color: 'var(--text-2)',
                  alignSelf: 'end',
                  paddingBottom: '9px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={awareness}
                  onChange={(e) => setAwareness(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                {tr('incidentForm.awareness')}
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              disabled={!complete}
              style={{
                height: '42px',
                padding: '0 20px',
                border: 'none',
                borderRadius: '9px',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '13.5px',
                fontWeight: 600,
                // components/controls.md: disabled is opacity .5 + not-allowed.
                cursor: complete ? 'pointer' : 'not-allowed',
                opacity: complete ? 1 : 0.5,
              }}
            >
              {tr('incidentForm.submit')}
            </button>
            <Link
              href="/incidents"
              data-hov="s3"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '42px',
                padding: '0 18px',
                border: '1px solid var(--border-strong)',
                borderRadius: '9px',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              {tr('incidentForm.cancel')}
            </Link>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              {complete
                ? trf('incidentForm.submitNote', { n: recipients.length, sev: severity })
                : tr('incidentForm.submitHint')}
            </span>
          </div>

          {submitted && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '11px 15px',
                borderRadius: '10px',
                background: 'var(--rag-a-bg)',
                border: '1px solid var(--rag-a)',
                color: 'var(--rag-a-ink)',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              {tr('incidentForm.demoNotice')}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'sticky',
            top: '76px',
          }}
        >
          <div style={CARD}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '.4px',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                {tr('incidentForm.sev.heading')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    borderRadius: '11px',
                    background: sevTok.bg,
                    color: sevTok.ink,
                    fontSize: '17px',
                    fontWeight: 700,
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {severity}
                </span>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{tr(sev.labelKey)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {trf('incidentForm.sev.cadence', {
                      init: tr(sev.initKey),
                      upd: tr(sev.updKey),
                    })}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                  marginTop: '11px',
                  textWrap: 'pretty',
                }}
              >
                {tr(sev.defKey)}
              </div>
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--surface-2)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {tr('incidentForm.notify.heading')}
            </div>
            {recipients.map((n) => (
              <div
                key={n.whoKey}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'flex-start',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-3)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '3px' }}
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.35 }}>
                    {tr(n.whoKey)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {tr(n.roleKey)} · {tr(n.chKey)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tr(n.slaKey)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
