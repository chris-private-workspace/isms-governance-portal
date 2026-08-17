'use client';

/**
 * File: apps/web/src/app/(app)/incidents/page.tsx
 * Purpose: The security incident register — what is open, at what level, with whom.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/16-incidents-list.html (58 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   THE FRAGMENT CONTRADICTS THE CHARTER IN ONE PLACE and it is a literal: the
 *   first KPI's footnote reads "across 14 APAC OpCos" (:22). This project has
 *   13, India and China being out of scope and Japan being headquarters rather
 *   than an operating entity. It is computed from `opcos` here — and it counts
 *   the OpCos IN SCOPE, so selecting one entity in the topbar says 1 rather
 *   than continuing to claim the region.
 *
 *   "CLOSED THIS QUARTER" IS ACTUALLY THIS QUARTER. The count matches each
 *   incident's close date against the period selected in the topbar, so the
 *   label stays true when the period changes instead of quietly meaning "closed
 *   at any time". A period that is not a quarter — FY2025 — matches nothing,
 *   which is the correct answer for this fixture rather than a special case.
 *
 *   Rows are <Link>: this list is a CSS grid of <div>s, not a table, so the
 *   record link is a real anchor. Turning that <div> into an <a> picks up
 *   base.css:19-20 (primary-ink, underline on hover), so colour and decoration
 *   are neutralised inline. Nothing else about the row changes.
 *
 * Key Components:
 *   - IncidentsPage: the screen
 *   - SEVERITY / STATUS: S1-S4 per status.md, and the lifecycle onto RAG
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/16-incidents-list.html
 */

import Link from 'next/link';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { incidents } from '@/data/incidents';
import { opcos } from '@/data/opcos';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

/** status.md incident-severity row: S1 / S2 is one red band, S3 amber, S4 green. */
const SEVERITY: Record<string, Rating> = { S1: 'R', S2: 'R', S3: 'A', S4: 'G' };

/**
 * Lifecycle onto RAG.
 *
 * 'Notified' is red rather than amber: it is the state in which a customer or a
 * regulator has been told, which is the point at which the incident stops being
 * an internal matter. The three working states are amber, closed is green.
 */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  Investigation: { key: 'incidents.status.investigation', rating: 'A' },
  'Root cause analysis': { key: 'incidents.status.rca', rating: 'A' },
  'Corrective action': { key: 'incidents.status.corrective', rating: 'A' },
  Notified: { key: 'incidents.status.notified', rating: 'R' },
  Closed: { key: 'incidents.status.closed', rating: 'G' },
};

const RCA_STATES = ['Investigation', 'Root cause analysis'];

/** The grid track list, written once because header and rows must not drift. */
const COLUMNS = '118px minmax(0,2.6fr) 76px 1.1fr 96px 116px 1fr';

/** '2026-07-18' -> '2026-Q3', matching the topbar's period labels. */
function quarterOf(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getUTCFullYear()}-Q${Math.floor(parsed.getUTCMonth() / 3) + 1}`;
}

const KPI_CARD = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '11px',
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
const HEAD_CELL = {
  display: 'grid',
  gridTemplateColumns: COLUMNS,
  minWidth: '1020px',
  gap: '14px',
  padding: '10px 16px',
  borderBottom: '1px solid var(--border)',
  background: 'var(--surface-2)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
} as const;

export default function IncidentsPage() {
  const { tr, trf, entity, periodLabel } = useShell();

  const view = entity ? incidents.filter((i) => i.opco === entity.code) : incidents;

  const openRows = view.filter((i) => i.status !== 'Closed');
  const kOpen = openRows.length;
  const kS1 = openRows.filter((i) => i.sev === 'S1').length;
  const kRca = view.filter((i) => RCA_STATES.includes(i.status)).length;
  const kClosed = view.filter(
    (i) => i.status === 'Closed' && quarterOf(i.close) === periodLabel,
  ).length;

  // The fragment's "14 APAC OpCos" — the charter's 13, and 1 once the topbar
  // narrows to a single entity, because the sentence describes what is shown.
  const opcoCount = entity ? 1 : opcos.length;

  const KPIS = [
    {
      key: 'open',
      labelKey: 'incidents.kpi.open.label' as TranslationKey,
      value: kOpen,
      colour: undefined,
      foot: trf('incidents.kpi.open.foot', { n: opcoCount }),
    },
    {
      key: 's1',
      labelKey: 'incidents.kpi.s1.label' as TranslationKey,
      value: kS1,
      colour: 'var(--rag-r-ink)',
      foot: tr('incidents.kpi.s1.foot'),
    },
    {
      key: 'rca',
      labelKey: 'incidents.kpi.rca.label' as TranslationKey,
      value: kRca,
      colour: 'var(--rag-a-ink)',
      foot: tr('incidents.kpi.rca.foot'),
    },
    {
      key: 'closed',
      labelKey: 'incidents.kpi.closed.label' as TranslationKey,
      value: kClosed,
      colour: 'var(--rag-g-ink)',
      foot: tr('incidents.kpi.closed.foot'),
    },
  ];

  return (
    <div data-screen-label="Security incidents — register">
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
            {tr('incidents.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('incidents.title')}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '5px' }}>
            {tr('incidents.subtitle')}
          </div>
        </div>
        <Link
          href="/incidents/new"
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
            textDecoration: 'none',
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
          {tr('incidents.report')}
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        {KPIS.map((k) => (
          <div key={k.key} style={KPI_CARD}>
            <div style={KPI_LABEL}>{tr(k.labelKey)}</div>
            <div style={{ ...KPI_VALUE, color: k.colour }}>{k.value}</div>
            <div style={KPI_FOOT}>{k.foot}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          overflow: 'auto',
        }}
      >
        <div style={HEAD_CELL}>
          <span>{tr('incidents.col.ref')}</span>
          <span>{tr('incidents.col.incident')}</span>
          <span>{tr('incidents.col.level')}</span>
          <span>{tr('incidents.col.type')}</span>
          <span>{tr('incidents.col.opco')}</span>
          <span>{tr('incidents.col.status')}</span>
          <span>{tr('incidents.col.owner')}</span>
        </div>
        {view.map((i) => {
          const sev = tok(SEVERITY[i.sev] ?? 'N');
          const meta = STATUS[i.status];
          const st = tok(meta?.rating ?? 'N');
          return (
            <Link
              key={i.ref}
              href={`/incidents/${i.ref}`}
              data-hov="s2"
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                minWidth: '1020px',
                gap: '14px',
                padding: 'var(--row-py) 16px',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12.5px',
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
              <span style={{ fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                {i.title}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '21px',
                  padding: '0 9px',
                  borderRadius: '6px',
                  background: sev.bg,
                  color: sev.ink,
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  justifySelf: 'start',
                }}
              >
                {i.sev}
              </span>
              <span style={{ color: 'var(--text-2)' }}>{i.type}</span>
              <span
                style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--text-2)' }}
              >
                {i.opco}
              </span>
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
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: st.dot,
                  }}
                />
                {meta ? tr(meta.key) : i.status}
              </span>
              <span style={{ color: 'var(--text-2)', fontSize: '11.5px', lineHeight: 1.35 }}>
                {i.owner}
                <br />
                <span style={{ color: 'var(--text-3)', fontSize: '10.5px' }}>{i.next}</span>
              </span>
            </Link>
          );
        })}
        {view.length === 0 && (
          // Not in the fragment: the design never drew a scope with no
          // incidents, and the topbar can select one — RNZ has none.
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <IconSearch
              width="30"
              height="30"
              stroke="var(--text-3)"
              strokeWidth="1.5"
              style={{ marginBottom: '8px', opacity: 0.7 }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
              {tr('incidents.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('incidents.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
