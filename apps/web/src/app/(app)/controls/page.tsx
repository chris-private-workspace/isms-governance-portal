'use client';

/**
 * File: apps/web/src/app/(app)/controls/page.tsx
 * Purpose: The control library — what is in place, when it was last tested, how it did.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/07-controls-list.html (50 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   "{n} TESTS OVERDUE" HAS NO FIELD BEHIND IT. The fixture records `freq` as a
 *   word and `lastTest` as a date, and carries no next-due date at all, so the
 *   header's count cannot be read off a column — it has to be derived. CADENCE
 *   below turns each frequency word into a window and the count is the rows
 *   whose last test has aged past their own window. The reference date is the
 *   most recent lastTest IN THE WHOLE REGISTER, not the clock and not the
 *   filtered subset: reading the clock would make the number drift every day a
 *   demo is given, and scoping it would let the reference move when the user
 *   changes entity, which is the one thing a comparison date must not do.
 *   Both the windows and that choice are invented and are marked as such.
 *
 *   The three filters are real. The fragment draws them as bare buttons with no
 *   menu — the panel markup only exists on 04-risks-list.html — so the dropdown
 *   is that fragment's panel, copied value for value, hung under this screen's
 *   own button, which has its own padding (0 12px, not 0 11px) and its own
 *   caret colour. The two screens are NOT normalised onto one button.
 *
 *   "New control" has no destination: there is no /controls/new route in this
 *   port. It renders, does nothing, and is reported as unwired rather than
 *   given an empty handler that would make it look alive.
 *
 * Key Components:
 *   - ControlsPage: the screen
 *   - CADENCE / RESULT: the invented test window, and the sourced result band
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/07-controls-list.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/status.md — control bands
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { controls } from '@/data/controls';
import { entityPosture } from '@/data/entityPosture';
import type { TranslationKey } from '@/i18n';
import { tok, type Rating } from '@/lib/tok';

/** The {{ c.flag }} hole — the two-letter jurisdiction badge for an OpCo. */
const flagOf = (code: string) => entityPosture.find((e) => e.code === code)?.flag ?? '';

/**
 * How long a control may go untested before it counts as overdue, in days.
 *
 * INVENTED — see the file header. 'Per event' is absent on purpose: a control
 * that fires per event has no cadence to be late against, so it is never
 * counted. 'Continuous' is 30 rather than 1 because the register's shortest
 * real cadence is monthly, and a continuous control with a month-old test is
 * the first point at which a reviewer would ask about it.
 */
const CADENCE: Record<string, number> = {
  Continuous: 30,
  Daily: 1,
  Monthly: 31,
  Quarterly: 92,
  Annual: 366,
};

const DAY_MS = 86_400_000;

/** status.md: Effective -> G, needs improvement -> A, Ineffective -> R. */
const RESULT: Record<string, { key: TranslationKey; rating: Rating }> = {
  Effective: { key: 'controls.result.effective', rating: 'G' },
  Partial: { key: 'controls.result.partial', rating: 'A' },
  Ineffective: { key: 'controls.result.ineffective', rating: 'R' },
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
 * Fixed for the whole register, not for the current view. Computed from the
 * fixture so that adding a newer test moves the reference with it.
 */
const AS_AT = Math.max(...controls.map((c) => Date.parse(c.lastTest)));

function isOverdue(freq: string, lastTest: string): boolean {
  const window = CADENCE[freq];
  if (window === undefined) return false;
  return Date.parse(lastTest) + window * DAY_MS < AS_AT;
}

export default function ControlsPage() {
  const { tr, trf, entity, scopeLabel } = useShell();
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fType, setFType] = useState<string | null>(null);
  const [fResult, setFResult] = useState<string | null>(null);
  const [fEntity, setFEntity] = useState<string | null>(null);

  const scoped = entity ? controls.filter((c) => c.entity === entity.code) : controls;

  const view = scoped.filter(
    (c) =>
      (fType === null || c.type === fType) &&
      (fResult === null || c.result === fResult) &&
      (fEntity === null || c.entity === fEntity),
  );

  const coverage = scoped.length
    ? Math.round(scoped.reduce((a, c) => a + c.cov, 0) / scoped.length)
    : 0;
  const overdue = scoped.filter((c) => isOverdue(c.freq, c.lastTest)).length;

  const unique = (values: string[]) => [...new Set(values)];

  const FILTERS = [
    {
      id: 'type',
      labelKey: 'controls.filter.type' as TranslationKey,
      allKey: 'controls.filter.type.all' as TranslationKey,
      value: fType,
      set: setFType,
      options: unique(scoped.map((c) => c.type)).map((v) => ({ value: v, label: v })),
    },
    {
      id: 'result',
      labelKey: 'controls.filter.result' as TranslationKey,
      allKey: 'controls.filter.result.all' as TranslationKey,
      value: fResult,
      set: setFResult,
      options: unique(scoped.map((c) => c.result)).map((v) => {
        const meta = RESULT[v];
        return { value: v, label: meta ? tr(meta.key) : v };
      }),
    },
    {
      id: 'entity',
      labelKey: 'controls.filter.entity' as TranslationKey,
      allKey: 'controls.filter.entity.all' as TranslationKey,
      value: fEntity,
      set: setFEntity,
      options: unique(scoped.map((c) => c.entity)).map((v) => ({ value: v, label: v })),
    },
  ];

  return (
    <div data-screen-label="Controls — library">
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
          {tr('controls.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('controls.title')}
        </h1>
        <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
          {trf('controls.meta', { cov: `${coverage}%`, overdue, scope: scopeLabel })}
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
        {/* Unwired: there is no /controls/new route in this port. */}
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
          {tr('controls.new')}
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
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('controls.col.control')}</th>
                <th style={TH_LEFT}>{tr('controls.col.type')}</th>
                <th style={TH_LEFT}>{tr('controls.col.frequency')}</th>
                <th style={TH_LEFT}>{tr('controls.col.entity')}</th>
                <th style={TH_LEFT}>{tr('controls.col.lastTest')}</th>
                <th style={TH_LEFT}>{tr('controls.col.result')}</th>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('controls.col.coverage')}</th>
              </tr>
            </thead>
            <tbody>
              {view.map((c) => {
                const meta = RESULT[c.result];
                const rt = tok(meta?.rating ?? 'N');
                return (
                  // <a> cannot sit inside <tbody>; the row-level affordance the
                  // fragment draws uses the router, as the dashboard's does.
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/controls/${c.id}`)}
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
                        {c.id}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        {c.name}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {c.type}
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {c.freq}
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
                          {flagOf(c.entity)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{c.entity}</span>
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
                      {c.lastTest}
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: rt.bg,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: rt.dot,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: rt.ink }}>
                          {meta ? tr(meta.key) : c.result}
                        </span>
                      </span>
                    </td>
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div
                          style={{
                            width: '64px',
                            height: '5px',
                            borderRadius: '3px',
                            background: 'var(--surface-3)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${c.cov}%`,
                              background: rt.dot,
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
                          {c.cov}%
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
          // Not in the fragment: its filters were static, so an empty result was
          // a state the design never had to draw. Making them work creates it,
          // and a table with a header and no body reads as broken. The panel is
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
              {tr('controls.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('controls.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
