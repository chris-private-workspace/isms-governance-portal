'use client';

/**
 * File: apps/web/src/app/(app)/issues/page.tsx
 * Purpose: Issues and actions — what was found, by whom, and when it is due.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/11-issues.html (52 lines) under the five port
 *   rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   TWO COUNTS IN ONE SENTENCE, AND THEY MEAN DIFFERENT THINGS. The subtitle
 *   reads "{open} open · {overdue} overdue": open is every row not yet closed,
 *   overdue is the subset whose status says so. They are not exclusive — an
 *   overdue issue is also an open one — which is why they are computed as two
 *   independent predicates over the same list rather than as a partition.
 *
 *   Overdue is read from the status column, not from `due` against a clock.
 *   The fixture already states the judgement (ISS-5490 is 'Overdue'), and
 *   deriving it from dates instead would let the screen contradict the register
 *   it is displaying the moment the demo is run on a later date.
 *
 *   Severity and status use separate rating maps even though both land on the
 *   same four tokens: 'Critical' is a severity and 'Overdue' is a lifecycle
 *   state, and status.md maps them from different rows of its domain table.
 *   Merging them would make the next status word land in whichever branch it
 *   happened to match first.
 *
 * Key Components:
 *   - IssuesPage: the screen
 *   - SEVERITY / STATUS: the two vocabularies, kept apart on purpose
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/11-issues.html
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { issues } from '@/data/issues';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

/** The {{ i.flag }} hole — the two-letter jurisdiction badge for an OpCo. */
const flagOf = (code: string) => entityPosture.find((e) => e.code === code)?.flag ?? '';

/** status.md risk-level row: High / Critical is ONE red band, hence two R's. */
const SEVERITY: Record<string, { key: TranslationKey; rating: Rating }> = {
  Critical: { key: 'issues.sev.critical', rating: 'R' },
  High: { key: 'issues.sev.high', rating: 'R' },
  Medium: { key: 'issues.sev.medium', rating: 'A' },
  Low: { key: 'issues.sev.low', rating: 'G' },
};

/** status.md Task / action row, read literally. */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  Open: { key: 'issues.status.open', rating: 'N' },
  'In progress': { key: 'issues.status.inProgress', rating: 'A' },
  Overdue: { key: 'issues.status.overdue', rating: 'R' },
  Closed: { key: 'issues.status.closed', rating: 'G' },
};

const TH_LEFT = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: '10.5px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  borderBottom: '1px solid var(--border)',
} as const;

export default function IssuesPage() {
  const { tr, trf, entity, scopeLabel } = useShell();
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fSeverity, setFSeverity] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState<string | null>(null);
  const [fSource, setFSource] = useState<string | null>(null);

  const scoped = entity ? issues.filter((i) => i.entity === entity.code) : issues;

  const view = scoped.filter(
    (i) =>
      (fSeverity === null || i.severity === fSeverity) &&
      (fStatus === null || i.status === fStatus) &&
      (fSource === null || i.source === fSource),
  );

  const open = scoped.filter((i) => i.status !== 'Closed').length;
  const overdue = scoped.filter((i) => i.status === 'Overdue').length;

  const unique = (values: string[]) => [...new Set(values)];

  const FILTERS = [
    {
      id: 'severity',
      labelKey: 'issues.filter.severity' as TranslationKey,
      allKey: 'issues.filter.severity.all' as TranslationKey,
      value: fSeverity,
      set: setFSeverity,
      options: unique(scoped.map((i) => i.severity)).map((v) => {
        const meta = SEVERITY[v];
        return { value: v, label: meta ? tr(meta.key) : v };
      }),
    },
    {
      id: 'status',
      labelKey: 'issues.filter.status' as TranslationKey,
      allKey: 'issues.filter.status.all' as TranslationKey,
      value: fStatus,
      set: setFStatus,
      options: unique(scoped.map((i) => i.status)).map((v) => {
        const meta = STATUS[v];
        return { value: v, label: meta ? tr(meta.key) : v };
      }),
    },
    {
      id: 'source',
      labelKey: 'issues.filter.source' as TranslationKey,
      allKey: 'issues.filter.source.all' as TranslationKey,
      value: fSource,
      set: setFSource,
      options: unique(scoped.map((i) => i.source)).map((v) => ({ value: v, label: v })),
    },
  ];

  return (
    <div data-screen-label="Issues">
      <DemoBadge />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '16px',
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
            {tr('issues.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('issues.title')}
          </h1>
          <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
            {trf('issues.meta', { open, overdue, scope: scopeLabel })}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        {FILTERS.map((f) => {
          const current = f.options.find((o) => o.value === f.value);
          return (
            <div key={f.id} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenMenu((cur) => (cur === f.id ? null : f.id))}
                data-hov="s3"
                style={{
                  height: '34px',
                  padding: '0 12px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                }}
              >
                {current ? current.label : tr(f.labelKey)}{' '}
                <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>▼</span>
              </button>
              {openMenu === f.id && (
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: 0,
                    minWidth: '180px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(16,24,40,.16)',
                    padding: '6px',
                    zIndex: 30,
                  }}
                >
                  {[{ value: null, label: tr(f.allKey) }, ...f.options].map((o) => (
                    <button
                      key={o.value ?? '__all'}
                      type="button"
                      onClick={() => {
                        f.set(o.value);
                        setOpenMenu(null);
                      }}
                      data-hov="s3"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: '7px',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {o.label}
                      {f.value === o.value && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Unwired: there is no /issues/new route in this port. */}
        <button
          type="button"
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
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {tr('issues.new')}
        </button>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('issues.col.issue')}</th>
                <th style={TH_LEFT}>{tr('issues.col.severity')}</th>
                <th style={TH_LEFT}>{tr('issues.col.source')}</th>
                <th style={TH_LEFT}>{tr('issues.col.entity')}</th>
                <th style={TH_LEFT}>{tr('issues.col.owner')}</th>
                <th style={TH_LEFT}>{tr('issues.col.due')}</th>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('issues.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {view.map((i) => {
                const sevMeta = SEVERITY[i.severity];
                const sev = tok(sevMeta?.rating ?? 'N');
                const stMeta = STATUS[i.status];
                const st = tok(stMeta?.rating ?? 'N');
                return (
                  // <a> cannot sit inside <tbody>; see the risks screen's note.
                  <tr
                    key={i.id}
                    onClick={() => router.push(`/issues/${i.id}`)}
                    data-hov="s2"
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontFamily: 'var(--mono)',
                          color: 'var(--primary-ink)',
                          fontWeight: 600,
                        }}
                      >
                        {i.id}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                        }}
                      >
                        {i.title}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          background: sev.bg,
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 700, color: sev.ink }}>
                          {sevMeta ? tr(sevMeta.key) : i.severity}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {i.source}
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '18px',
                            borderRadius: '4px',
                            background: 'var(--surface-3)',
                            border: '1px solid var(--border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            fontWeight: 700,
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {flagOf(i.entity)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{i.entity}</span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {i.owner}
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {i.due}
                    </td>
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: st.bg,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: st.dot,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: st.ink }}>
                          {stMeta ? tr(stMeta.key) : i.status}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {view.length === 0 && (
          // Not in the fragment — see the note on the controls screen.
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <IconSearch
              width="30"
              height="30"
              stroke="var(--text-3)"
              strokeWidth="1.5"
              style={{ marginBottom: '8px', opacity: 0.7 }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
              {tr('issues.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('issues.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
