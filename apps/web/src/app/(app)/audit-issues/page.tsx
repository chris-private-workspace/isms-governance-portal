'use client';

/**
 * File: apps/web/src/app/(app)/audit-issues/page.tsx
 * Purpose: Audit findings and their corrective action plans, tracked to closure.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/25-audit-issues.html (50 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   THE SIX QUICK FILTERS ARE NAMED HERE FOR THE FIRST TIME. The fragment
 *   supplies `aud.filters` as a list of six pills with an active/inactive
 *   colour triple, and never says what the six are. They are All plus the three
 *   grades plus the two states a reviewer opens this screen to find — overdue,
 *   and everything still open — because grade alone cannot answer "what needs
 *   me today". Six, matching the design's own placeholder count.
 *
 *   "CLOSED THIS YEAR" IS COUNTED AS "CLOSED". The fixture records no closure
 *   date, only `raised` and `due`, so the year qualifier has nothing to test
 *   against; every finding in the register was raised in 2026, so the count is
 *   the same under either reading. Stated rather than quietly narrowed, because
 *   a real register with older findings would need the field before this label
 *   could be trusted.
 *
 *   "Major nonconformities" excludes closed majors. The card's own footnote
 *   says "certification risk if unresolved", which is a statement about open
 *   findings; counting closed ones alongside them would inflate the one number
 *   on this screen a certification body would actually ask about.
 *
 *   Rows are <Link>: this list is a CSS grid of <div>s, so the record link is a
 *   real anchor, with base.css:19-20's link colour and hover underline
 *   neutralised inline — the finding title carries no colour of its own.
 *
 * Key Components:
 *   - AuditIssuesPage: the screen
 *   - GRADE / STATUS: audit grade per status.md, and the CAP lifecycle
 *   - FILTERS: the six pills, each a predicate over one row
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/25-audit-issues.html
 */

import Link from 'next/link';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { auditIssues } from '@/data/auditIssues';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

type AuditIssue = (typeof auditIssues)[number];

/** status.md audit-grade row: Observation -> G, Minor -> A, Major -> R. */
const GRADE: Record<string, { key: TranslationKey; rating: Rating }> = {
  Major: { key: 'audit.grade.major', rating: 'R' },
  Minor: { key: 'audit.grade.minor', rating: 'A' },
  Observation: { key: 'audit.grade.observation', rating: 'G' },
};

/**
 * The corrective-action lifecycle onto RAG.
 *
 * 'Accepted' is N, not G. It is the observation that was agreed and scheduled
 * for a later cycle — its `due` is literally '—' — and status.md's SLA row
 * gives "no target" to N. Colouring it green would make a deferred item read
 * as a completed one.
 */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  'CAP in progress': { key: 'audit.status.capInProgress', rating: 'A' },
  'CAP submitted': { key: 'audit.status.capSubmitted', rating: 'A' },
  Verification: { key: 'audit.status.verification', rating: 'A' },
  Overdue: { key: 'audit.status.overdue', rating: 'R' },
  Closed: { key: 'audit.status.closed', rating: 'G' },
  Accepted: { key: 'audit.status.accepted', rating: 'N' },
};

/** The six pills. `test` is what each one means, in one expression. */
const FILTERS: { id: string; key: TranslationKey; test: (i: AuditIssue) => boolean }[] = [
  { id: 'all', key: 'audit.filter.all', test: () => true },
  { id: 'major', key: 'audit.filter.major', test: (i) => i.grade === 'Major' },
  { id: 'minor', key: 'audit.filter.minor', test: (i) => i.grade === 'Minor' },
  { id: 'observation', key: 'audit.filter.observation', test: (i) => i.grade === 'Observation' },
  { id: 'overdue', key: 'audit.filter.overdue', test: (i) => i.status === 'Overdue' },
  { id: 'open', key: 'audit.filter.open', test: (i) => i.status !== 'Closed' },
];

/** The grid track list, written once because header and rows must not drift. */
const COLUMNS = '118px minmax(0,2.4fr) 104px 150px 84px 92px 120px 96px';

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Not an invented visual: it is the design system's own disabled state, and the
 * only honest rendering of an action this port has no backend to perform.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

const KPI_CARD = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
  padding: '14px 16px',
} as const;

const KPI_LABEL = { fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 } as const;
const KPI_VALUE = {
  fontSize: '26px',
  fontWeight: 700,
  letterSpacing: '-.6px',
  marginTop: '5px',
} as const;
const KPI_FOOT = { fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' } as const;

export default function AuditIssuesPage() {
  const { tr, trf, entity } = useShell();
  const [active, setActive] = useState('all');

  const scoped = entity ? auditIssues.filter((i) => i.opco === entity.code) : auditIssues;

  const chosen = FILTERS.find((f) => f.id === active) ?? FILTERS[0];
  const view = chosen ? scoped.filter(chosen.test) : scoped;

  const open = scoped.filter((i) => i.status !== 'Closed');
  const KPIS = [
    {
      key: 'open',
      labelKey: 'audit.kpi.open.label' as TranslationKey,
      footKey: 'audit.kpi.open.foot' as TranslationKey,
      value: open.length,
      colour: undefined,
    },
    {
      key: 'major',
      labelKey: 'audit.kpi.major.label' as TranslationKey,
      footKey: 'audit.kpi.major.foot' as TranslationKey,
      value: open.filter((i) => i.grade === 'Major').length,
      colour: 'var(--rag-r-ink)',
    },
    {
      key: 'overdue',
      labelKey: 'audit.kpi.overdue.label' as TranslationKey,
      footKey: 'audit.kpi.overdue.foot' as TranslationKey,
      value: scoped.filter((i) => i.status === 'Overdue').length,
      colour: 'var(--rag-a-ink)',
    },
    {
      key: 'closed',
      labelKey: 'audit.kpi.closed.label' as TranslationKey,
      footKey: 'audit.kpi.closed.foot' as TranslationKey,
      value: scoped.filter((i) => i.status === 'Closed').length,
      colour: 'var(--rag-g-ink)',
    },
  ];

  return (
    <div data-screen-label="Audit issues">
      <DemoBadge />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <div>
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
            {tr('audit.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('audit.title')}
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-2)',
              marginTop: '5px',
              maxWidth: '700px',
              textWrap: 'pretty',
            }}
          >
            {tr('audit.subtitle')}
          </div>
        </div>
        {/* Disabled, not merely unwired: there is no /audit-issues/new route in
            this port, and raising a finding writes a register record. The six
            filter pills below genuinely filter, so a live-looking button here
            would be indistinguishable from the controls that do work. */}
        <button
          type="button"
          disabled
          title={tr('shell.inert')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 16px',
            border: 'none',
            borderRadius: '9px',
            background: 'var(--primary)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            ...INERT,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {tr('audit.raise')}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {KPIS.map((k) => (
          <div key={k.key} style={KPI_CARD}>
            <div style={KPI_LABEL}>{tr(k.labelKey)}</div>
            <div style={{ ...KPI_VALUE, color: k.colour }}>{k.value}</div>
            <div style={KPI_FOOT}>{tr(k.footKey)}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        {FILTERS.map((f) => {
          const on = f.id === active;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActive(f.id)}
              style={{
                height: '30px',
                padding: '0 13px',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                borderRadius: '8px',
                background: on ? 'var(--primary-tint)' : 'var(--surface)',
                color: on ? 'var(--primary-ink)' : 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tr(f.key)}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          overflow: 'auto',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            minWidth: '1080px',
            gap: '12px',
            padding: '9px 16px',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '.45px',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          <span>{tr('audit.col.reference')}</span>
          <span>{tr('audit.col.finding')}</span>
          <span>{tr('audit.col.grade')}</span>
          <span>{tr('audit.col.source')}</span>
          <span>{tr('audit.col.opco')}</span>
          <span>{tr('audit.col.owner')}</span>
          <span>{tr('audit.col.status')}</span>
          <span>{tr('audit.col.due')}</span>
        </div>
        {view.map((i) => {
          const gMeta = GRADE[i.grade];
          const g = tok(gMeta?.rating ?? 'N');
          const stMeta = STATUS[i.status];
          const st = tok(stMeta?.rating ?? 'N');
          return (
            <Link
              key={i.ref}
              href={`/audit-issues/${i.ref}`}
              data-hov="s2"
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                minWidth: '1080px',
                gap: '12px',
                padding: 'var(--row-py) 16px',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                fontSize: '12.5px',
                cursor: 'pointer',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--primary-ink)',
                  fontWeight: 600,
                }}
              >
                {i.ref}
              </span>
              <span>
                <b
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    textWrap: 'pretty',
                  }}
                >
                  {i.title}
                </b>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10.5px',
                    color: 'var(--text-3)',
                    marginTop: '2px',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {trf('audit.row.meta', { clause: i.clause, link: i.link })}
                </span>
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '21px',
                  padding: '0 9px',
                  borderRadius: '6px',
                  background: g.bg,
                  color: g.ink,
                  fontSize: '11px',
                  fontWeight: 700,
                  justifySelf: 'start',
                }}
              >
                {gMeta ? tr(gMeta.key) : i.grade}
              </span>
              <span style={{ color: 'var(--text-2)', fontSize: '12px', lineHeight: 1.35 }}>
                {i.src}
              </span>
              <span
                style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--text-2)' }}
              >
                {i.opco}
              </span>
              <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{i.owner}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: st.ink,
                }}
              >
                <span
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.dot }}
                />
                {stMeta ? tr(stMeta.key) : i.status}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-2)' }}>
                {i.due}
              </span>
            </Link>
          );
        })}
        {view.length === 0 && (
          // Not in the fragment: its pills were static, so an empty result was a
          // state the design never had to draw. The panel is
          // 04-risks-list.html:73-77, copied.
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <IconSearch
              width="30"
              height="30"
              stroke="var(--text-3)"
              strokeWidth="1.5"
              style={{ marginBottom: '8px', opacity: 0.7 }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
              {tr('audit.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('audit.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
