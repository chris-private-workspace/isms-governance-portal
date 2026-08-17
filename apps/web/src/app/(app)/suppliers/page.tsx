'use client';

/**
 * File: apps/web/src/app/(app)/suppliers/page.tsx
 * Purpose: External party risk assessments — who has access, to what, on what terms.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/20-suppliers-list.html (43 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   THE "BEFORE OCT 2026" CARD IS THE ONE PLACE THE DESIGN PUTS A DATE IN
 *   STATIC COPY. The footnote is fixed text; the number above it is not, so
 *   REASSESS_BEFORE holds that same boundary as a value and the count is the
 *   rows whose re-assessment date falls before it. Copying the number the
 *   deliverable happened to show would have been wrong for this fixture and
 *   would stay wrong silently.
 *
 *   Two adequacy columns exist in the data — `adequate` (our controls) and
 *   `tpAdequate` (theirs) — and the design shows only the first. That is the
 *   fragment's editorial choice, kept: the assessment's own question is whether
 *   OUR controls suffice before access is granted, and `tpAdequate` belongs on
 *   the detail screen where both can be read side by side.
 *
 *   Rows are <Link>: the list is a CSS grid of <div>s, so the record link can
 *   be a real anchor. That picks up base.css:19-20 (primary-ink, underline on
 *   hover), so colour and decoration are neutralised inline — which matters
 *   here more than elsewhere because the party name carries no colour of its
 *   own and would otherwise render as a link.
 *
 * Key Components:
 *   - SuppliersPage: the screen
 *   - ADEQUACY / STATUS: the two vocabularies this register maps onto RAG
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/20-suppliers-list.html
 */

import Link from 'next/link';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { suppliers } from '@/data/suppliers';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

/** Are our existing controls enough for this access? */
const ADEQUACY: Record<string, { key: TranslationKey; rating: Rating }> = {
  Yes: { key: 'suppliers.adequacy.yes', rating: 'G' },
  Partial: { key: 'suppliers.adequacy.partial', rating: 'A' },
  No: { key: 'suppliers.adequacy.no', rating: 'R' },
};

/** Assessment outcome. Conditional and under review are both work in flight. */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  Approved: { key: 'suppliers.status.approved', rating: 'G' },
  Conditional: { key: 'suppliers.status.conditional', rating: 'A' },
  'Under review': { key: 'suppliers.status.underReview', rating: 'A' },
  Remediation: { key: 'suppliers.status.remediation', rating: 'R' },
};

/** The boundary the fourth card's fixed footnote states: "before Oct 2026". */
const REASSESS_BEFORE = Date.parse('2026-10-01');

/** The grid track list, written once because header and rows must not drift. */
const COLUMNS = '92px minmax(0,1.5fr) minmax(0,1.5fr) 150px 108px 96px 118px 108px';

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

export default function SuppliersPage() {
  const { tr, entity } = useShell();

  const view = entity ? suppliers.filter((s) => s.opco === entity.code) : suppliers;

  const kApproved = view.filter((s) => s.status === 'Approved').length;
  const kAction = view.filter((s) => s.newCtl === 'Yes').length;
  const kDue = view.filter((s) => Date.parse(s.review) < REASSESS_BEFORE).length;

  const KPIS = [
    {
      key: 'count',
      labelKey: 'suppliers.kpi.count.label' as TranslationKey,
      footKey: 'suppliers.kpi.count.foot' as TranslationKey,
      value: view.length,
      colour: undefined,
    },
    {
      key: 'approved',
      labelKey: 'suppliers.kpi.approved.label' as TranslationKey,
      footKey: 'suppliers.kpi.approved.foot' as TranslationKey,
      value: kApproved,
      colour: 'var(--rag-g-ink)',
    },
    {
      key: 'action',
      labelKey: 'suppliers.kpi.action.label' as TranslationKey,
      footKey: 'suppliers.kpi.action.foot' as TranslationKey,
      value: kAction,
      colour: 'var(--rag-a-ink)',
    },
    {
      key: 'due',
      labelKey: 'suppliers.kpi.due.label' as TranslationKey,
      footKey: 'suppliers.kpi.due.foot' as TranslationKey,
      value: kDue,
      colour: 'var(--rag-a-ink)',
    },
  ];

  return (
    <div data-screen-label="Suppliers — external party assessments">
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
            {tr('suppliers.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('suppliers.title')}
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
            {tr('suppliers.subtitle')}
          </div>
        </div>
        <Link
          href="/suppliers/new"
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
          {tr('suppliers.new')}
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
            <div style={KPI_FOOT}>{tr(k.footKey)}</div>
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: COLUMNS,
            minWidth: '1120px',
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
          <span>{tr('suppliers.col.ref')}</span>
          <span>{tr('suppliers.col.party')}</span>
          <span>{tr('suppliers.col.asset')}</span>
          <span>{tr('suppliers.col.access')}</span>
          <span>{tr('suppliers.col.classification')}</span>
          <span>{tr('suppliers.col.controls')}</span>
          <span>{tr('suppliers.col.status')}</span>
          <span>{tr('suppliers.col.reassess')}</span>
        </div>
        {view.map((s) => {
          const adMeta = ADEQUACY[s.adequate];
          const ad = tok(adMeta?.rating ?? 'N');
          const stMeta = STATUS[s.status];
          const st = tok(stMeta?.rating ?? 'N');
          return (
            <Link
              key={s.ref}
              href={`/suppliers/${s.ref}`}
              data-hov="s2"
              style={{
                display: 'grid',
                gridTemplateColumns: COLUMNS,
                minWidth: '1120px',
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
                {s.ref}
              </span>
              <span>
                <b style={{ display: 'block', fontWeight: 600, lineHeight: 1.35 }}>{s.party}</b>
                <span
                  style={{
                    display: 'block',
                    fontSize: '10.5px',
                    color: 'var(--text-3)',
                    marginTop: '2px',
                  }}
                >
                  {s.reason}
                </span>
              </span>
              <span style={{ color: 'var(--text-2)', lineHeight: 1.4 }}>{s.asset}</span>
              <span style={{ color: 'var(--text-2)', fontSize: '11.5px' }}>{s.access}</span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>{s.cls}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '21px',
                  padding: '0 9px',
                  borderRadius: '6px',
                  background: ad.bg,
                  color: ad.ink,
                  fontSize: '11px',
                  fontWeight: 600,
                  justifySelf: 'start',
                }}
              >
                {adMeta ? tr(adMeta.key) : s.adequate}
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
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.dot }}
                />
                {stMeta ? tr(stMeta.key) : s.status}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-2)' }}>
                {s.review}
              </span>
            </Link>
          );
        })}
        {view.length === 0 && (
          // Not in the fragment: the design never drew a scope with no external
          // parties, and the topbar can select one — most OpCos have none.
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <IconSearch
              width="30"
              height="30"
              stroke="var(--text-3)"
              strokeWidth="1.5"
              style={{ marginBottom: '8px', opacity: 0.7 }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
              {tr('suppliers.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('suppliers.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
