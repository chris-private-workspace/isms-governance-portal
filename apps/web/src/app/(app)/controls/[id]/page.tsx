'use client';

/**
 * File: apps/web/src/app/(app)/controls/[id]/page.tsx
 * Purpose: One control in the library — how it is tested, what it evidences, who signed it.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/08-control-detail.html (175 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   TWO COLLECTIONS ARE DERIVED HERE, NOT STORED, because the prototype derives
 *   them and controlDetail.ts deliberately stopped at what it could transcribe:
 *     - LINKED OBLIGATIONS are the framework mapping re-projected
 *       (dc.html:5212): each citation's standard and clause joined into one
 *       reference, its requirement reused as the name. So the obligations card
 *       can never cite a standard the mapping above it does not.
 *     - LINKED RISKS are the register's own rows for the SAME ENTITY, at most
 *       three (dc.html:5213). A real control-to-risk relationship is a
 *       core-model edge this fixture does not carry, so the prototype's rule is
 *       kept rather than a plausible one invented.
 *
 *   THE BAND IS THE CHARTER'S, NOT THE PROTOTYPE'S. dc.html:5213 bands the
 *   residual with the mockup's own >=15 / >=8 thresholds; riskBand() bands at
 *   >=16 and >=6 (CLAUDE.md parameter #7). Used here for the same reason the
 *   risk detail screen uses it — a control that lists RSK-0430 must not call it
 *   High while the risk register calls it Medium.
 *
 *   THE SIGN-OFF CHAIN IS THE ONE PLACE THE RECORD DECIDES WHETHER A SIGNATURE
 *   EXISTS: an Ineffective control is not approved, so its third circle stays
 *   hollow and reads 'pending' (dc.html:5233). CTL-2300 and CTL-2410 show it.
 *
 *   ONE LEDGER ROW CAN READ AS A NO-OP AND THAT IS THE DESIGN. The newest entry
 *   records the result changing FROM 'Partial' (dc.html:5236 hardcodes the
 *   before value), so a control whose current result is Partial shows
 *   Partial -> Partial. Ported as written rather than suppressed: hiding the row
 *   would edit an append-only ledger to make it look tidier.
 *
 *   INERT BY DESIGN: three affordances would write to or read from a server
 *   this port does not have — Record test, Download on each evidence artefact,
 *   and Export evidence over the ledger. They render disabled (opacity .5 +
 *   not-allowed, components/controls.md's own disabled state) and shell.inert
 *   says why on hover. Day-3 found all three looking live.
 *
 * Key Components:
 *   - ControlDetailPage: the screen, its three tabs, and its not-found state
 *   - obligations / linkedRisks: the two derivations described above
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — control detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/08-control-detail.html
 *   - apps/web/src/data/extended/controlDetail.ts — the transcribed collections
 *   - apps/web/src/lib/posture.ts — riskBand(), the charter's thresholds
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { controls } from '@/data/controls';
import { entityPosture } from '@/data/entityPosture';
import {
  CONTROL_FRAMEWORK_FALLBACK,
  CONTROL_FRAMEWORKS,
  CONTROL_NATURE,
  CONTROL_NATURE_FALLBACK,
  CONTROL_NEXT_TEST,
  CONTROL_RESULT,
  controlAuditTrail,
  controlEvidence,
  controlSignOff,
  controlTestHistory,
} from '@/data/extended/controlDetail';
import type { TrailText } from '@/data/extended/riskDetail';
import { risks } from '@/data/risks';
import type { TranslationKey } from '@/i18n';
import { riskBand } from '@/lib/posture';
import { tok } from '@/lib/tok';

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

const PAD_CARD: React.CSSProperties = { ...CARD, padding: '18px' };

const CARD_TITLE: React.CSSProperties = { fontSize: '13px', fontWeight: 700 };

const FIELD_LABEL: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '.4px',
  marginBottom: '4px',
};

const TH: React.CSSProperties = {
  textAlign: 'left',
  padding: '9px 18px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  borderBottom: '1px solid var(--border)',
};

const TH_MID: React.CSSProperties = { ...TH, padding: '9px 12px' };

const TH_CENTER: React.CSSProperties = { ...TH_MID, textAlign: 'center' };

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Applied to every action that would need a server. Not an invented visual:
 * it is the design system's own disabled state.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

/**
 * riskBand()'s four band words, as keys.
 *
 * A switch rather than a lookup table so it is TOTAL over what riskBand() can
 * return — a table would need a fallback, and any fallback here is a band label
 * the page would state without having derived it.
 */
function bandKey(label: string): TranslationKey {
  switch (label) {
    case 'Critical':
      return 'controlDetail.band.critical';
    case 'High':
      return 'controlDetail.band.high';
    case 'Medium':
      return 'controlDetail.band.medium';
    default:
      return 'controlDetail.band.low';
  }
}

type TabId = 'tests' | 'evidence' | 'risks';

export default function ControlDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  // dc.html:5196 — the prototype opens on the test history.
  const [tab, setTab] = useState<TabId>('tests');

  const control = controls.find((c) => c.id === id) ?? null;

  const back = (
    <Link
      href="/controls"
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
        textDecoration: 'none',
      }}
    >
      <IconChevronLeft width="15" height="15" stroke="currentColor" strokeWidth="2" />
      {tr('controlDetail.back')}
    </Link>
  );

  if (!control) {
    return (
      <div data-screen-label="Control detail">
        <DemoBadge />
        <div style={{ marginBottom: '14px' }}>{back}</div>
        <div style={{ ...PAD_CARD, maxWidth: '560px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('controlDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('controlDetail.notFound.body', { id: id ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  // dc.html:5215 — the vocabulary is closed at three values, so the fallback is
  // unreachable from this fixture. It exists because the lookup is by string
  // key, and it reads neutral rather than asserting a result the record lacks.
  const result = CONTROL_RESULT[control.result] ?? {
    rating: 'N',
    labelKey: 'controlDetail.result.partial' as TranslationKey,
  };
  const rTok = tok(result.rating);

  const natureKey = CONTROL_NATURE[control.freq] ?? CONTROL_NATURE_FALLBACK;
  const flag = entityPosture.find((e) => e.code === control.entity)?.flag ?? '';
  const owner = trf('controlDetail.owner.value', { entity: control.entity });

  const frameworks = CONTROL_FRAMEWORKS[control.id] ?? CONTROL_FRAMEWORK_FALLBACK;

  // dc.html:5212 — the obligations ARE the mapping, restated as citations.
  const obligations = frameworks.map((fw) => ({
    ref: `${fw.fw} ${fw.ref}`,
    nameKey: fw.nameKey,
  }));

  // dc.html:5213 — the register's own rows for this entity, at most three.
  const linkedRisks = risks
    .filter((r) => r.entity === control.entity)
    .slice(0, 3)
    .map((r) => {
      const residual = r.imp * r.lik;
      const band = riskBand(residual);
      return { id: r.id, title: r.title, residual, band, t: tok(band.rating) };
    });

  const testHistory = controlTestHistory({
    lastTest: control.lastTest,
    result: control.result,
    cov: control.cov,
  });
  const evidence = controlEvidence({ lastTest: control.lastTest });
  const signOff = controlSignOff({
    entity: control.entity,
    lastTest: control.lastTest,
    result: control.result,
  });
  const trail = controlAuditTrail({
    id: control.id,
    cov: control.cov,
    lastTest: control.lastTest,
    resultKey: result.labelKey,
  });

  /** Resolve one ledger value: a figure off the record, or a word that is copy. */
  const trailText = (value: TrailText) =>
    'text' in value ? value.text : 'vars' in value ? trf(value.key, value.vars) : tr(value.key);

  const TABS = [
    {
      id: 'tests' as const,
      labelKey: 'controlDetail.tab.tests' as TranslationKey,
      n: testHistory.length,
    },
    {
      id: 'evidence' as const,
      labelKey: 'controlDetail.tab.evidence' as TranslationKey,
      n: evidence.length,
    },
    {
      id: 'risks' as const,
      labelKey: 'controlDetail.tab.risks' as TranslationKey,
      n: linkedRisks.length,
    },
  ];

  return (
    <div data-screen-label="Control detail">
      <DemoBadge />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        {back}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            fontSize: '11px',
            color: 'var(--text-3)',
            fontFamily: 'var(--mono)',
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--rag-g)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
          {tr('controlDetail.locked')}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '24px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: '660px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '7px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'var(--mono)',
                color: 'var(--primary-ink)',
                fontWeight: 600,
              }}
            >
              {control.id}
            </span>
            <span
              style={{
                width: '22px',
                height: '16px',
                borderRadius: '4px',
                background: 'var(--surface-3)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8.5px',
                fontWeight: 700,
                fontFamily: 'var(--mono)',
                color: 'var(--text-2)',
              }}
            >
              {flag}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {control.type} · {tr(natureKey)} · {control.freq} · {control.entity}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: '23px',
              fontWeight: 700,
              letterSpacing: '-.3px',
              lineHeight: 1.15,
            }}
          >
            {control.name}
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
              background: rTok.bg,
            }}
          >
            <span
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: rTok.dot }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: rTok.ink }}>
              {tr(result.labelKey)}
            </span>
          </span>
          {/* Inert: recording a test needs a write path and a workpaper store,
              neither of which exists in this port. */}
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
            {tr('controlDetail.recordTest')}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.62fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={PAD_CARD}>
            <div style={{ ...CARD_TITLE, marginBottom: '10px' }}>
              {tr('controlDetail.description')}
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
              {trf('controlDetail.desc', {
                // dc.html:5244 lowercases both inside the sentence.
                type: control.type.toLowerCase(),
                freq: control.freq.toLowerCase(),
                entity: control.entity,
              })}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4,1fr)',
                gap: '14px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.type')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{control.type}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.nature')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{tr(natureKey)}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.freq')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{control.freq}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.owner')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{owner}</div>
              </div>
            </div>
          </div>

          <div style={PAD_CARD}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={CARD_TITLE}>{tr('controlDetail.frameworks')}</div>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {tr('controlDetail.frameworks.meta')}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {frameworks.map((fw) => (
                <div
                  key={`${fw.fw} ${fw.ref}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                  }}
                >
                  <span
                    style={{
                      minWidth: '104px',
                      fontSize: '10.5px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      color: 'var(--primary-ink)',
                      background: 'var(--primary-tint)',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {fw.fw}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 600,
                      color: 'var(--text-2)',
                      flexShrink: 0,
                      width: '82px',
                    }}
                  >
                    {fw.ref}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      flex: 1,
                      lineHeight: 1.35,
                    }}
                  >
                    {tr(fw.nameKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                gap: '2px',
                padding: '6px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
                flexWrap: 'wrap',
              }}
            >
              {TABS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  style={{
                    padding: '8px 13px',
                    border: 'none',
                    borderRadius: '7px',
                    background: tab === entry.id ? 'var(--surface)' : 'transparent',
                    color: tab === entry.id ? 'var(--primary-ink)' : 'var(--text-2)',
                    fontFamily: 'inherit',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tr(entry.labelKey)}
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      marginLeft: '6px',
                      color: 'var(--text-3)',
                    }}
                  >
                    {entry.n}
                  </span>
                </button>
              ))}
            </div>

            {tab === 'tests' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={TH}>{tr('controlDetail.col.date')}</th>
                    <th style={TH_MID}>{tr('controlDetail.col.tester')}</th>
                    <th style={TH_CENTER}>{tr('controlDetail.col.sample')}</th>
                    <th style={TH_MID}>{tr('controlDetail.col.result')}</th>
                    <th style={TH}>{tr('controlDetail.col.note')}</th>
                  </tr>
                </thead>
                <tbody>
                  {testHistory.map((run, index) => {
                    const runResult = CONTROL_RESULT[run.result];
                    const runTok = tok(runResult?.rating ?? 'N');
                    return (
                      <tr
                        key={`${index}-${run.date}`}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td
                          style={{
                            padding: '11px 18px',
                            fontSize: '12px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {run.date}
                        </td>
                        <td
                          style={{
                            padding: '11px 12px',
                            fontSize: '12.5px',
                            color: 'var(--text-2)',
                          }}
                        >
                          {tr(run.testerKey)}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '11px 12px',
                            fontSize: '12px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-3)',
                          }}
                        >
                          {run.sample}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 9px',
                              borderRadius: '20px',
                              background: runTok.bg,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: runTok.dot,
                              }}
                            />
                            <span
                              style={{ fontSize: '11.5px', fontWeight: 600, color: runTok.ink }}
                            >
                              {runResult ? tr(runResult.labelKey) : run.result}
                            </span>
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '11px 18px',
                            fontSize: '11.5px',
                            color: 'var(--text-3)',
                          }}
                        >
                          {tr(run.noteKey)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === 'evidence' && (
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {evidence.map((file) => (
                  <div
                    key={file.nameKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      padding: '11px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '9px',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-3)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M14 3v5h5" />
                      <path d="M6 2h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                        {file.nameVars ? trf(file.nameKey, file.nameVars) : tr(file.nameKey)}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--text-3)',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {trf('controlDetail.evidence.line', {
                          meta: trf(file.metaKey, { date: control.lastTest }),
                          hash: file.hash,
                        })}
                      </div>
                    </div>
                    {/* Inert: no document service stands behind the artefact.
                        A <span>, so there is no `disabled` to set — the pointer
                        cursor was the whole of its liveness and it is what goes. */}
                    <span
                      title={tr('shell.inert')}
                      style={{
                        fontSize: '11px',
                        color: 'var(--primary-ink)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                        ...INERT,
                      }}
                    >
                      {tr('controlDetail.evidence.download')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'risks' && (
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {linkedRisks.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      padding: '11px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '9px',
                    }}
                  >
                    <span
                      style={{
                        minWidth: '28px',
                        height: '23px',
                        padding: '0 7px',
                        borderRadius: '6px',
                        background: r.t.bg,
                        color: r.t.ink,
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {r.residual}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                          fontSize: '10.5px',
                          color: 'var(--text-3)',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {r.id} · {tr(bandKey(r.band.label))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={PAD_CARD}>
            <div style={{ ...CARD_TITLE, marginBottom: '12px' }}>
              {tr('controlDetail.obligations')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {obligations.map((ob) => (
                <div
                  key={ob.ref}
                  style={{
                    display: 'flex',
                    gap: '9px',
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontFamily: 'var(--mono)',
                      fontWeight: 700,
                      color: 'var(--primary-ink)',
                      background: 'var(--primary-tint)',
                      borderRadius: '5px',
                      padding: '2px 6px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {ob.ref}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.35 }}>
                    {tr(ob.nameKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={PAD_CARD}>
            <div style={{ ...CARD_TITLE, marginBottom: '14px' }}>
              {tr('controlDetail.effectiveness')}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 600,
                  fontFamily: 'var(--mono)',
                  color: rTok.ink,
                }}
              >
                {control.cov}
              </span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  fontFamily: 'var(--mono)',
                  color: 'var(--text-3)',
                }}
              >
                %
              </span>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: rTok.ink,
                  marginLeft: '6px',
                }}
              >
                {tr(result.labelKey)}
              </span>
            </div>
            <div
              style={{
                height: '7px',
                borderRadius: '4px',
                background: 'var(--surface-3)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${control.cov}%`,
                  background: rTok.dot,
                  borderRadius: '4px',
                }}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.lastTest')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {control.lastTest}
                </div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.nextTest')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {CONTROL_NEXT_TEST}
                </div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.freq')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{control.freq}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('controlDetail.meta.nature')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{tr(natureKey)}</div>
              </div>
            </div>
          </div>

          <div style={PAD_CARD}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-2)"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
              </svg>
              <div style={CARD_TITLE}>{tr('controlDetail.signOff')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {signOff.map((step, index) => (
                <div key={step.roleKey} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: step.done ? 'var(--primary)' : 'var(--surface)',
                        border: `2px solid ${step.done ? 'var(--primary)' : 'var(--border-strong)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {step.done && (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span
                      style={{
                        width: '2px',
                        flex: 1,
                        minHeight: '14px',
                        background: 'var(--border)',
                        ...(index === signOff.length - 1 ? { visibility: 'hidden' as const } : {}),
                      }}
                    />
                  </div>
                  <div style={{ paddingBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--text-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '.4px',
                      }}
                    >
                      {tr(step.roleKey)}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                      {step.who.tag === 'entityTeam'
                        ? trf('controlDetail.signOff.ownerWho', { entity: step.who.entity })
                        : step.who.tag === 'internalAudit'
                          ? tr('controlDetail.signOff.testedWho')
                          : trf('controlDetail.signOff.approvedWho', { name: step.who.name })}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {step.date} ·{' '}
                      {tr(
                        step.done
                          ? 'controlDetail.signOff.signed'
                          : 'controlDetail.signOff.pending',
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px 18px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-2)"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 018 0v3" />
                </svg>
                <div>
                  {/* The fragment prints the same string twice, once at 13px and
                      once at 10px (08-control-detail.html:144). Ported as
                      written — the second line is a defect in the design, not in
                      the transcription. The risk detail screen has the same. */}
                  <div style={CARD_TITLE}>{tr('controlDetail.audit.title')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {tr('controlDetail.audit.title')}
                  </div>
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--rag-g-ink)',
                  background: 'var(--rag-g-bg)',
                  borderRadius: '20px',
                  padding: '3px 9px',
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
                </svg>
                {tr('controlDetail.audit.tamperEvident')}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 18px',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                fontSize: '10px',
                color: 'var(--text-3)',
                fontFamily: 'var(--mono)',
              }}
            >
              <span>{tr('controlDetail.audit.chain')}</span>
              {/* Inert: exporting evidence needs a signing and packaging
                  service that does not exist yet. */}
              <span
                title={tr('shell.inert')}
                style={{
                  color: 'var(--primary-ink)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  ...INERT,
                }}
              >
                {tr('controlDetail.audit.export')}
              </span>
            </div>
            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              {trail.map((entry) => (
                <div
                  key={entry.seq}
                  style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 700,
                        color: 'var(--text-3)',
                      }}
                    >
                      {entry.seq}
                    </span>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: entry.dot,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        flex: 1,
                        lineHeight: 1.3,
                      }}
                    >
                      {tr(entry.actionKey)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      marginBottom: '6px',
                      paddingLeft: '2px',
                    }}
                  >
                    <span style={{ fontSize: '10.5px', color: 'var(--text-2)' }}>
                      {tr(entry.fieldKey)}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-3)',
                        textDecoration: 'line-through',
                        background: 'var(--surface-3)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {trailText(entry.before)}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-3)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'var(--mono)',
                        color: 'var(--text)',
                        fontWeight: 600,
                        background: 'var(--primary-tint)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                      }}
                    >
                      {trailText(entry.after)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingLeft: '2px',
                    }}
                  >
                    <span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                      <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                        {trailText(entry.actor)}
                      </b>{' '}
                      · {trailText(entry.role)}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.ts}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '5px',
                      paddingLeft: '2px',
                      fontSize: '9px',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
                      <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
                    </svg>
                    {trf('controlDetail.audit.hash', { hash: entry.hash })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
