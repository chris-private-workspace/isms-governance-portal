'use client';

/**
 * File: apps/web/src/app/(app)/policies/page.tsx
 * Purpose: The policy library — lifecycle state, review date and attestation reach.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/09-policies.html (49 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   THE ONE SCREEN THAT IS NOT ENTITY-SCOPED, and the fragment says so itself:
 *   its subtitle ends in the literal word "group-wide" (:12), and the fixture
 *   carries no entity column at all — a policy here belongs to the group, with
 *   an owning function (CISO Office, DPO, SOC) rather than an OpCo. So the
 *   topbar scope selector deliberately does not filter this list. That is a
 *   property of the register, not an omission; when policies acquire local
 *   variants the column arrives with them and this becomes scoped like the rest.
 *
 *   Attestation reuses THRESHOLD.completion rather than getting a threshold of
 *   its own. Both are "what fraction of the people who had to, did" on the same
 *   0-100 scale, and inventing a second set of numbers for the same question is
 *   how two screens end up disagreeing about what 85% means.
 *
 *   The bar's numeric is written {n}% though the fragment's hole is bare
 *   {{ p.att }}. The prototype's logic class formatted that value and the
 *   handoff did not ship it; a column headed "Attestation" showing "97" beside
 *   a progress bar is ambiguous in a way the design plainly did not intend, and
 *   the sibling coverage column writes its unit out (07-controls-list.html:42).
 *
 *   "New policy" RENDERS DISABLED: there is no /policies/new route in this port
 *   and no write path behind it. Day-3 found it drawn live with no handler,
 *   which is indistinguishable from a working button.
 *
 * Key Components:
 *   - PoliciesPage: the screen
 *   - STATUS: publication state onto RAG
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/09-policies.html
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { policies } from '@/data/policies';
import type { TranslationKey } from '@/i18n';
import { band, THRESHOLD } from '@/lib/posture';
import { tok, type Rating } from '@/lib/tok';

/** status.md Task / action: complete -> G, in progress -> A, not started -> N. */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  Published: { key: 'policies.status.published', rating: 'G' },
  'Under review': { key: 'policies.status.underReview', rating: 'A' },
  Draft: { key: 'policies.status.draft', rating: 'N' },
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

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Applied to New policy, which would need a route and a write path. Not an
 * invented visual: it is the design system's own disabled state.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

export default function PoliciesPage() {
  const { tr, trf } = useShell();
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fCategory, setFCategory] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState<string | null>(null);

  const view = policies.filter(
    (p) =>
      (fCategory === null || p.category === fCategory) &&
      (fStatus === null || p.status === fStatus),
  );

  const underReview = policies.filter((p) => p.status === 'Under review').length;

  const unique = (values: string[]) => [...new Set(values)];

  const FILTERS = [
    {
      id: 'category',
      labelKey: 'policies.filter.category' as TranslationKey,
      allKey: 'policies.filter.category.all' as TranslationKey,
      value: fCategory,
      set: setFCategory,
      options: unique(policies.map((p) => p.category)).map((v) => ({ value: v, label: v })),
    },
    {
      id: 'status',
      labelKey: 'policies.filter.status' as TranslationKey,
      allKey: 'policies.filter.status.all' as TranslationKey,
      value: fStatus,
      set: setFStatus,
      options: unique(policies.map((p) => p.status)).map((v) => {
        const meta = STATUS[v];
        return { value: v, label: meta ? tr(meta.key) : v };
      }),
    },
  ];

  return (
    <div data-screen-label="Policies">
      <DemoBadge />

      <div style={{ marginBottom: '16px' }}>
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
          {tr('policies.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('policies.title')}
        </h1>
        <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
          {trf('policies.meta', { n: policies.length, review: underReview })}
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
        {/* Inert: there is no /policies/new route in this port. */}
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
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            ...INERT,
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
          {tr('policies.new')}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('policies.col.policy')}</th>
                <th style={TH_LEFT}>{tr('policies.col.category')}</th>
                <th style={TH_LEFT}>{tr('policies.col.owner')}</th>
                <th style={{ ...TH_LEFT, textAlign: 'center' }}>{tr('policies.col.version')}</th>
                <th style={TH_LEFT}>{tr('policies.col.status')}</th>
                <th style={TH_LEFT}>{tr('policies.col.nextReview')}</th>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>
                  {tr('policies.col.attestation')}
                </th>
              </tr>
            </thead>
            <tbody>
              {view.map((p) => {
                const meta = STATUS[p.status];
                const st = tok(meta?.rating ?? 'N');
                const att = tok(band(p.att, THRESHOLD.completion.good, THRESHOLD.completion.watch));
                return (
                  // <a> cannot sit inside <tbody>; see the risks screen's note.
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/policies/${p.id}`)}
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
                        {p.id}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        {p.name}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {p.category}
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {p.owner}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: 'var(--row-py) 12px',
                        fontFamily: 'var(--mono)',
                        fontSize: '12px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {p.version}
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
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
                          {meta ? tr(meta.key) : p.status}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {p.nextReview}
                    </td>
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '5px',
                            borderRadius: '3px',
                            background: 'var(--surface-3)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${p.att}%`,
                              background: att.dot,
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 600,
                            color: 'var(--text-2)',
                          }}
                        >
                          {p.att}%
                        </span>
                      </div>
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
              {tr('policies.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('policies.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
