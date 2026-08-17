'use client';

/**
 * File: apps/web/src/app/(app)/audit-issues/[ref]/page.tsx
 * Purpose: One audit finding — the nonconformity, its CAP, its evidence and its history.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/26-audit-issue-detail.html (160 lines) under
 *   the five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   THE RECORD PANEL SITS OUTSIDE THE TABS, unlike the incident detail next
 *   door, where it belongs to the report tab alone. That is the fragment's own
 *   layout (:55 opens the two-column grid before the tab conditionals, :145
 *   closes it after) and it is the right one here: a reader on the evidence tab
 *   still needs the clause and the CAP date to judge what they are looking at.
 *
 *   THE FIVE ACTION STEPS ARE DERIVED FROM THE LIFECYCLE, NOT STORED.
 *   dc.html:4345-4350 computes each step's completion from the finding's stage,
 *   so `auditIssues.ts` needs no per-finding checklist and none is invented. The
 *   consequence is visible and intended: an Overdue finding and a Verification
 *   finding show different numbers of open actions from the same table.
 *
 *   'OVERDUE' AND 'ACCEPTED' ARE NOT LIFECYCLE STAGES. Neither appears in the
 *   five-stage list, so dc.html:4337 maps Overdue onto stage 2 (CAP in
 *   progress) and Accepted onto stage 1. That is why an overdue finding shows a
 *   red banner above a stepper that reads as being mid-flight — the banner
 *   carries the exception, the stepper carries the position. Copied as designed.
 *
 *   EVIDENCE IS ALL OR NOTHING. A finding whose `ev` is '—' gets the empty
 *   state rather than a file list with holes in it (dc.html:4353). Only
 *   AF-2026-012 is in that state in the fixture, which is what makes the empty
 *   branch reachable rather than decorative.
 *
 *   The CAP excerpt on the first evidence file is the finding's own `cap` text
 *   cut at 72 characters, so it is fixture content and is not translated — the
 *   same treatment the register gives `src` and the supplier detail gives its
 *   template fields.
 *
 * Key Components:
 *   - AuditIssueDetailPage: the screen, its four tabs and its not-found state
 *   - GRADE / STATUS: audit grade and the CAP lifecycle, shared with the register
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — audit issue detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/26-audit-issue-detail.html
 *   - apps/web/src/data/extended/auditFinding.ts — lifecycle, actions, evidence
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { auditIssues } from '@/data/auditIssues';
import {
  AUDIT_ACTIONS,
  AUDIT_ESCALATION_DATE,
  AUDIT_EVIDENCE,
  AUDIT_STEPS,
  AUDIT_TABS,
  CAP_EXCERPT_LENGTH,
  type AuditTabId,
} from '@/data/extended/auditFinding';
import { opcos } from '@/data/opcos';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

/** status.md:28 — Observation green, Minor amber, Major red. */
const GRADE: Record<string, { key: TranslationKey; rating: Rating }> = {
  Major: { key: 'audit.grade.major', rating: 'R' },
  Minor: { key: 'audit.grade.minor', rating: 'A' },
  Observation: { key: 'audit.grade.observation', rating: 'G' },
};

/** Shared with audit-issues/page.tsx:78 so the register and the record agree. */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  'CAP in progress': { key: 'audit.status.capInProgress', rating: 'A' },
  'CAP submitted': { key: 'audit.status.capSubmitted', rating: 'A' },
  Verification: { key: 'audit.status.verification', rating: 'A' },
  Overdue: { key: 'audit.status.overdue', rating: 'R' },
  Closed: { key: 'audit.status.closed', rating: 'G' },
  Accepted: { key: 'audit.status.accepted', rating: 'N' },
};

/** dc.html:4362 — the verifying party follows the source of the finding. */
const VERIFIER: Record<string, TranslationKey> = {
  'Internal audit': 'auditDetail.verifier.internal',
  'Certification body': 'auditDetail.verifier.body',
};

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

const PANEL_HEADING: React.CSSProperties = { fontSize: '12px', fontWeight: 700 };

const STRIP_HEADING: React.CSSProperties = {
  padding: '13px 18px',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)',
  fontSize: '12px',
  fontWeight: 700,
};

const RECORD_ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  fontSize: '12px',
};

const META_STRIP: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
  marginTop: '14px',
  paddingTop: '12px',
  borderTop: '1px solid var(--border)',
  flexWrap: 'wrap',
  fontSize: '11.5px',
};

const META_VALUE: React.CSSProperties = { color: 'var(--text)', fontWeight: 600 };
const META_VALUE_MONO: React.CSSProperties = { ...META_VALUE, fontFamily: 'var(--mono)' };

const ACTION_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '26px minmax(0,1fr) 190px 104px 92px',
  minWidth: '640px',
  gap: '12px',
  padding: '12px 18px',
  borderBottom: '1px solid var(--border)',
  alignItems: 'center',
  fontSize: '12.5px',
};

const GHOST_BUTTON: React.CSSProperties = {
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  background: 'var(--surface)',
  color: 'var(--text-2)',
  fontFamily: 'inherit',
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Not an invented visual: it is the design system's own disabled state, and the
 * only honest rendering of an action this port has no backend to perform. Every
 * action on this screen is one — attach, update, export and open all need a
 * store this port does not have — so only the tabs remain live.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

export default function AuditIssueDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.ref;
  const ref = Array.isArray(raw) ? raw[0] : raw;

  const [tab, setTab] = useState<AuditTabId>('finding');

  const finding = auditIssues.find((i) => i.ref === ref) ?? null;

  const back = (
    <Link
      href="/audit-issues"
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
      {tr('auditDetail.back')}
    </Link>
  );

  if (!finding) {
    return (
      <div data-screen-label="Audit issue detail">
        <DemoBadge />
        {back}
        <div style={{ ...CARD, padding: '18px', maxWidth: '560px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('auditDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('auditDetail.notFound.body', { ref: ref ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  const closed = finding.status === 'Closed';
  const overdue = finding.status === 'Overdue';
  const grade = GRADE[finding.grade];
  const gradeLabel = grade ? tr(grade.key) : finding.grade;
  const gTok = tok(grade?.rating ?? 'N');
  const statusMeta = STATUS[finding.status];
  const stTok = tok(statusMeta?.rating ?? 'N');
  const opcoName = opcos.find((o) => o.code === finding.opco)?.name ?? finding.opco;

  // dc.html:4337 — Overdue and Accepted are not stages; see the header.
  const matched = AUDIT_STEPS.findIndex((s) => s.status === finding.status);
  const stage = closed
    ? AUDIT_STEPS.length - 1
    : finding.status === 'Accepted'
      ? 1
      : Math.max(1, matched >= 0 ? matched : overdue ? 2 : 1);

  const actions = AUDIT_ACTIONS.map((a) => {
    const done =
      'always' in a.doneWhen
        ? true
        : 'closed' in a.doneWhen
          ? closed
          : stage >= a.doneWhen.minStage;
    const who =
      a.who === 'owner'
        ? finding.owner
        : a.who === 'regionalIso'
          ? tr('auditDetail.action.who.regionalIso')
          : tr(
              finding.src === 'Internal audit'
                ? 'auditDetail.action.who.internalAudit'
                : 'auditDetail.action.who.leadAuditor',
            );
    return { ...a, done, who, due: a.due === 'raised' ? finding.raised : finding.due };
  });
  const openActions = actions.filter((a) => !a.done).length;

  const hasEvidence = finding.ev !== '—';
  const evidence = hasEvidence
    ? AUDIT_EVIDENCE.map((e) => ({
        name: `${finding.ref}${e.suffix}`,
        kind: tr(e.kindKey),
        when: e.when === 'raised' ? finding.raised : finding.due,
        note: e.note === 'ev' ? finding.ev : `${finding.cap.slice(0, CAP_EXCERPT_LENGTH)}…`,
      }))
    : [];

  // dc.html:4357-4361 — three entries from the record, plus one on escalation.
  const history: { ts: string; text: string }[] = [
    {
      ts: finding.raised,
      text: trf('auditDetail.history.raised', {
        audit: finding.audit,
        owner: finding.owner,
      }),
    },
    {
      ts: finding.raised,
      text: trf('auditDetail.history.graded', {
        grade: gradeLabel,
        clause: finding.clause,
      }),
    },
    {
      ts: finding.due,
      text: closed
        ? tr('auditDetail.history.closed')
        : trf('auditDetail.history.capAgreed', { due: finding.due }),
    },
    ...(overdue ? [{ ts: AUDIT_ESCALATION_DATE, text: tr('auditDetail.history.escalated') }] : []),
  ];

  const RECORD_FIELDS: {
    labelKey: TranslationKey;
    value: string;
    style: React.CSSProperties;
  }[] = [
    {
      labelKey: 'auditDetail.record.source',
      value: finding.src,
      style: { fontWeight: 600, textAlign: 'right' },
    },
    {
      labelKey: 'auditDetail.record.audit',
      value: finding.audit,
      style: { fontWeight: 600, textAlign: 'right', lineHeight: 1.4 },
    },
    {
      labelKey: 'auditDetail.record.opco',
      value: opcoName,
      style: { fontWeight: 600, textAlign: 'right' },
    },
    { labelKey: 'auditDetail.record.owner', value: finding.owner, style: { fontWeight: 600 } },
    {
      labelKey: 'auditDetail.record.raised',
      value: finding.raised,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'auditDetail.record.capDue',
      value: finding.due,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'auditDetail.record.clause',
      value: finding.clause,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px' },
    },
    {
      labelKey: 'auditDetail.record.linked',
      value: finding.link,
      style: { fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--primary-ink)' },
    },
  ];

  return (
    <div data-screen-label="Audit issue detail">
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
              {finding.ref}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '22px',
                padding: '0 10px',
                borderRadius: '6px',
                background: gTok.bg,
                color: gTok.ink,
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {gradeLabel}
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
              {statusMeta ? tr(statusMeta.key) : finding.status}
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
            {finding.title}
          </h1>
          <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>
            {trf('auditDetail.context', {
              audit: finding.audit,
              opco: opcoName,
              clause: finding.clause,
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Both disabled: there is no evidence store and no CAP workflow
              behind this screen yet. The attach button's data-hov is dropped
              deliberately — [data-hov='s3']:hover still fires on a disabled
              element, and a hover response is the strongest claim a control can
              make that it is live. */}
          <button
            type="button"
            disabled
            title={tr('shell.inert')}
            style={{ ...GHOST_BUTTON, height: '34px', padding: '0 14px', ...INERT }}
          >
            {tr('auditDetail.attachEvidence')}
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
            {tr('auditDetail.updateCap')}
          </button>
        </div>
      </div>

      {overdue && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 15px',
            border: '1px solid var(--rag-r)',
            borderRadius: '10px',
            background: 'var(--rag-r-bg)',
            marginBottom: '16px',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--rag-r-ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4.5" />
            <circle cx="12" cy="16" r=".7" fill="currentColor" stroke="none" />
          </svg>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--rag-r-ink)' }}>
            {tr('auditDetail.overdueBanner')}
          </span>
        </div>
      )}

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
          {tr('auditDetail.lifecycle')}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5,minmax(0,1fr))',
              gap: '8px',
              minWidth: '620px',
            }}
          >
            {AUDIT_STEPS.map((step, n) => (
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
                  <div style={{ fontSize: '11.5px', fontWeight: 600, lineHeight: 1.35 }}>
                    {tr(step.labelKey)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                    {tr(
                      n < stage
                        ? 'auditDetail.step.complete'
                        : n === stage
                          ? 'auditDetail.step.current'
                          : 'auditDetail.step.pending',
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
          flexWrap: 'wrap',
        }}
      >
        {AUDIT_TABS.map((t) => {
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 320px',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          {tab === 'finding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ ...CARD, padding: '18px 20px' }}>
                <div style={{ ...PANEL_HEADING, marginBottom: '10px' }}>
                  {tr('auditDetail.finding.title')}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.65,
                    color: 'var(--text-2)',
                    textWrap: 'pretty',
                  }}
                >
                  {finding.finding}
                </div>
                <div style={META_STRIP}>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('auditDetail.label.clause')} <b style={META_VALUE_MONO}>{finding.clause}</b>
                  </span>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('auditDetail.label.grade')} <b style={META_VALUE}>{gradeLabel}</b>
                  </span>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('auditDetail.label.raised')} <b style={META_VALUE_MONO}>{finding.raised}</b>
                  </span>
                </div>
              </div>
              <div style={{ ...CARD, padding: '18px 20px' }}>
                <div style={{ ...PANEL_HEADING, marginBottom: '10px' }}>
                  {tr('auditDetail.cap.title')}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.65,
                    color: 'var(--text-2)',
                    textWrap: 'pretty',
                  }}
                >
                  {finding.cap}
                </div>
                <div style={META_STRIP}>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('auditDetail.label.owner')} <b style={META_VALUE}>{finding.owner}</b>
                  </span>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('auditDetail.label.due')} <b style={META_VALUE_MONO}>{finding.due}</b>
                  </span>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('auditDetail.label.openActions')}{' '}
                    <b style={META_VALUE_MONO}>{openActions}</b>
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'actions' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
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
                <span style={PANEL_HEADING}>{tr('auditDetail.actions.title')}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {trf('auditDetail.actions.open', { n: openActions })}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {actions.map((a) => (
                  <div key={a.taskKey} style={ACTION_ROW}>
                    <span
                      style={{
                        width: '17px',
                        height: '17px',
                        borderRadius: '5px',
                        border: '1.5px solid',
                        background: a.done ? 'var(--rag-g)' : 'transparent',
                        borderColor: a.done ? 'var(--rag-g)' : 'var(--border-strong)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    <span style={{ fontWeight: 600, lineHeight: 1.4, textWrap: 'pretty' }}>
                      {tr(a.taskKey)}
                    </span>
                    <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{a.who}</span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {a.due}
                    </span>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: a.done ? 'var(--rag-g-ink)' : 'var(--text-2)',
                      }}
                    >
                      {tr(a.done ? 'auditDetail.state.complete' : 'auditDetail.state.open')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={STRIP_HEADING}>{tr('auditDetail.evidence.title')}</div>
                {evidence.map((e) => (
                  <div
                    key={e.name}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '13px 18px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        width: '30px',
                        height: '36px',
                        borderRadius: '5px',
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-2)"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 3v5h5" />
                        <path d="M6 2h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
                      </svg>
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          fontFamily: 'var(--mono)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {e.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
                        {trf('auditDetail.evidence.meta', {
                          kind: e.kind,
                          by: finding.owner,
                          when: e.when,
                        })}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-2)',
                          marginTop: '5px',
                          lineHeight: 1.5,
                          textWrap: 'pretty',
                        }}
                      >
                        {e.note}
                      </div>
                    </div>
                    {/* Disabled: nothing hosts the file, so there is nothing to
                        open. This one sits behind the evidence tab, which is
                        why the Day-3 sweep of the default tab did not see it. */}
                    <button
                      type="button"
                      disabled
                      title={tr('shell.inert')}
                      style={{
                        ...GHOST_BUTTON,
                        height: '30px',
                        padding: '0 12px',
                        borderRadius: '7px',
                        fontSize: '12px',
                        flexShrink: 0,
                        ...INERT,
                      }}
                    >
                      {tr('auditDetail.evidence.open')}
                    </button>
                  </div>
                ))}
                {!hasEvidence && (
                  <div style={{ padding: '20px 18px', fontSize: '12.5px', color: 'var(--text-3)' }}>
                    {tr('auditDetail.evidence.none')}
                  </div>
                )}
              </div>

              <div style={{ ...CARD, padding: '18px 20px' }}>
                <div style={{ ...PANEL_HEADING, marginBottom: '12px' }}>
                  {tr('auditDetail.verification.title')}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '13px',
                    padding: '13px 15px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    background: 'var(--surface-2)',
                  }}
                >
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
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
                    1
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                      {tr('auditDetail.verification.verifiedBy')}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                      {tr(VERIFIER[finding.src] ?? 'auditDetail.verifier.customer')}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11.5px',
                      color: 'var(--text-2)',
                    }}
                  >
                    {closed ? finding.due : tr('auditDetail.verification.pending')}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-3)',
                    lineHeight: 1.6,
                    marginTop: '12px',
                    textWrap: 'pretty',
                  }}
                >
                  {tr('auditDetail.verification.note')}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={STRIP_HEADING}>{tr('auditDetail.history.title')}</div>
              {history.map((h) => (
                <div
                  key={h.text}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px minmax(0,1fr)',
                    gap: '16px',
                    padding: '12px 18px',
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
          )}
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
            {tr('auditDetail.record.title')}
          </div>
          {RECORD_FIELDS.map((f) => (
            <div key={f.labelKey} style={RECORD_ROW}>
              <span style={{ color: 'var(--text-3)' }}>{tr(f.labelKey)}</span>
              <span style={f.style}>{f.value}</span>
            </div>
          ))}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          {/* Disabled: no export pipeline exists yet. Not faked with a
              client-side file build either — that would be inventing a
              capability the design does not describe. */}
          <button
            type="button"
            disabled
            title={tr('shell.inert')}
            style={{ ...GHOST_BUTTON, height: '34px', ...INERT }}
          >
            {tr('auditDetail.exportFinding')}
          </button>
        </div>
      </div>
    </div>
  );
}
