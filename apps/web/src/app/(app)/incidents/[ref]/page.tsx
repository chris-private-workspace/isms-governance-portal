'use client';

/**
 * File: apps/web/src/app/(app)/incidents/[ref]/page.tsx
 * Purpose: One security incident — its lifecycle, who was told, and what was done.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/18-incident-detail.html (152 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   TWO COLOUR RULES IN dc.html ARE NOT FOLLOWED, and both departures are the
 *   same argument: the incident register already ships a mapping, and two
 *   screens disagreeing about what one record's colour means is worse than
 *   either choice.
 *     - severity. dc.html:3988-3996 paints S2 amber and S3 neutral;
 *       components/status.md:27 maps S1/S2 to R, S3 to A, S4 to G, and
 *       incidents/page.tsx:56 already implements it. status.md wins.
 *     - status. dc.html:4485 paints Investigation red; incidents/page.tsx:65
 *       paints the three working states amber and reserves red for Notified,
 *       the point at which somebody outside has been told. The register wins,
 *       and the same i18n keys are reused so the two screens cannot drift.
 *
 *   THE LIFECYCLE HAS TWO QUIRKS AND BOTH ARE THE DESIGN'S. dc.html:4545-4546
 *   matches the record's status against eight step names — but 'Corrective
 *   action', which three fixture rows carry, is not one of them ('Corrective &
 *   preventive action' is), so those incidents fall back to step 3. And the
 *   floor of 2 means no incident ever displays as being at step 1 or 2. Copied
 *   rather than corrected: inventing the mapping would be inventing a workflow
 *   rule, and the register has the same behaviour.
 *
 *   THE RCA COMPLETION DATE IS WRONG BY CONSTRUCTION AND IS KEPT ANYWAY.
 *   dc.html:4558 builds it as `reported.slice(0,8) + '14'` — the 14th of the
 *   month the incident was reported in, which for INC-2026-0148 (reported
 *   2026-07-27) yields a due date of 2026-07-14, thirteen days before the
 *   incident was reported. It is visible on screen. Left as the design computes
 *   it, and reported, because replacing it would invent an SLA the procedure
 *   does not state.
 *
 *   NO S4 DEFINITION EXISTS IN THE HANDOFF, so the severity paragraph in the
 *   record panel renders only when there is one. An empty space is honest; an
 *   invented definition of a trivial incident is a governance claim.
 *
 * Key Components:
 *   - IncidentDetailPage: the screen, its four tabs and its not-found state
 *   - SEVERITY / STATUS: the two mappings shared with the register
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — incident detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/18-incident-detail.html
 *   - apps/web/src/data/extended/incidentWorkflow.ts — lifecycle, severity, notification matrix
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import {
  INCIDENT_REVIEWER_NAME,
  INCIDENT_SEVERITY,
  INCIDENT_STEPS,
  INCIDENT_TABS,
  NOTIFY_MATRIX,
  type IncidentTabId,
} from '@/data/extended/incidentWorkflow';
import { incidents } from '@/data/incidents';
import { opcos } from '@/data/opcos';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

/** status.md:27 — S1 and S2 are one red band, S3 amber, S4 green. */
const SEVERITY: Record<string, Rating> = { S1: 'R', S2: 'R', S3: 'A', S4: 'G' };

/** Shared with incidents/page.tsx:65 so the register and the record agree. */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  Investigation: { key: 'incidents.status.investigation', rating: 'A' },
  'Root cause analysis': { key: 'incidents.status.rca', rating: 'A' },
  'Corrective action': { key: 'incidents.status.corrective', rating: 'A' },
  Notified: { key: 'incidents.status.notified', rating: 'R' },
  Closed: { key: 'incidents.status.closed', rating: 'G' },
};

/** dc.html:4560 / 4561 — the two fixed target dates the prototype prints. */
const CORRECTIVE_EXECUTION_DATE = '2026-08-20';
const PREVENTIVE_EXECUTION_DATE = '2026-09-15';

/** dc.html:4556 — the first two recipients have acknowledged, the rest have not. */
const ACKNOWLEDGED_ROWS = 2;

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

/** components/controls.md:7 — disabled is opacity .5 with cursor not-allowed. */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

const PANEL_HEADING: React.CSSProperties = { fontSize: '12px', fontWeight: 700 };

const RECORD_ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  fontSize: '12px',
};

const RECORD_KEY: React.CSSProperties = { color: 'var(--text-3)' };

const TABLE_HEAD: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 130px 130px 120px',
  minWidth: '820px',
  gap: '14px',
  padding: '10px 18px',
  borderBottom: '1px solid var(--border)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
};

const SUB_CARD_TITLE: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  marginBottom: '9px',
};

const SUB_CARD_BODY: React.CSSProperties = {
  fontSize: '12.5px',
  lineHeight: 1.6,
  color: 'var(--text-2)',
  textWrap: 'pretty',
};

const SUB_CARD_FIELDS: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginTop: '12px',
  fontSize: '11.5px',
};

const FIELD_VALUE: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 };

export default function IncidentDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.ref;
  const ref = Array.isArray(raw) ? raw[0] : raw;

  const [tab, setTab] = useState<IncidentTabId>('report');

  const incident = incidents.find((i) => i.ref === ref) ?? null;

  const back = (
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
      <IconChevronLeft width="15" height="15" stroke="currentColor" strokeWidth="2" />
      {tr('incidentDetail.back')}
    </Link>
  );

  if (!incident) {
    return (
      <div data-screen-label="Incident detail">
        <DemoBadge />
        {back}
        <div style={{ ...CARD, padding: '18px', maxWidth: '560px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('incidentDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('incidentDetail.notFound.body', { ref: ref ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  const closed = incident.status === 'Closed';
  const sevTok = tok(SEVERITY[incident.sev] ?? 'N');
  const severity = INCIDENT_SEVERITY[incident.sev];
  const statusMeta = STATUS[incident.status];
  const stTok = tok(statusMeta?.rating ?? 'N');
  const opcoName = opcos.find((o) => o.code === incident.opco)?.name ?? incident.opco;

  // dc.html:4546 — see the header: the floor of 2 and the unmatched
  // 'Corrective action' status are both the design's, not a porting slip.
  const matched = INCIDENT_STEPS.findIndex((s) => s.status === incident.status);
  const stage = closed ? INCIDENT_STEPS.length - 1 : Math.max(2, matched >= 0 ? matched : 2);

  // dc.html:4557-4562 — five entries built from the record's own timestamps.
  const history: { ts: string; text: string }[] = [
    { ts: incident.occurred, text: tr('incidentDetail.history.occurred') },
    { ts: incident.discovered, text: tr('incidentDetail.history.detected') },
    {
      ts: `${incident.reported} 10:05`,
      text: trf('incidentDetail.history.classified', { sev: incident.sev }),
    },
    { ts: `${incident.reported} 11:20`, text: tr('incidentDetail.history.containment') },
    { ts: `${incident.reported} 16:45`, text: tr('incidentDetail.history.firstUpdate') },
  ];

  const RECORD_FIELDS: {
    labelKey: TranslationKey;
    value: string;
    style: React.CSSProperties;
  }[] = [
    {
      labelKey: 'incidentDetail.record.opco',
      value: opcoName,
      style: { fontWeight: 600, textAlign: 'right' },
    },
    { labelKey: 'incidentDetail.record.bu', value: incident.bu, style: { fontWeight: 600 } },
    {
      labelKey: 'incidentDetail.record.ticket',
      value: incident.ticket,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'incidentDetail.record.occurred',
      value: incident.occurred,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'incidentDetail.record.discovered',
      value: incident.discovered,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'incidentDetail.record.type',
      value: incident.type,
      style: { fontWeight: 600, textAlign: 'right' },
    },
    { labelKey: 'incidentDetail.record.owner', value: incident.owner, style: { fontWeight: 600 } },
    {
      labelKey: 'incidentDetail.record.close',
      value: incident.close,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'incidentDetail.record.clause',
      value: incident.clause,
      style: { fontFamily: 'var(--mono)', fontSize: '11px', textAlign: 'right' },
    },
  ];

  const notifyRows = NOTIFY_MATRIX[incident.sev] ?? [];

  // dc.html:4558 — see the header. The date can precede the report date.
  const rcaCompleted = closed
    ? incident.close
    : trf('incidentDetail.rca.due', { date: `${incident.reported.slice(0, 8)}14` });

  const approvalDate = closed ? incident.close : tr('incidentDetail.approval.pending');

  return (
    <div data-screen-label="Incident detail">
      <DemoBadge />
      {back}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '7px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--primary-ink)',
              }}
            >
              {incident.ref}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '22px',
                padding: '0 10px',
                borderRadius: '6px',
                background: sevTok.bg,
                color: sevTok.ink,
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'var(--mono)',
              }}
            >
              {severity ? tr(severity.labelKey) : incident.sev}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: stTok.ink,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: stTok.dot,
                }}
              />
              {statusMeta ? tr(statusMeta.key) : incident.status}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '21px',
              fontWeight: 700,
              letterSpacing: '-.3px',
              lineHeight: 1.3,
              maxWidth: '760px',
              textWrap: 'pretty',
            }}
          >
            {incident.title}
          </h1>
          <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>
            {opcoName} · {incident.bu} · {incident.location}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Both disabled: generating a report and publishing an update each
              need a server this port does not have. Rendered as designed but
              shown disabled per controls.md:7, and the export button's hover
              declaration is dropped — a hover response reads as 'live'. */}
          <button
            type="button"
            disabled
            title={tr('shell.inert')}
            style={{
              height: '34px',
              padding: '0 14px',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              ...INERT,
            }}
          >
            {tr('incidentDetail.export')}
          </button>
          <button
            type="button"
            disabled
            title={tr('shell.inert')}
            style={{
              height: '34px',
              padding: '0 14px',
              border: 'none',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              ...INERT,
            }}
          >
            {tr('incidentDetail.issueUpdate')}
          </button>
        </div>
      </div>

      <div style={{ ...CARD, padding: '18px 20px', marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '.4px',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
            marginBottom: '14px',
          }}
        >
          {tr('incidentDetail.workflow')}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8,minmax(0,1fr))',
              gap: '8px',
              minWidth: '880px',
            }}
          >
            {INCIDENT_STEPS.map((step, n) => (
              <div
                key={step.status}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background:
                        n < stage
                          ? 'var(--rag-g)'
                          : n === stage
                            ? 'var(--primary)'
                            : 'var(--surface-3)',
                      color: n <= stage ? '#fff' : 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      flexShrink: 0,
                    }}
                  >
                    {n + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      height: '2px',
                      background: n < stage ? 'var(--rag-g)' : 'var(--border)',
                      borderRadius: '2px',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      lineHeight: 1.35,
                      textWrap: 'pretty',
                    }}
                  >
                    {tr(step.labelKey)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {tr(
                      n < stage
                        ? 'incidentDetail.step.complete'
                        : n === stage
                          ? 'incidentDetail.step.inProgress'
                          : 'incidentDetail.step.pending',
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          background: 'var(--surface-3)',
          borderRadius: '9px',
          padding: '3px',
          marginBottom: '16px',
          width: 'fit-content',
        }}
      >
        {INCIDENT_TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                height: '32px',
                padding: '0 15px',
                border: `1px solid ${on ? 'var(--border-strong)' : 'transparent'}`,
                borderRadius: '7px',
                background: on ? 'var(--surface)' : 'transparent',
                color: on ? 'var(--primary-ink)' : 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tr(t.labelKey)}
            </button>
          );
        })}
      </div>

      {tab === 'report' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 320px',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ ...CARD, padding: '18px 20px' }}>
              <div style={{ ...PANEL_HEADING, marginBottom: '12px' }}>
                {tr('incidentDetail.desc.title')}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: 'var(--text-2)',
                  textWrap: 'pretty',
                }}
              >
                {incident.desc}
              </div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
              <div style={{ ...PANEL_HEADING, marginBottom: '10px' }}>
                {tr('incidentDetail.impact.title')}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: 'var(--text-2)',
                  textWrap: 'pretty',
                }}
              >
                {incident.impact}
              </div>
            </div>

            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '12px 18px',
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  ...PANEL_HEADING,
                }}
              >
                {tr('incidentDetail.history.title')}
              </div>
              {history.map((h) => (
                <div
                  key={h.text}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '150px minmax(0,1fr)',
                    gap: '16px',
                    padding: '11px 18px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12.5px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11.5px',
                      color: 'var(--text-3)',
                    }}
                  >
                    {h.ts}
                  </span>
                  <span style={{ color: 'var(--text-2)', lineHeight: 1.5, textWrap: 'pretty' }}>
                    {h.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...CARD,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '11px',
            }}
          >
            <div style={{ ...PANEL_HEADING, marginBottom: '2px' }}>
              {tr('incidentDetail.record.title')}
            </div>
            {RECORD_FIELDS.map((f) => (
              <div key={f.labelKey} style={RECORD_ROW}>
                <span style={RECORD_KEY}>{tr(f.labelKey)}</span>
                <span style={f.style}>{f.value}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
            {severity && (
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                  textWrap: 'pretty',
                }}
              >
                {tr(severity.defKey)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'workflow' && (
        <div style={{ ...CARD, overflow: 'auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '13px 18px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={PANEL_HEADING}>{tr('incidentDetail.notify.title')}</span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              {trf('incidentDetail.notify.meta', {
                init: severity ? tr(severity.initKey) : '—',
                upd: severity ? tr(severity.updKey) : '—',
              })}
            </span>
          </div>
          <div style={TABLE_HEAD}>
            <span>{tr('incidentDetail.notify.col.recipient')}</span>
            <span>{tr('incidentDetail.notify.col.role')}</span>
            <span>{tr('incidentDetail.notify.col.channel')}</span>
            <span>{tr('incidentDetail.notify.col.requiredBy')}</span>
            <span>{tr('incidentDetail.notify.col.delivery')}</span>
          </div>
          {notifyRows.map((n, index) => {
            const acknowledged = index < ACKNOWLEDGED_ROWS;
            return (
              <div
                key={`${n.whoKey}-${n.roleKey}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.4fr) 130px 130px 120px',
                  minWidth: '820px',
                  gap: '14px',
                  padding: '11px 18px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12.5px',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600 }}>{tr(n.whoKey)}</span>
                <span style={{ color: 'var(--text-2)' }}>{tr(n.roleKey)}</span>
                <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{tr(n.channelKey)}</span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  {tr(n.slaKey)}
                </span>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: acknowledged ? 'var(--rag-g-ink)' : 'var(--text-3)',
                  }}
                >
                  {tr(
                    acknowledged
                      ? 'incidentDetail.notify.acknowledged'
                      : 'incidentDetail.notify.delivered',
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ ...CARD, padding: '18px 20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '11px',
              }}
            >
              <span style={PANEL_HEADING}>{tr('incidentDetail.rca.title')}</span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontFamily: 'var(--mono)',
                  padding: '2px 7px',
                  borderRadius: '5px',
                  background: 'var(--surface-3)',
                  color: 'var(--text-2)',
                }}
              >
                {tr('incidentDetail.rca.mandatory')}
              </span>
            </div>
            <div
              style={{
                fontSize: '13px',
                lineHeight: 1.65,
                color: 'var(--text-2)',
                textWrap: 'pretty',
              }}
            >
              {/* dc.html:4557 — Level 3 gets a different sentence, not a
                  different section: the record still exists, it is simply not
                  mandatory. */}
              {tr(
                incident.sev === 'S3' ? 'incidentDetail.rca.causeS3' : 'incidentDetail.rca.cause',
              )}
            </div>
            <div style={{ display: 'flex', gap: '26px', marginTop: '13px', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-3)' }}>
                {tr('incidentDetail.rca.party')} <b style={FIELD_VALUE}>{incident.owner}</b>
              </span>
              <span style={{ color: 'var(--text-3)' }}>
                {tr('incidentDetail.rca.completed')}{' '}
                <b style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)', fontSize: '11.5px' }}>
                  {rcaCompleted}
                </b>
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
              gap: '14px',
            }}
          >
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={SUB_CARD_TITLE}>{tr('incidentDetail.work.title')}</div>
              <div style={SUB_CARD_BODY}>{tr('incidentDetail.work.plan')}</div>
              <div style={SUB_CARD_FIELDS}>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.owner')} <b style={FIELD_VALUE}>{incident.owner}</b>
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.execution')}{' '}
                  <b style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)' }}>{incident.reported}</b>
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.status')}{' '}
                  <b style={FIELD_VALUE}>
                    {tr(
                      closed ? 'incidentDetail.state.complete' : 'incidentDetail.state.inProgress',
                    )}
                  </b>
                </span>
              </div>
            </div>

            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={SUB_CARD_TITLE}>{tr('incidentDetail.corr.title')}</div>
              <div style={SUB_CARD_BODY}>{tr('incidentDetail.corr.plan')}</div>
              <div style={SUB_CARD_FIELDS}>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.owner')} <b style={FIELD_VALUE}>{incident.owner}</b>
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.execution')}{' '}
                  <b style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)' }}>
                    {CORRECTIVE_EXECUTION_DATE}
                  </b>
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.car')}{' '}
                  <b style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)' }}>
                    CAR-2026-{incident.ref.slice(-3)}
                  </b>
                </span>
              </div>
            </div>

            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={SUB_CARD_TITLE}>{tr('incidentDetail.prev.title')}</div>
              <div style={SUB_CARD_BODY}>{tr('incidentDetail.prev.plan')}</div>
              <div style={SUB_CARD_FIELDS}>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.owner')}{' '}
                  <b style={FIELD_VALUE}>{tr('incidentDetail.who.regionalIso')}</b>
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.execution')}{' '}
                  <b style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)' }}>
                    {PREVENTIVE_EXECUTION_DATE}
                  </b>
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  {tr('incidentDetail.field.status')}{' '}
                  <b style={FIELD_VALUE}>{tr('incidentDetail.state.planned')}</b>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'approval' && (
        <div style={{ ...CARD, padding: '20px', maxWidth: '660px' }}>
          <div style={{ ...PANEL_HEADING, marginBottom: '16px' }}>
            {tr('incidentDetail.approval.title')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(
              [
                {
                  n: 1,
                  titleKey: 'incidentDetail.approval.reviewed' as TranslationKey,
                  who: trf('incidentDetail.approval.reviewerRole', {
                    name: INCIDENT_REVIEWER_NAME,
                  }),
                },
                {
                  n: 2,
                  titleKey: 'incidentDetail.approval.approved' as TranslationKey,
                  who: tr('incidentDetail.who.isc'),
                },
              ] as const
            ).map((row) => (
              <div
                key={row.n}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '13px',
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  background: 'var(--surface-2)',
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--primary-tint)',
                    color: 'var(--primary-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {row.n}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{tr(row.titleKey)}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {row.who}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  {approvalDate}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--text-3)',
              lineHeight: 1.6,
              marginTop: '16px',
              textWrap: 'pretty',
            }}
          >
            {tr('incidentDetail.approval.note')}
          </div>
        </div>
      )}
    </div>
  );
}
