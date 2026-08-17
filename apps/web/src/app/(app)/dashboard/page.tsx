'use client';

/**
 * File: apps/web/src/app/(app)/dashboard/page.tsx
 * Purpose: The flagship roll-up — every OpCo's ISMS posture on one screen.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/03-dashboard.html (198 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   This is the first screen to consume the shell, so it also settles three
 *   things the remaining screens inherit:
 *
 *   1. Screens read scope, period and locale from useShell(), never their own
 *      state. That is what makes the topbar's scope selector reach the page.
 *   2. Every screen opens with <DemoBadge/>. Fixture data is fine; fixture
 *      data that looks real is not.
 *   3. Colour comes from tok() over a letter decided by lib/posture.ts. No
 *      screen hardcodes a RAG colour per row.
 *
 *   THREE COUNTS IN THE FRAGMENT WERE WRONG FOR THIS PROJECT and are computed
 *   here instead of copied: "6 jurisdictions" (:12) and "6 entities" (:66) are
 *   the deliverable's sample scope, not the charter's 13 OpCos across 11
 *   jurisdictions; and the header's posture pill was the literal 'Watch' / 'A'
 *   (:22-23), which cannot survive the table below it changing. Deriving them
 *   is the only way the page stays true after the fixture moves.
 *
 *   KNOWN LIMIT, stated rather than hidden: the period control changes the
 *   label and nothing else. The fixtures hold exactly two periods — current
 *   and `prev` — which is enough for the deltas shown, and not enough to
 *   repopulate the page per quarter. Inventing four more quarters of numbers
 *   would make the control look real while being no more true.
 *
 * Key Components:
 *   - DashboardPage: the screen
 *   - KPIS: the six cards, each a reduction over the entity rows
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — first screen on the shell
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/03-dashboard.html
 *   - apps/web/src/lib/posture.ts — where every threshold on this page lives
 */

import Link from 'next/link';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronRight, IconDownload, IconInfo, IconSearch } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { controls } from '@/data/controls';
import { entityPosture, type EntityPosture } from '@/data/entityPosture';
import { issues } from '@/data/issues';
import { opcos } from '@/data/opcos';
import { risks } from '@/data/risks';
import { band, bandDesc, delta, regionPosture, riskBand, THRESHOLD } from '@/lib/posture';
import { tok } from '@/lib/tok';

const avg = (ns: number[]) =>
  ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : 0;
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/**
 * The five graded columns for one entity.
 *
 * Attached to the row rather than held in parallel arrays: the KPI strip and
 * the cells below it must agree, and the cheapest way to guarantee that is for
 * both to read the same object instead of the same index.
 */
function bandsFor(e: EntityPosture) {
  return {
    high: bandDesc(e.high, THRESHOLD.highRisks.good, THRESHOLD.highRisks.watch),
    cov: band(e.cov, THRESHOLD.coverage.good, THRESHOLD.coverage.watch),
    overdue: bandDesc(e.overdue, THRESHOLD.overdue.good, THRESHOLD.overdue.watch),
    open: bandDesc(e.open, THRESHOLD.openCritical.good, THRESHOLD.openCritical.watch),
    rcsa: band(e.rcsa, THRESHOLD.completion.good, THRESHOLD.completion.watch),
  };
}

export default function DashboardPage() {
  const { tr, trf, entity, scopeLabel, setScope, periodLabel } = useShell();
  const [view, setView] = useState<'heatmap' | 'scorecard'>('heatmap');

  // The footnote bolds one phrase mid-sentence. Splitting the sentence into two
  // keys would hand a translator half a clause each; a placeholder keeps it one
  // translatable unit and lets the emphasis sit wherever the language puts it.
  const [ragNoteBefore, ragNoteAfter] = tr('dash.ragNote').split('{status}');

  // Scope is entity-scoped by default and the region is the additive case —
  // the same direction the platform's real access model runs in.
  const rows = entity ? entityPosture.filter((e) => e.code === entity.code) : entityPosture;
  const matrix = rows.map((e) => ({ e, l: bandsFor(e) }));
  const jurisdictions = new Set(rows.map((e) => e.juris)).size;

  const region = regionPosture(rows.map((e) => e.overall));
  const regionTok = tok(region);
  const regionLabel = tr(
    region === 'G' ? 'rag.good' : region === 'R' ? 'rag.critical' : 'rag.watch',
  );

  const covNow = avg(rows.map((e) => e.cov));
  const covPrev = avg(rows.map((e) => e.prev.cov));
  const rcsaNow = avg(rows.map((e) => e.rcsa));
  const rcsaPrev = avg(rows.map((e) => e.prev.rcsa));
  const highNow = sum(rows.map((e) => e.high));
  const highPrev = sum(rows.map((e) => e.prev.high));
  const certified = rows.filter(
    (e) => opcos.find((o) => o.code === e.code)?.cert === 'Certified',
  ).length;

  // Every key is written out in full rather than built as `dash.kpi.${id}.label`.
  // i18n.test.ts check 3 scans source for key literals; a key assembled at
  // runtime type-checks, renders, and is invisible to that scan — so five of
  // these six would have been unguarded. Screens keep keys literal.
  const KPIS = [
    {
      key: 'coverage',
      labelKey: 'dash.kpi.coverage.label',
      subKey: 'dash.kpi.coverage.sub',
      footKey: 'dash.kpi.coverage.foot',
      value: `${covNow}`,
      unit: '%',
      rating: regionPosture(matrix.map((m) => m.l.cov)),
      deltaText: `${delta(covNow, covPrev)} pt`,
    },
    {
      key: 'highRisks',
      labelKey: 'dash.kpi.highRisks.label',
      subKey: 'dash.kpi.highRisks.sub',
      footKey: 'dash.kpi.highRisks.foot',
      value: `${highNow}`,
      unit: '',
      rating: regionPosture(matrix.map((m) => m.l.high)),
      deltaText: delta(highNow, highPrev),
    },
    {
      key: 'overdue',
      labelKey: 'dash.kpi.overdue.label',
      subKey: 'dash.kpi.overdue.sub',
      footKey: 'dash.kpi.overdue.foot',
      value: `${sum(rows.map((e) => e.overdue))}`,
      unit: '',
      rating: regionPosture(matrix.map((m) => m.l.overdue)),
      deltaText: '—',
    },
    {
      key: 'openCritical',
      labelKey: 'dash.kpi.openCritical.label',
      subKey: 'dash.kpi.openCritical.sub',
      footKey: 'dash.kpi.openCritical.foot',
      value: `${sum(rows.map((e) => e.open))}`,
      unit: '',
      rating: regionPosture(matrix.map((m) => m.l.open)),
      deltaText: '—',
    },
    {
      key: 'rcsa',
      labelKey: 'dash.kpi.rcsa.label',
      subKey: 'dash.kpi.rcsa.sub',
      footKey: 'dash.kpi.rcsa.foot',
      value: `${rcsaNow}`,
      unit: '%',
      rating: regionPosture(matrix.map((m) => m.l.rcsa)),
      deltaText: `${delta(rcsaNow, rcsaPrev)} pt`,
    },
    {
      key: 'certified',
      labelKey: 'dash.kpi.certified.label',
      subKey: 'dash.kpi.certified.sub',
      footKey: 'dash.kpi.certified.foot',
      value: `${certified}`,
      unit: `/${rows.length}`,
      rating: regionPosture(
        rows.map((e) => {
          const cert = opcos.find((o) => o.code === e.code)?.cert;
          return cert === 'Certified' ? 'G' : cert === 'In scope' ? 'A' : 'R';
        }),
      ),
      deltaText: '—',
    },
  ] as const;

  // Residual = likelihood x impact, both post-control. `inh` is the inherent
  // score, which is why it is larger and is not what this panel ranks on.
  const scopedRisks = entity ? risks.filter((r) => r.entity === entity.code) : risks;
  const topRisks = [...scopedRisks]
    .map((r) => ({ ...r, residual: r.imp * r.lik }))
    .sort((a, b) => b.residual - a.residual)
    .slice(0, 5);

  const scopedIssues = entity ? issues.filter((i) => i.entity === entity.code) : issues;
  // 'High / Critical' is one red band in components/status.md's domain table,
  // which is why two rows share a colour and only the label distinguishes them.
  const SEVERITIES = [
    { key: 'Critical', labelKey: 'sev.critical', rating: 'R' as const },
    { key: 'High', labelKey: 'sev.high', rating: 'R' as const },
    { key: 'Medium', labelKey: 'sev.medium', rating: 'A' as const },
    { key: 'Low', labelKey: 'sev.low', rating: 'G' as const },
  ] as const;
  const bySeverity = SEVERITIES.map((s) => ({
    ...s,
    n: scopedIssues.filter((i) => i.severity === s.key).length,
  }));
  const maxSeverity = Math.max(1, ...bySeverity.map((s) => s.n));

  const scopedControls = entity ? controls.filter((c) => c.entity === entity.code) : controls;
  const RESULTS = [
    { key: 'Effective', labelKey: 'ctlResult.effective', rating: 'G' as const },
    { key: 'Partial', labelKey: 'ctlResult.partial', rating: 'A' as const },
    { key: 'Ineffective', labelKey: 'ctlResult.ineffective', rating: 'R' as const },
  ] as const;
  const controlEff = RESULTS.map((r) => ({
    ...r,
    n: scopedControls.filter((c) => c.result === r.key).length,
  }));
  const controlTotal = Math.max(1, scopedControls.length);

  return (
    <div data-screen-label="Dashboard — ISMS posture">
      <DemoBadge />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '.5px',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              marginBottom: '7px',
            }}
          >
            <span>{tr('dash.eyebrow.region')}</span>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span>{periodLabel}</span>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <span>{trf('dash.eyebrow.jurisdictions', { n: jurisdictions })}</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '25px',
              fontWeight: 700,
              letterSpacing: '-.3px',
              lineHeight: 1.1,
            }}
          >
            {tr('dash.title')}
          </h1>
          <div
            style={{ marginTop: '5px', fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}
          >
            {tr('dash.subtitle')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                letterSpacing: '.4px',
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}
            >
              {tr('dash.overallPosture')}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 13px',
                borderRadius: '9px',
                background: regionTok.bg,
                border: `1px solid ${regionTok.dot}`,
              }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: regionTok.dot,
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 700, color: regionTok.ink }}>
                {regionLabel}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: regionTok.ink,
                  opacity: 0.75,
                  fontFamily: 'var(--mono)',
                }}
              >
                {region}
              </span>
            </div>
          </div>
          <div style={{ width: '1px', height: '38px', background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              data-hov="surface-3"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                height: '34px',
                padding: '0 13px',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <IconDownload width="14" height="14" stroke="currentColor" strokeWidth="1.8" />
              {tr('dash.export')}
            </button>
            <div style={{ fontSize: '10.5px', color: 'var(--text-3)', textAlign: 'center' }}>
              {tr('dash.updated')}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6,1fr)',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {KPIS.map((k) => {
          const kt = tok(k.rating);
          return (
            <div
              key={k.key}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '11px',
                padding: '14px 15px',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '6px',
                  marginBottom: '11px',
                }}
              >
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>
                    {tr(k.labelKey)}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>{tr(k.subKey)}</div>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '20px',
                    background: kt.bg,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: kt.dot }}
                  />
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: kt.ink,
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {k.rating}
                  </span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '27px',
                    fontWeight: 600,
                    fontFamily: 'var(--mono)',
                    letterSpacing: '-1px',
                    color: 'var(--text)',
                  }}
                >
                  {k.value}
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {k.unit}
                </span>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '8px' }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    fontFamily: 'var(--mono)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {k.deltaText}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-3)', lineHeight: 1.3 }}>
                  {tr(k.footKey)}
                </span>
              </div>
            </div>
          );
        })}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '15px 18px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-.2px' }}>
              {tr('dash.matrix.title')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              {trf('dash.matrix.meta', { n: rows.length, period: periodLabel })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(['R', 'A', 'G'] as const).map((r) => (
                <span
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '3px',
                      background: tok(r).dot,
                    }}
                  />
                  {tr(r === 'R' ? 'rag.critical' : r === 'A' ? 'rag.watch' : 'rag.good')}
                </span>
              ))}
            </div>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: 'var(--surface-3)',
                borderRadius: '8px',
                padding: '3px',
              }}
            >
              {(
                [
                  { id: 'heatmap', hint: 'A', key: 'dash.view.heatmap' },
                  { id: 'scorecard', hint: 'B', key: 'dash.view.scorecard' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setView(tab.id)}
                  style={{
                    height: '28px',
                    padding: '0 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: view === tab.id ? 'var(--surface)' : 'transparent',
                    color: view === tab.id ? 'var(--text)' : 'var(--text-3)',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>{tab.hint}</span>
                  {tr(tab.key)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === 'heatmap' && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12.5px',
                minWidth: '840px',
              }}
            >
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      letterSpacing: '.5px',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                      borderBottom: '1px solid var(--border)',
                      position: 'sticky',
                      left: 0,
                      background: 'var(--surface-2)',
                    }}
                  >
                    {tr('dash.col.entity')}
                  </th>
                  {(
                    [
                      'dash.col.overall',
                      'dash.col.risks',
                      'dash.col.high',
                      'dash.col.cov',
                      'dash.col.overdue',
                      'dash.col.open',
                      'dash.col.rcsa',
                    ] as const
                  ).map((key) => (
                    <th
                      key={key}
                      style={{
                        textAlign: 'center',
                        padding: '10px 8px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '.5px',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr(key)}
                    </th>
                  ))}
                  <th style={{ width: '28px', borderBottom: '1px solid var(--border)' }} />
                </tr>
              </thead>
              <tbody>
                {matrix.map(({ e, l }) => {
                  const ov = tok(e.overall);
                  // Risks is deliberately colourless — the footer note says so
                  // outright: RAG encodes status, and a total count is not one.
                  const cells = [
                    { display: `${e.risks}`, rating: null },
                    { display: `${e.high}`, rating: l.high },
                    { display: `${e.cov}%`, rating: l.cov },
                    { display: `${e.overdue}`, rating: l.overdue },
                    { display: `${e.open}`, rating: l.open },
                    { display: `${e.rcsa}%`, rating: l.rcsa },
                  ];
                  return (
                    <tr
                      key={e.code}
                      onClick={() => setScope(e.code)}
                      data-hov="surface-2"
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        style={{
                          padding: 'var(--row-py) 16px',
                          position: 'sticky',
                          left: 0,
                          background: 'var(--surface)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              width: '26px',
                              height: '20px',
                              borderRadius: '4px',
                              background: 'var(--surface-3)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              fontFamily: 'var(--mono)',
                              color: 'var(--text-2)',
                              flexShrink: 0,
                            }}
                          >
                            {e.flag}
                          </span>
                          <span style={{ lineHeight: 1.2 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--text)',
                              }}
                            >
                              {e.name}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '10.5px',
                                color: 'var(--text-3)',
                              }}
                            >
                              {e.local}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', padding: 'var(--row-py) 8px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '20px',
                            background: ov.bg,
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: ov.dot,
                            }}
                          />
                          <span style={{ fontSize: '11px', fontWeight: 700, color: ov.ink }}>
                            {tr(
                              e.overall === 'G'
                                ? 'rag.good'
                                : e.overall === 'R'
                                  ? 'rag.critical'
                                  : 'rag.watch',
                            )}
                          </span>
                        </span>
                      </td>
                      {cells.map((c, ci) => (
                        <td
                          key={ci}
                          style={{
                            textAlign: 'center',
                            padding: 'var(--row-py) 8px',
                            background: c.rating ? tok(c.rating).bg : 'transparent',
                            fontFamily: 'var(--mono)',
                            fontWeight: 600,
                            fontSize: '13px',
                            color: c.rating ? tok(c.rating).ink : 'var(--text-2)',
                          }}
                        >
                          {c.display}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                        ›
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === 'scorecard' && (
          <div
            style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {matrix.map(({ e, l }) => {
              const ov = tok(e.overall);
              const metrics = [
                {
                  key: 'dash.col.high',
                  rating: l.high,
                  display: `${e.high}`,
                  d: delta(e.high, e.prev.high),
                  bar: null,
                },
                {
                  key: 'dash.col.cov',
                  rating: l.cov,
                  display: `${e.cov}%`,
                  d: `${delta(e.cov, e.prev.cov)} pt`,
                  bar: e.cov,
                },
                {
                  key: 'dash.col.overdue',
                  rating: l.overdue,
                  display: `${e.overdue}`,
                  d: '',
                  bar: null,
                },
                { key: 'dash.col.open', rating: l.open, display: `${e.open}`, d: '', bar: null },
                {
                  key: 'dash.col.rcsa',
                  rating: l.rcsa,
                  display: `${e.rcsa}%`,
                  d: `${delta(e.rcsa, e.prev.rcsa)} pt`,
                  bar: e.rcsa,
                },
              ] as const;
              return (
                <div
                  key={e.code}
                  onClick={() => setScope(e.code)}
                  data-hov="scorecard-row"
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 0,
                    border: '1px solid var(--border)',
                    borderRadius: '11px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'var(--surface)',
                  }}
                >
                  <span style={{ width: '4px', background: ov.dot, flexShrink: 0 }} />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '13px',
                      padding: '12px 16px',
                      width: '210px',
                      flexShrink: 0,
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        width: '30px',
                        height: '23px',
                        borderRadius: '5px',
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-2)',
                        flexShrink: 0,
                      }}
                    >
                      {e.flag}
                    </span>
                    <div style={{ lineHeight: 1.25, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                        {e.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '2px',
                        }}
                      >
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: ov.ink }}>
                          {tr(
                            e.overall === 'G'
                              ? 'rag.good'
                              : e.overall === 'R'
                                ? 'rag.critical'
                                : 'rag.watch',
                          )}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                          · {trf('dash.scorecard.risks', { n: e.risks })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5,1fr)',
                      gap: 0,
                    }}
                  >
                    {metrics.map((m) => (
                      <div
                        key={m.key}
                        style={{ padding: '11px 14px', borderRight: '1px solid var(--border)' }}
                      >
                        <div
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '.3px',
                            textTransform: 'uppercase',
                            color: 'var(--text-3)',
                            marginBottom: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tr(m.key)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: tok(m.rating).dot,
                              flexShrink: 0,
                              alignSelf: 'center',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '16px',
                              fontWeight: 600,
                              fontFamily: 'var(--mono)',
                              color: 'var(--text)',
                            }}
                          >
                            {m.display}
                          </span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              fontFamily: 'var(--mono)',
                              color: 'var(--text-3)',
                            }}
                          >
                            {m.d}
                          </span>
                        </div>
                        <div
                          style={{
                            height: '3px',
                            borderRadius: '2px',
                            background: 'var(--surface-3)',
                            marginTop: '7px',
                            overflow: 'hidden',
                            // {{ m.barHide }} — the fragment injects a hide here
                            // for metrics that are counts, not percentages: a
                            // bar needs a scale, and "7 overdue" has none.
                            display: m.bar === null ? 'none' : undefined,
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${m.bar ?? 0}%`,
                              background: tok(m.rating).dot,
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          <IconInfo
            width="14"
            height="14"
            stroke="var(--text-3)"
            strokeWidth="1.8"
            style={{ color: 'var(--text-3)' }}
          />
          <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
            {ragNoteBefore}
            <b style={{ color: 'var(--text-2)' }}>{tr('dash.ragNote.status')}</b>
            {ragNoteAfter}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr',
          gap: '16px',
          marginTop: '16px',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700 }}>{tr('dash.topRisks.title')}</div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              {entity ? scopeLabel : tr('dash.topRisks.meta')}
            </span>
          </div>
          <div>
            {topRisks.length === 0 && (
              <div style={{ padding: '44px', textAlign: 'center' }}>
                <IconSearch
                  width="30"
                  height="30"
                  stroke="var(--text-3)"
                  strokeWidth="1.5"
                  style={{ marginBottom: '8px', opacity: 0.7 }}
                />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
                  {tr('dash.topRisks.empty')}
                </div>
              </div>
            )}
            {topRisks.map((r) => {
              const b = riskBand(r.residual);
              const bt = tok(b.rating);
              return (
                <Link
                  key={r.id}
                  href="/risks"
                  data-hov="surface-2"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      minWidth: '30px',
                      height: '24px',
                      padding: '0 7px',
                      borderRadius: '6px',
                      background: bt.bg,
                      color: bt.ink,
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {r.residual}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        lineHeight: 1.3,
                      }}
                    >
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                        marginTop: '1px',
                      }}
                    >
                      {r.id} · {r.entity}
                    </div>
                  </div>
                  <IconChevronRight
                    width="15"
                    height="15"
                    stroke="var(--text-3)"
                    strokeWidth="1.8"
                    style={{ flexShrink: 0 }}
                  />
                </Link>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>
            {tr('dash.issues.title')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '16px' }}>
            {trf('dash.issues.meta', { n: scopedIssues.length, period: periodLabel })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {bySeverity.map((s) => {
              const st = tok(s.rating);
              return (
                <div key={s.key}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '5px',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-2)',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '2px',
                          background: st.dot,
                        }}
                      />
                      {tr(s.labelKey)}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                        color: st.ink,
                      }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '6px',
                      borderRadius: '3px',
                      background: 'var(--surface-3)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round((s.n / maxSeverity) * 100)}%`,
                        background: st.dot,
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>
            {tr('dash.controls.title')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '16px' }}>
            {trf('dash.controls.meta', { n: scopedControls.length })}
          </div>
          <div
            style={{
              display: 'flex',
              height: '9px',
              borderRadius: '5px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            {controlEff.map((c) => (
              <div
                key={c.key}
                style={{
                  width: `${Math.round((c.n / controlTotal) * 100)}%`,
                  background: tok(c.rating).dot,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            {controlEff.map((c) => {
              const ct = tok(c.rating);
              return (
                <div
                  key={c.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-2)',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: ct.dot,
                      }}
                    />
                    {tr(c.labelKey)}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                    <b style={{ fontFamily: 'var(--mono)', color: ct.ink }}>{c.n}</b> ·{' '}
                    {Math.round((c.n / controlTotal) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
