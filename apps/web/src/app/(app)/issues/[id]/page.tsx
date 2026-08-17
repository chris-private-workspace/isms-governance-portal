'use client';

/**
 * File: apps/web/src/app/(app)/issues/[id]/page.tsx
 * Purpose: One governance issue — description, remediation checklist, activity.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/12-issue-detail.html (72 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   The fragment renders `idd`, an object the prototype built from the selected
 *   issue. Three things it supplied are not in `issues.ts`, and each is handled
 *   differently for a stated reason:
 *
 *   1. `linkedRisk` / `linkedControl` are DERIVED — the first risk and the
 *      first control belonging to the same entity, which is the rule the
 *      prototype used. So both links move when the fixture moves.
 *   2. `actions` / `activity` are the template's, held in data/extended/ with
 *      their provenance. They are the same for every issue in the prototype
 *      and are carried across at that fidelity.
 *   3. `raised` is one fixed date, likewise.
 *
 *   THE SEVERITY BADGE AND THE STATUS PILL ARE THE SAME PALETTE, deliberately:
 *   'Critical' and 'High' both resolve to red because status.md's domain table
 *   treats them as one band. Only the label separates them, exactly as on the
 *   dashboard.
 *
 *   Enumerated values (severity, status, source) go through tr(); free text
 *   carried by the fixture — the issue title, owner, entity code, dates — does
 *   not, matching how the dashboard renders its rows.
 *
 * Key Components:
 *   - IssueDetailPage: the screen, including its not-found state
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — issue detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/12-issue-detail.html
 *   - apps/web/src/data/extended/issueWorkflow.ts — where actions/activity come from
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { controls } from '@/data/controls';
import {
  ISSUE_ACTIONS,
  ISSUE_ACTIVITY,
  ISSUE_RAISED_DATE,
  type IssueActivity,
} from '@/data/extended/issueWorkflow';
import { issues } from '@/data/issues';
import { risks } from '@/data/risks';
import type { TranslationKey } from '@/i18n';
import { tok } from '@/lib/tok';

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
  padding: '18px',
};

/** components/controls.md:7 — disabled is opacity .5 with cursor not-allowed. */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

/** dc.html:3888 — High and Critical are one red band, Medium amber, Low green. */
const SEVERITY: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Critical: { rating: 'R', labelKey: 'sev.critical' },
  High: { rating: 'R', labelKey: 'sev.high' },
  Medium: { rating: 'A', labelKey: 'sev.medium' },
  Low: { rating: 'G', labelKey: 'sev.low' },
};

/** dc.html:3889 — the tok carries the label, so both live in one table here. */
const STATUS: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Overdue: { rating: 'R', labelKey: 'issueDetail.status.overdue' },
  'In progress': { rating: 'A', labelKey: 'issueDetail.status.inProgress' },
  Closed: { rating: 'G', labelKey: 'issueDetail.status.closed' },
  Open: { rating: 'N', labelKey: 'issueDetail.status.open' },
};

const SOURCE: Record<string, { labelKey: TranslationKey; lowerKey: TranslationKey }> = {
  Regulatory: {
    labelKey: 'issueDetail.source.regulatory',
    lowerKey: 'issueDetail.sourceLower.regulatory',
  },
  'Self-identified': {
    labelKey: 'issueDetail.source.selfIdentified',
    lowerKey: 'issueDetail.sourceLower.selfIdentified',
  },
  Audit: { labelKey: 'issueDetail.source.audit', lowerKey: 'issueDetail.sourceLower.audit' },
  Incident: {
    labelKey: 'issueDetail.source.incident',
    lowerKey: 'issueDetail.sourceLower.incident',
  },
};

export default function IssueDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  const issue = issues.find((i) => i.id === id) ?? null;

  const back = (
    <Link
      href="/issues"
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
      {tr('issueDetail.back')}
    </Link>
  );

  // A url the register cannot resolve is a normal outcome, not a crash: the
  // page states which reference failed and offers the way back, rather than
  // rendering a detail frame around nothing.
  if (!issue) {
    return (
      <div data-screen-label="Issue detail">
        <DemoBadge />
        {back}
        <div style={{ ...CARD, maxWidth: '560px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('issueDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('issueDetail.notFound.body', { id: id ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  const sev = SEVERITY[issue.severity] ?? { rating: 'N', labelKey: 'sev.low' as TranslationKey };
  const st = STATUS[issue.status] ?? {
    rating: 'N',
    labelKey: 'issueDetail.status.open' as TranslationKey,
  };
  const source = SOURCE[issue.source];
  const sevTok = tok(sev.rating);
  const stTok = tok(st.rating);

  // dc.html:5272 — the first record of each kind sharing the entity. Derived,
  // so a fixture change moves the links instead of leaving them pointing at
  // records that no longer describe this entity.
  const linkedRisk = risks.find((r) => r.entity === issue.entity) ?? null;
  const linkedControl = controls.find((c) => c.entity === issue.entity) ?? null;

  const sourceLabel = source ? tr(source.labelKey) : issue.source;

  const activityWho = (who: IssueActivity['who']) => {
    if ('fromOwner' in who) return issue.owner;
    if ('name' in who) return who.name;
    return tr(who.copyKey);
  };

  const activityTime = (timeKey: IssueActivity['timeKey']) =>
    typeof timeKey === 'string'
      ? tr(timeKey)
      : tr(issue.source === 'Audit' ? timeKey.audit : timeKey.other);

  return (
    <div data-screen-label="Issue detail">
      <DemoBadge />
      {back}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'var(--mono)',
                color: 'var(--primary-ink)',
                fontWeight: 600,
              }}
            >
              {issue.id}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 9px',
                borderRadius: '6px',
                background: sevTok.bg,
                fontSize: '11px',
                fontWeight: 700,
                color: sevTok.ink,
              }}
            >
              {tr(sev.labelKey)}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {sourceLabel} · {issue.entity}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-.3px',
              lineHeight: 1.2,
            }}
          >
            {issue.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 13px',
              borderRadius: '9px',
              background: stTok.bg,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: stTok.dot,
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: stTok.ink }}>
              {tr(st.labelKey)}
            </span>
          </span>
          {/* Disabled: changing an issue's status writes to a workflow the API
              does not have yet. Rendered because the design has it, but shown
              disabled per controls.md:7 rather than looking live and doing
              nothing. */}
          <button
            type="button"
            disabled
            title={tr('shell.inert')}
            style={{
              height: '36px',
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
            {tr('issueDetail.updateStatus')}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={CARD}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
              {tr('issueDetail.description')}
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
              {trf('issueDetail.desc', {
                source: source ? tr(source.lowerKey) : issue.source.toLowerCase(),
                entity: issue.entity,
                title: issue.title,
              })}
            </p>
          </div>

          <div style={CARD}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              {tr('issueDetail.actions')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {ISSUE_ACTIONS.map((a) => (
                <div
                  key={a.titleKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      border: `1.8px solid ${a.done ? 'var(--primary)' : 'var(--border-strong)'}`,
                      background: a.done ? 'var(--primary)' : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {a.done && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: a.done ? 'var(--text-3)' : 'var(--text)',
                      textDecoration: a.done ? 'line-through' : undefined,
                    }}
                  >
                    {tr(a.titleKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={CARD}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
              {tr('issueDetail.activity')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ISSUE_ACTIVITY.map((ac) => (
                <div key={ac.actionKey} style={{ display: 'flex', gap: '13px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: ac.dot,
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    />
                    <span style={{ width: '2px', flex: 1, background: 'var(--border)' }} />
                  </div>
                  <div style={{ paddingBottom: '15px' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--text)' }}>
                      <b style={{ fontWeight: 600 }}>{activityWho(ac.who)}</b> {tr(ac.actionKey)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                      {activityTime(ac.timeKey)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={CARD}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
              {tr('issueDetail.details')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-3)' }}>{tr('issueDetail.field.source')}</span>
                <span style={{ fontWeight: 600 }}>{sourceLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-3)' }}>{tr('issueDetail.field.entity')}</span>
                <span style={{ fontWeight: 600 }}>{issue.entity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-3)' }}>{tr('issueDetail.field.owner')}</span>
                <span style={{ fontWeight: 600 }}>{issue.owner}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-3)' }}>{tr('issueDetail.field.raised')}</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {ISSUE_RAISED_DATE}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-3)' }}>{tr('issueDetail.field.due')}</span>
                {/* The due date carries the status colour — an overdue issue is
                    red HERE and nowhere else in this panel (fragment :57). */}
                <span style={{ fontWeight: 600, fontFamily: 'var(--mono)', color: stTok.ink }}>
                  {issue.due}
                </span>
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              {tr('issueDetail.linkedItems')}
            </div>
            {/* Plain divs, not links: the fragment gives neither an onClick nor
                cursor:pointer, so they are labels rather than controls. Wrapping
                them in a Link would invent an affordance the design withheld. */}
            {linkedRisk && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 11px',
                  border: '1px solid var(--border)',
                  borderRadius: '9px',
                  marginBottom: '8px',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-3)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 2 20h20L12 3z" />
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      lineHeight: 1.3,
                    }}
                  >
                    {linkedRisk.title}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {linkedRisk.id}
                  </div>
                </div>
              </div>
            )}
            {linkedControl && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 11px',
                  border: '1px solid var(--border)',
                  borderRadius: '9px',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-3)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                </svg>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      lineHeight: 1.3,
                    }}
                  >
                    {linkedControl.name}
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {linkedControl.id}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
