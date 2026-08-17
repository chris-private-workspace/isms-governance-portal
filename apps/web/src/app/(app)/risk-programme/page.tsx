'use client';

/**
 * File: apps/web/src/app/(app)/risk-programme/page.tsx
 * Purpose: The information security risk procedure, its scoring model and the
 *     Risk Management Report worksheets that implement it.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/19-risk-programme.html (234 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   This screen is where confirmed parameter #7 stops being a sentence in the
 *   charter and becomes arithmetic on screen, so three things are computed
 *   rather than copied:
 *
 *   1. THE 5x5 MATRIX IS MULTIPLIED, not transcribed. Each cell is
 *      likelihood x impact and each band comes from riskBand() in lib/posture.ts.
 *      The prototype had its own banding — dc.html:3883-3884 puts the red line
 *      at 15 — and the charter's is 16. dc.html:4486's scoreTok DOES use 16, so
 *      the prototype disagrees with itself; the charter settles it. One visible
 *      consequence: scoreTok calls 6 and 7 green, riskBand calls them amber, so
 *      the two cells reading 6 are amber here and were green in the mockup.
 *   2. EVERY RISK SCORE IN THE WORKSHEET IS RECOMPUTED from its own six inputs
 *      by riskScore() — likelihood x MAX(FIN, BOP, LRY, REP, SIS). The
 *      prototype stored the product as a seventh number; all 60 stored values
 *      were checked against the computation before being dropped, so this is a
 *      verified simplification rather than a hopeful one.
 *   3. The pair count and the register's pending count are reductions over the
 *      data, not the fragment's literals (port rule 10).
 *
 *   NOT SCOPED BY THE TOPBAR, deliberately. This is one regional procedure — the
 *   header says "across APAC" and the version history has a single approving
 *   committee. Filtering it by the selected OpCo would suggest each OpCo has its
 *   own procedure, which is the opposite of what a canonical core means.
 *
 *   The procedure text is a controlled document and is NOT routed through the
 *   dictionaries — see extended/riskProgramme.ts. Only the furniture around it
 *   is translated.
 *
 * Key Components:
 *   - RiskProgrammePage: the screen; owns the tab and the worksheet selection
 *   - TABS / SHEET_LABEL: the two local selections, both genuinely wired
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — risk programme port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/19-risk-programme.html
 *   - apps/web/src/data/extended/riskModel.ts — the scale and the arithmetic
 */

import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { useShell } from '@/components/shell/shell-state';
import { IMPACTS, LIKELIHOOD, riskScore } from '@/data/extended/riskModel';
import { RP_RESPONSIBILITIES, RP_STEPS, RP_TRIGGERS } from '@/data/extended/riskProgramme';
import { RM_ABBREV, RM_ROWS, RM_SHEETS, type RmRow, type RmSheet } from '@/data/extended/rmReport';
import { riskRegister } from '@/data/riskRegister';
import { rmVersions } from '@/data/rmVersions';
import type { TranslationKey } from '@/i18n';
import { riskBand } from '@/lib/posture';
import { tok } from '@/lib/tok';

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

/** components/controls.md:7 — disabled is opacity .5 with cursor not-allowed. */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

/** Fragment :72,:108,:174,:198 — the tinted strip above a scrolling table. */
const CARD_HEAD: React.CSSProperties = {
  padding: '13px 18px',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)',
};

/** dc.html:4581 — five tabs, in the design's order. Keys stay literal (rule 8). */
const TABS = [
  { id: 'procedure', key: 'riskProg.tab.procedure' },
  { id: 'model', key: 'riskProg.tab.model' },
  { id: 'report', key: 'riskProg.tab.report' },
  { id: 'register', key: 'riskProg.tab.register' },
  { id: 'control', key: 'riskProg.tab.control' },
] as const satisfies readonly { id: string; key: TranslationKey }[];

type TabId = (typeof TABS)[number]['id'];

/**
 * Worksheet name -> its tab label.
 *
 * Written out rather than derived from the name, for the reason the dashboard
 * gives: a key assembled at runtime type-checks, renders, and is invisible to
 * the source scan in i18n.test.ts.
 */
const SHEET_LABEL: Record<RmSheet, TranslationKey> = {
  Services: 'riskProg.sheet.services',
  People: 'riskProg.sheet.people',
  Intangible: 'riskProg.sheet.intangible',
  'Physical & Virtual': 'riskProg.sheet.physical',
  Software: 'riskProg.sheet.software',
  Information: 'riskProg.sheet.information',
};

/** Fragment :75,:77 — likelihood table columns. */
const LIK_COLS = '44px 128px minmax(0,1fr) 132px';
/** Fragment :111,:113 — impact table columns. */
const IMP_COLS = '40px 108px repeat(5,minmax(0,1fr))';
/** Fragment :133,:137 — worksheet columns. */
const RM_COLS = '150px minmax(0,1.5fr) minmax(0,1.5fr) 52px 224px 214px 224px';
/** Fragment :178,:182 — register columns. */
const REG_COLS = '36px minmax(0,1.4fr) minmax(0,1.6fr) minmax(0,1.5fr) 150px 108px 96px';
/** Fragment :199,:201 — version table columns. */
const VER_COLS = '80px 90px minmax(0,1fr) 118px 88px';

const TH: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
};

/** Fragment :144-148 — the five impact chips, identical but for their value. */
const IMPACT_CHIP: React.CSSProperties = {
  width: '22px',
  height: '24px',
  borderRadius: '5px',
  background: 'var(--surface-3)',
  color: 'var(--text-3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--mono)',
  fontSize: '11px',
};

/** Fragment :16 — the export button's download glyph. */
function IconDownload() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4v11" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}

/** Fragment :224 — a completed item in the submission set. */
function IconTick() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--rag-g)"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Fragment :226 — an item still waiting. */
function IconPending() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--rag-a)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  );
}

/**
 * One scored block — likelihood, the five impact dimensions, then the product.
 *
 * Shared by the Before and After columns because they are the same six numbers
 * scored twice; the fragment repeats the markup (:142-150 and :152-160) and the
 * two copies are character-identical.
 */
function ScoreBlock({ v, label }: { v: RmRow['b']; label: string }) {
  const [lkh, ...impacts] = v;
  const score = riskScore(lkh, impacts);
  const st = tok(riskBand(score).rating);
  return (
    <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }} title={label}>
      <span
        style={{
          width: '26px',
          height: '24px',
          borderRadius: '5px',
          background: 'var(--surface-3)',
          color: 'var(--text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
        }}
      >
        {lkh}
      </span>
      {impacts.map((n, i) => (
        <span key={i} style={IMPACT_CHIP}>
          {n}
        </span>
      ))}
      <span
        style={{
          width: '34px',
          height: '24px',
          borderRadius: '5px',
          background: st.bg,
          color: st.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--mono)',
          fontSize: '11.5px',
          fontWeight: 700,
          marginLeft: '3px',
        }}
      >
        {score}
      </span>
    </span>
  );
}

export default function RiskProgrammePage() {
  const { tr, trf } = useShell();
  const [tab, setTab] = useState<TabId>('procedure');
  const [sheet, setSheet] = useState<RmSheet>('Services');

  // The fragment bolds the accountable party mid-sentence. Splitting the string
  // into two keys would hand a translator half a clause each; a placeholder
  // keeps it one unit and lets the emphasis sit where the language puts it.
  const [accBefore, accAfter] = tr('riskProg.accountable').split('{who}');

  const rows = RM_ROWS[sheet];
  // 'Pending' is the register's own Open state — the two In-progress items have
  // an owner and a date and are not waiting on the committee.
  const pending = riskRegister.filter((r) => r.status === 'Open').length;

  return (
    <div data-screen-label="Risk programme — ISMS">
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
            {tr('riskProg.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('riskProg.title')}
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-2)',
              marginTop: '5px',
              maxWidth: '680px',
              textWrap: 'pretty',
            }}
          >
            {tr('riskProg.subtitle')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Both disabled: generating the .xlsx workbook and submitting it to
              the committee each need a backend this port does not have. Shown
              disabled per controls.md:7, and the export button's hover
              declaration is dropped — a hover response reads as 'live'. */}
          <button
            type="button"
            disabled
            title={tr('shell.inert')}
            style={{
              height: '34px',
              padding: '0 14px',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              ...INERT,
            }}
          >
            <IconDownload />
            {tr('riskProg.export')}
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
            {tr('riskProg.submit')}
          </button>
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
          marginBottom: '18px',
          width: 'fit-content',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={on}
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
              {tr(t.key)}
            </button>
          );
        })}
      </div>

      {tab === 'procedure' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 320px',
            gap: '18px',
            alignItems: 'start',
          }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px' }}
          >
            {RP_STEPS.map((s) => (
              <div key={s.n} style={{ ...CARD, padding: '16px 18px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '9px',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '7px',
                      background: 'var(--primary-tint)',
                      color: 'var(--primary-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      flexShrink: 0,
                    }}
                  >
                    {s.n}
                  </span>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      lineHeight: 1.35,
                      textWrap: 'pretty',
                    }}
                  >
                    {s.title}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    lineHeight: 1.65,
                    color: 'var(--text-2)',
                    textWrap: 'pretty',
                  }}
                >
                  {s.body}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    marginTop: '11px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  {accBefore}
                  <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{s.who}</b>
                  {accAfter}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
                {tr('riskProg.triggers.title')}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-2)',
                  lineHeight: 1.6,
                  marginBottom: '11px',
                  textWrap: 'pretty',
                }}
              >
                {tr('riskProg.triggers.intro')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {RP_TRIGGERS.map((t) => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      gap: '9px',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--text-3)',
                        flexShrink: 0,
                        marginTop: '7px',
                      }}
                    />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div
                style={{
                  padding: '13px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {tr('riskProg.roles.title')}
              </div>
              {RP_RESPONSIBILITIES.map((r) => (
                <div
                  key={r.role}
                  style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '7px' }}>
                    {r.role}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {r.items.map((it) => (
                      <div
                        key={it}
                        style={{
                          display: 'flex',
                          gap: '8px',
                          fontSize: '11.5px',
                          color: 'var(--text-2)',
                          lineHeight: 1.5,
                          textWrap: 'pretty',
                        }}
                      >
                        <span
                          style={{
                            width: '3px',
                            height: '3px',
                            borderRadius: '50%',
                            background: 'var(--text-3)',
                            flexShrink: 0,
                            marginTop: '7px',
                          }}
                        />
                        {it}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'model' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <div style={{ ...CARD, overflow: 'auto' }}>
              <div
                style={{
                  ...CARD_HEAD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700 }}>
                  {tr('riskProg.likelihood.title')}
                </span>
                <span
                  style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}
                >
                  {tr('riskProg.formula')}
                </span>
              </div>
              <div
                style={{
                  ...TH,
                  display: 'grid',
                  gridTemplateColumns: LIK_COLS,
                  minWidth: '470px',
                  gap: '12px',
                  padding: '9px 18px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span>{tr('riskProg.likelihood.col.score')}</span>
                <span>{tr('riskProg.likelihood.col.category')}</span>
                <span>{tr('riskProg.likelihood.col.description')}</span>
                <span>{tr('riskProg.likelihood.col.probability')}</span>
              </div>
              {LIKELIHOOD.map((l) => (
                <div
                  key={l.s}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: LIK_COLS,
                    minWidth: '470px',
                    gap: '12px',
                    padding: '10px 18px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12.5px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      color: 'var(--primary-ink)',
                    }}
                  >
                    {l.s}
                  </span>
                  <span style={{ fontWeight: 600 }}>{l.cat}</span>
                  <span style={{ color: 'var(--text-2)', lineHeight: 1.45 }}>{l.desc}</span>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11.5px',
                      color: 'var(--text-2)',
                    }}
                  >
                    {l.p}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ ...CARD, padding: '18px 20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                {tr('riskProg.calc.title')}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '14px' }}>
                {tr('riskProg.calc.sub')}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '118px repeat(5,minmax(0,1fr))',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                <span />
                {/* Ascending impact, so the axis reads 1..5 left to right —
                    IMPACTS is stored highest-first for the table below. */}
                {[...IMPACTS]
                  .sort((a, b) => a.s - b.s)
                  .map((i) => (
                    <span
                      key={i.s}
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                        textAlign: 'center',
                        letterSpacing: '.3px',
                      }}
                    >
                      {i.abbr}
                    </span>
                  ))}
                {LIKELIHOOD.map((l) => (
                  <div key={l.s} style={{ display: 'contents' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-2)',
                        textAlign: 'right',
                        paddingRight: '8px',
                        lineHeight: 1.25,
                      }}
                    >
                      <b style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{l.s}</b>{' '}
                      {l.cat}
                    </span>
                    {[1, 2, 3, 4, 5].map((im) => {
                      const v = l.s * im;
                      const t = tok(riskBand(v).rating);
                      const over = v >= 16;
                      return (
                        <span
                          key={im}
                          style={{
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: over ? `2px solid ${t.dot}` : '1px solid var(--border)',
                            borderRadius: '7px',
                            background: t.bg,
                            color: t.ink,
                            fontFamily: 'var(--mono)',
                            fontSize: '13px',
                            fontWeight: over ? 700 : 500,
                          }}
                        >
                          {v}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-2)',
                  lineHeight: 1.65,
                  marginTop: '14px',
                  textWrap: 'pretty',
                }}
              >
                {tr('riskProg.calc.note')}
              </div>
            </div>
          </div>

          <div style={{ ...CARD, overflow: 'auto' }}>
            <div
              style={{
                ...CARD_HEAD,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700 }}>
                {tr('riskProg.impact.title')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {tr('riskProg.impact.types')}
              </span>
            </div>
            <div
              style={{
                ...TH,
                display: 'grid',
                gridTemplateColumns: IMP_COLS,
                minWidth: '900px',
                gap: '12px',
                padding: '9px 18px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>{tr('riskProg.impact.col.score')}</span>
              <span>{tr('riskProg.impact.col.category')}</span>
              <span>{tr('riskProg.impact.col.fin')}</span>
              <span>{tr('riskProg.impact.col.bop')}</span>
              <span>{tr('riskProg.impact.col.lry')}</span>
              <span>{tr('riskProg.impact.col.rep')}</span>
              <span>{tr('riskProg.impact.col.sis')}</span>
            </div>
            {IMPACTS.map((i) => (
              <div
                key={i.s}
                style={{
                  display: 'grid',
                  gridTemplateColumns: IMP_COLS,
                  minWidth: '900px',
                  gap: '12px',
                  padding: '11px 18px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '11.5px',
                  lineHeight: 1.5,
                  color: 'var(--text-2)',
                  alignItems: 'start',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontWeight: 700,
                    color: 'var(--primary-ink)',
                    fontSize: '12.5px',
                  }}
                >
                  {i.s}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '12.5px' }}>
                  {i.cat}
                </span>
                <span style={{ textWrap: 'pretty' }}>{i.fin}</span>
                <span style={{ textWrap: 'pretty' }}>{i.bop}</span>
                <span style={{ textWrap: 'pretty' }}>{i.lry}</span>
                <span style={{ textWrap: 'pretty' }}>{i.rep}</span>
                <span style={{ textWrap: 'pretty' }}>{i.sis}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'report' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
              flexWrap: 'wrap',
            }}
          >
            {RM_SHEETS.map((s) => {
              const on = sheet === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSheet(s)}
                  aria-pressed={on}
                  style={{
                    height: '32px',
                    padding: '0 14px',
                    border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    background: on ? 'var(--primary-tint)' : 'var(--surface-2)',
                    color: on ? 'var(--primary-ink)' : 'var(--text-2)',
                    fontFamily: 'inherit',
                    fontSize: '12.5px',
                    fontWeight: on ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {tr(SHEET_LABEL[s])}
                </button>
              );
            })}
            <span style={{ marginLeft: '6px', fontSize: '11.5px', color: 'var(--text-3)' }}>
              {trf('riskProg.report.meta', { n: rows.length, sheet: tr(SHEET_LABEL[sheet]) })}
            </span>
          </div>

          <div style={{ ...CARD, overflow: 'auto' }}>
            <div
              style={{
                ...TH,
                display: 'grid',
                gridTemplateColumns: RM_COLS,
                minWidth: '1160px',
                gap: '10px',
                padding: '9px 16px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                letterSpacing: '.4px',
              }}
            >
              <span>{tr('riskProg.report.col.group')}</span>
              <span>{tr('riskProg.report.col.threat')}</span>
              <span>{tr('riskProg.report.col.vuln')}</span>
              <span>{tr('riskProg.report.col.cia')}</span>
              <span>{tr('riskProg.report.col.before')}</span>
              <span>{tr('riskProg.report.col.controls')}</span>
              <span>{tr('riskProg.report.col.after')}</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={`${r.grp}-${r.threat}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: RM_COLS,
                  minWidth: '1160px',
                  gap: '10px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                  alignItems: 'start',
                }}
              >
                <span>
                  <b style={{ display: 'block', fontWeight: 600, lineHeight: 1.35 }}>{r.grp}</b>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10.5px',
                      color: 'var(--text-3)',
                      marginTop: '3px',
                      lineHeight: 1.4,
                    }}
                  >
                    {r.det}
                  </span>
                </span>
                <span style={{ color: 'var(--text)', lineHeight: 1.45, textWrap: 'pretty' }}>
                  {r.threat}
                </span>
                <span style={{ color: 'var(--text-2)', lineHeight: 1.45, textWrap: 'pretty' }}>
                  {r.vuln}
                </span>
                <span
                  style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-2)' }}
                >
                  {r.cia}
                </span>
                <ScoreBlock
                  v={r.b}
                  label={trf('riskProg.report.scoreLabel', {
                    lkh: r.b[0],
                    max: Math.max(...r.b.slice(1)),
                    score: riskScore(r.b[0], r.b.slice(1)),
                  })}
                />
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10.5px',
                    color: 'var(--text-2)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {r.ctl}
                </span>
                <ScoreBlock
                  v={r.a}
                  label={trf('riskProg.report.scoreLabel', {
                    lkh: r.a[0],
                    max: Math.max(...r.a.slice(1)),
                    score: riskScore(r.a[0], r.a.slice(1)),
                  })}
                />
              </div>
            ))}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
                padding: '12px 16px',
                background: 'var(--surface-2)',
                flexWrap: 'wrap',
              }}
            >
              {RM_ABBREV.map((a) => (
                <span key={a.k} style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  <b style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{a.k}</b> {a.v}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'register' && (
        <div style={{ ...CARD, overflow: 'auto' }}>
          <div
            style={{
              ...CARD_HEAD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700 }}>
              {tr('riskProg.register.title')}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {tr('riskProg.register.meta')}
            </span>
          </div>
          <div
            style={{
              ...TH,
              display: 'grid',
              gridTemplateColumns: REG_COLS,
              minWidth: '1080px',
              gap: '12px',
              padding: '9px 18px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span>{tr('riskProg.register.col.item')}</span>
            <span>{tr('riskProg.register.col.tv')}</span>
            <span>{tr('riskProg.register.col.existing')}</span>
            <span>{tr('riskProg.register.col.add')}</span>
            <span>{tr('riskProg.register.col.who')}</span>
            <span>{tr('riskProg.register.col.target')}</span>
            <span>{tr('riskProg.register.col.status')}</span>
          </div>
          {riskRegister.map((r) => {
            const s = tok(riskBand(r.score).rating);
            const st = tok(r.status === 'Open' ? 'R' : 'A');
            return (
              <div
                key={r.item}
                style={{
                  display: 'grid',
                  gridTemplateColumns: REG_COLS,
                  minWidth: '1080px',
                  gap: '12px',
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                  alignItems: 'start',
                }}
              >
                <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{r.item}</span>
                <span>
                  <b
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      textWrap: 'pretty',
                    }}
                  >
                    {r.tv}
                  </b>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      marginTop: '4px',
                      lineHeight: 1.5,
                      textWrap: 'pretty',
                    }}
                  >
                    {r.desc}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '19px',
                      padding: '0 7px',
                      borderRadius: '5px',
                      background: s.bg,
                      color: s.ink,
                      fontSize: '10.5px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      marginTop: '6px',
                    }}
                  >
                    {trf('riskProg.register.residual', { n: r.score })}
                  </span>
                </span>
                <span style={{ color: 'var(--text-2)', lineHeight: 1.55, textWrap: 'pretty' }}>
                  {r.existing}
                </span>
                <span style={{ color: 'var(--text)', lineHeight: 1.55, textWrap: 'pretty' }}>
                  {r.add}
                </span>
                <span style={{ color: 'var(--text-2)', lineHeight: 1.45 }}>{r.who}</span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  {r.target}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '21px',
                    padding: '0 9px',
                    borderRadius: '6px',
                    background: st.bg,
                    color: st.ink,
                    fontSize: '11px',
                    fontWeight: 600,
                    justifySelf: 'start',
                  }}
                >
                  {tr(
                    r.status === 'Open'
                      ? 'riskProg.register.status.open'
                      : 'riskProg.register.status.inProgress',
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'control' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) 330px',
            gap: '18px',
            alignItems: 'start',
          }}
        >
          <div style={{ ...CARD, overflow: 'auto' }}>
            <div style={{ ...CARD_HEAD, fontSize: '12px', fontWeight: 700 }}>
              {tr('riskProg.version.title')}
            </div>
            <div
              style={{
                ...TH,
                display: 'grid',
                gridTemplateColumns: VER_COLS,
                minWidth: '620px',
                gap: '14px',
                padding: '9px 18px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>{tr('riskProg.version.col.version')}</span>
              <span>{tr('riskProg.version.col.by')}</span>
              <span>{tr('riskProg.version.col.note')}</span>
              <span>{tr('riskProg.version.col.eff')}</span>
              <span>{tr('riskProg.version.col.appr')}</span>
            </div>
            {rmVersions.map((v) => (
              <div
                key={v.ver}
                style={{
                  display: 'grid',
                  gridTemplateColumns: VER_COLS,
                  minWidth: '620px',
                  gap: '14px',
                  padding: '11px 18px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12.5px',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontWeight: 600,
                    color: 'var(--primary-ink)',
                  }}
                >
                  {v.ver}
                </span>
                <span style={{ color: 'var(--text-2)' }}>{v.by}</span>
                <span style={{ color: 'var(--text-2)', lineHeight: 1.45, textWrap: 'pretty' }}>
                  {v.note}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  {v.eff}
                </span>
                <span style={{ color: 'var(--text-2)' }}>{v.appr}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '11px' }}>
                {tr('riskProg.doc.title')}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '9px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>{tr('riskProg.doc.owner')}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>
                    {tr('riskProg.doc.ownerValue')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>
                    {tr('riskProg.doc.classification')}
                  </span>
                  <span style={{ fontWeight: 600 }}>{tr('riskProg.doc.classificationValue')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>{tr('riskProg.doc.publication')}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '11.5px' }}>
                    {tr('riskProg.doc.publicationValue')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>{tr('riskProg.doc.master')}</span>
                  <span style={{ fontWeight: 600 }}>{tr('riskProg.doc.masterValue')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--text-3)' }}>{tr('riskProg.doc.retention')}</span>
                  <span style={{ fontWeight: 600 }}>{tr('riskProg.doc.retentionValue')}</span>
                </div>
              </div>
            </div>

            <div style={{ ...CARD, padding: '16px 18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '11px' }}>
                {tr('riskProg.submission.title')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px' }}
                >
                  <IconTick />
                  {tr('riskProg.submission.assetInventory')}
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px' }}
                >
                  <IconTick />
                  {tr('riskProg.submission.rmReport')}
                </div>
                {/* The fragment hardcoded '2 items pending'. It happens to be
                    right for this fixture, which is exactly why it must not be
                    copied — it would stay 2 after the register changed. */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px' }}
                >
                  <IconPending />
                  {trf('riskProg.submission.register', { n: pending })}
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px' }}
                >
                  <IconTick />
                  {tr('riskProg.submission.soa')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
