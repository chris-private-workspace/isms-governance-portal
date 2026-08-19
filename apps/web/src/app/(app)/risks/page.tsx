'use client';

/**
 * File: apps/web/src/app/(app)/risks/page.tsx
 * Purpose: The risk register — every risk in scope, banded by residual score.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/04-risks-list.html (81 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   RESIDUAL IS COMPUTED, NOT STORED. The fixture carries `imp` and `lik`, both
 *   already post-control, so residual = imp * lik; `inh` is the separate
 *   inherent score and is deliberately not what this screen ranks or bands on.
 *   riskBand() owns every threshold, so the four band counters in the header
 *   and the score chip in each row can never disagree.
 *
 *   THE FRAGMENT'S FOUR FILTERS ARE REAL. It supplies `filterDefs` as a list
 *   with an open/closed flag and per-filter button colours, but never says what
 *   the four are — that lived in the prototype's logic class. Entity, category,
 *   residual band and status are chosen because they are the four columns a
 *   register is actually triaged by, and every option list is derived from the
 *   rows in scope rather than enumerated, so a filter can never offer a value
 *   that matches nothing.
 *
 *   The active-filter colours ({{ f.btnBorder }} / {{ f.btnBg }} / {{ f.btnInk }})
 *   are holes with no value anywhere in the handoff. They follow the selected
 *   -item treatment the shell already uses for its scope and language menus
 *   (AppShell primary-tint fill); the inactive triple is copied from the
 *   sibling list screens, which draw the same button unbound.
 *
 * Key Components:
 *   - RisksPage: the screen
 *   - BANDS / STATUS: the two vocabularies this register maps onto RAG
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/04-risks-list.html
 *   - apps/web/src/lib/posture.ts — riskBand owns the 20 / 16 / 6 boundaries
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { NoSource } from '@/components/NoSource';
import { ago } from '@/lib/ago';
import { useShell } from '@/components/shell/shell-state';
import type { TranslationKey } from '@/i18n';
import { listRisks, type RiskRow } from '@/lib/api/risks';
import { riskBand } from '@/lib/posture';
import { tok, type Rating } from '@/lib/tok';

/** The {{ r.flag }} hole — the two-letter jurisdiction badge for an OpCo. */

/**
 * The four bands, in the order the header strip reads them.
 *
 * `label` is what riskBand() returns, so this table is joined to the helper by
 * value rather than by a second copy of the thresholds.
 */
const BANDS: { label: string; key: TranslationKey; rating: Rating }[] = [
  { label: 'Critical', key: 'risks.band.critical', rating: 'R' },
  { label: 'High', key: 'risks.band.high', rating: 'R' },
  { label: 'Medium', key: 'risks.band.medium', rating: 'A' },
  { label: 'Low', key: 'risks.band.low', rating: 'G' },
];

/**
 * Treatment status onto RAG, following status.md's Task / action row:
 * complete -> G, in progress -> A, not started -> N.
 *
 * Open is N and not R on purpose. The redness a reader needs is already in the
 * residual chip two columns to the left; colouring an untreated risk red here
 * would double-count the same fact and leave 'Accepted' — the genuinely
 * decided case — looking identical to 'Monitored'.
 */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  Open: { key: 'risks.status.open', rating: 'N' },
  Treatment: { key: 'risks.status.treatment', rating: 'A' },
  Monitored: { key: 'risks.status.monitored', rating: 'G' },
  Accepted: { key: 'risks.status.accepted', rating: 'G' },
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

interface Source {
  rows: RiskRow[] | null;
  failed: boolean;
  loading: boolean;
}

export default function RisksPage() {
  const { tr, trf, locale, periodLabel } = useShell();
  const router = useRouter();

  const [source, setSource] = useState<Source>({ rows: null, failed: false, loading: true });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const answer = await listRisks();
        if (!cancelled) setSource({ rows: answer.data, failed: false, loading: false });
      } catch {
        // ⛔ NO FIXTURE FALLBACK (AC-5). Falling back here would make a dead
        // backend render as a working screen full of invented risks — which is
        // the single most dangerous thing this particular product could do.
        if (!cancelled) setSource({ rows: null, failed: true, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fEntity, setFEntity] = useState<string | null>(null);
  const [fCategory, setFCategory] = useState<string | null>(null);
  const [fBand, setFBand] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState<string | null>(null);

  // ⚠️ The topbar scope selector no longer filters this list, and that is not an
  // oversight. The entity scope now comes from the server (plan §3.6 D1): the
  // API returns the caller's entity and nothing else, so filtering again here
  // would be theatre — it could only ever remove rows the server already chose
  // to send. The consequence, that changing persona does not change these rows,
  // is stated on the screen rather than left for someone to discover.
  const rows = (source.rows ?? []).map((r) => {
    // ⛔ AFTER-control only, with NO fallback to the inherent score. The
    // fallback put a 20 in a column headed "Residual" for risks that have never
    // been re-assessed — the same class of quiet untruth as a blank cell, and it
    // also made this screen disagree with the detail screen.
    const residual = r.scoreAfter;
    const band = residual === null ? null : riskBand(residual);
    const def = band ? BANDS.find((b) => b.label === band.label) : undefined;
    return {
      routeId: r.id,
      ref: r.refCode,
      title: r.title,
      category: r.category,
      updated: r.updatedAt,
      residual,
      band,
      bandKey: def?.key,
      // The five with no source. lib/api/risks.ts says which and why.
      entity: null as string | null,
      controls: null as number | null,
      owner: null as string | null,
      status: null as string | null,
    };
  });

  const view = rows.filter(
    (r) =>
      (fEntity === null || r.entity === fEntity) &&
      (fCategory === null || r.category === fCategory) &&
      (fBand === null || r.band?.label === fBand) &&
      (fStatus === null || r.status === fStatus),
  );

  const unique = (values: (string | null)[]) =>
    [...new Set(values)].filter((v): v is string => v !== null);

  // Every key is written out in full rather than assembled, so i18n.test.ts's
  // source scan can see it — the same rule the dashboard's KPI list follows.
  const FILTERS = [
    {
      id: 'entity',
      labelKey: 'risks.filter.entity' as TranslationKey,
      allKey: 'risks.filter.entity.all' as TranslationKey,
      value: fEntity,
      set: setFEntity,
      options: unique(rows.map((r) => r.entity)).map((v) => ({ value: v, label: v })),
    },
    {
      id: 'category',
      labelKey: 'risks.filter.category' as TranslationKey,
      allKey: 'risks.filter.category.all' as TranslationKey,
      value: fCategory,
      set: setFCategory,
      options: unique(rows.map((r) => r.category)).map((v) => ({ value: v, label: v })),
    },
    {
      id: 'band',
      labelKey: 'risks.filter.band' as TranslationKey,
      allKey: 'risks.filter.band.all' as TranslationKey,
      value: fBand,
      set: setFBand,
      options: BANDS.filter((b) => rows.some((r) => r.band?.label === b.label)).map((b) => ({
        value: b.label,
        label: tr(b.key),
      })),
    },
    {
      id: 'status',
      labelKey: 'risks.filter.status' as TranslationKey,
      allKey: 'risks.filter.status.all' as TranslationKey,
      value: fStatus,
      set: setFStatus,
      options: unique(rows.map((r) => r.status)).map((v) => {
        const meta = STATUS[v];
        return { value: v, label: meta ? tr(meta.key) : v };
      }),
    },
  ];

  // ⛔ A filter whose option list is empty is a dead control — the exact shape
  // W19's drive-through found twenty-five of. Those columns have no values to
  // filter by today, so the control does not appear at all.
  const LIVE_FILTERS = FILTERS.filter((f) => f.options.length > 0);

  const anyFilter = FILTERS.some((f) => f.value !== null);
  const clearAll = () => {
    setFEntity(null);
    setFCategory(null);
    setFBand(null);
    setFStatus(null);
  };

  if (source.loading || source.failed) {
    return (
      <div data-screen-label="Risks — register">
        <DemoBadge variant="partial" />
        <div
          data-source-state={source.loading ? 'loading' : 'error'}
          style={{
            maxWidth: '560px',
            padding: '18px 20px',
            borderRadius: '10px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {source.loading ? (
            <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
              {tr('risks.source.loading')}
            </div>
          ) : (
            <>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                {tr('risks.source.error.title')}
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
                {tr('risks.source.error.body')}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-screen-label="Risks — register">
      <DemoBadge variant="partial" />

      <div
        data-partial-source
        style={{
          marginBottom: '14px',
          fontSize: '12px',
          lineHeight: 1.6,
          color: 'var(--text-3)',
        }}
      >
        {tr('risks.partialSource.text')} {tr('risks.scope.note')}
      </div>

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
            {tr('risks.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('risks.title')}
          </h1>
          <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
            {/* ⛔ NOT scopeLabel. The drive-through switched the selector to RSG
                and this line began reading "9 risks · RSG" over rows that belong
                to SG1 — the selector changed the CLAIM and not the data. A label
                that moves while the data does not is worse than a dead control,
                because it looks like it worked. */}
            {trf('risks.meta', {
              n: view.length,
              scope: tr('risks.scope.serverSide'),
              period: periodLabel,
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {BANDS.map((b) => (
            <div key={b.label} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  fontFamily: 'var(--mono)',
                  color: tok(b.rating).ink,
                }}
              >
                {view.filter((r) => r.band?.label === b.label).length}
              </div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '.4px',
                }}
              >
                {tr(b.key)}
              </div>
            </div>
          ))}
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
        {LIVE_FILTERS.map((f) => {
          const on = f.value !== null;
          // {{ f.curLabel }} — the chosen option's own label, so a band or a
          // status reads in the display language rather than as its data value.
          const current = f.options.find((o) => o.value === f.value);
          return (
            <div key={f.id} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenMenu((cur) => (cur === f.id ? null : f.id))}
                data-hov="s3"
                style={{
                  height: '34px',
                  padding: '0 11px',
                  border: `1px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                  borderRadius: '8px',
                  background: on ? 'var(--primary-tint)' : 'var(--surface)',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: on ? 'var(--primary-ink)' : 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                }}
              >
                {current ? current.label : tr(f.labelKey)}{' '}
                <span style={{ fontSize: '9px', opacity: 0.6 }}>▼</span>
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
        {anyFilter && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              height: '34px',
              padding: '0 11px',
              border: 'none',
              borderRadius: '8px',
              background: 'transparent',
              color: 'var(--primary-ink)',
              fontFamily: 'inherit',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            {tr('risks.clearAll')}
          </button>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
          {trf('risks.results', { n: view.length })}
        </span>
        <Link
          href="/risks/new"
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
            textDecoration: 'none',
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
          {tr('risks.new')}
        </Link>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1020px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('risks.col.risk')}</th>
                <th style={TH_LEFT}>{tr('risks.col.entity')}</th>
                <th style={TH_LEFT}>{tr('risks.col.category')}</th>
                <th style={TH_LEFT}>{tr('risks.col.residual')}</th>
                <th style={{ ...TH_LEFT, textAlign: 'center' }}>{tr('risks.col.ctrls')}</th>
                <th style={TH_LEFT}>{tr('risks.col.owner')}</th>
                <th style={TH_LEFT}>{tr('risks.col.status')}</th>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('risks.col.updated')}</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => {
                const sev = tok(r.band?.rating ?? 'N');
                const st = r.status === null ? undefined : STATUS[r.status];
                const stTok = tok(st?.rating ?? 'N');
                return (
                  // An <a> cannot be a child of <tbody>, so the row-level
                  // affordance the fragment draws (cursor:pointer on the <tr>)
                  // is the router rather than a Link — the same shape the
                  // dashboard's clickable rows already use.
                  <tr
                    key={r.routeId}
                    onClick={() => router.push(`/risks/${r.routeId}`)}
                    data-hov="s2"
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
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
                        {r.ref}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                        }}
                      >
                        {r.title}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>
                          <NoSource label={tr('risks.noSource.title')} />
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
                      {r.category ?? <NoSource label={tr('risks.noSource.title')} />}
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            minWidth: '28px',
                            height: '23px',
                            padding: '0 7px',
                            borderRadius: '6px',
                            background: sev.bg,
                            color: sev.ink,
                            fontFamily: 'var(--mono)',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {r.residual ?? '—'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: sev.ink }}>
                          {r.bandKey ? tr(r.bandKey) : (r.band?.label ?? '')}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: 'var(--row-py) 12px',
                        fontFamily: 'var(--mono)',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      <NoSource label={tr('risks.noSource.title')} />
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      <NoSource label={tr('risks.noSource.title')} />
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: stTok.bg,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: stTok.dot,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: stTok.ink }}>
                          {st ? tr(st.key) : <NoSource label={tr('risks.noSource.title')} />}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 16px',
                        fontSize: '12px',
                        color: 'var(--text-3)',
                      }}
                    >
                      {ago(r.updated, locale)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {view.length === 0 && (
          <div style={{ padding: '44px', textAlign: 'center' }}>
            <IconSearch
              width="30"
              height="30"
              stroke="var(--text-3)"
              strokeWidth="1.5"
              style={{ marginBottom: '8px', opacity: 0.7 }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
              {tr('risks.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {tr('risks.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
