'use client';

/**
 * File: apps/web/src/app/(app)/risks/[id]/page.tsx
 * Purpose: One risk in the register — assessment, treatment, controls, ledger.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/06-risk-detail.html (277 lines, 15 sc-for,
 *   13 SVG — the densest screen in the handoff after the shell) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   THE BANDING IS THE CHARTER'S, NOT THE PROTOTYPE'S. dc.html:3883 bands at
 *   >=15 red / >=8 amber; lib/posture.ts riskBand() bands at >=16 (the
 *   charter's treatment threshold, CLAUDE.md parameter #7) and >=6. Three
 *   things therefore read differently from the mockup ON PURPOSE: a score of 15
 *   is Medium here and High there, and scores of 6-7 are Medium here and Low
 *   there. Every band on this screen — the 25 matrix cells, the three score
 *   cards, the six history badges — goes through riskBand(), so they cannot
 *   disagree with each other or with the dashboard.
 *
 *   ONE RATING IS DERIVED WHERE THE PROTOTYPE HARDCODED IT. dc.html:4994 paints
 *   the Inherent card red for every risk, but its own assessment-history table
 *   (dc.html:5008) bands the same number. Deriving it makes the two agree; the
 *   fixture holds inherent scores as low as 12, which the charter calls Medium.
 *
 *   THE 5x5 CARRIES THREE MARKERS, all computed (dc.html:4976-4992): R is the
 *   residual cell (impact x likelihood off the record), I is inherent — whose
 *   likelihood is BACK-DERIVED as inh/imp because risks.ts stores an inherent
 *   score but not its factors — and T is the appetite target. R outlines solid,
 *   I outlines thin, T outlines dashed, so overlapping markers stay readable.
 *
 *   TWO COUNTS THAT DISAGREE, both correct. 'Controls mapped' in the metadata
 *   grid is the RECORD's own field; '{n} controls mitigating this risk' above
 *   the list is the length of the list rendered beneath it, because a caption
 *   that contradicts the rows under it is worse than one that differs from a
 *   field elsewhere. The prototype used the record field for both.
 *
 *   The description is per CATEGORY, not per risk (dc.html:4941) — all four
 *   Cyber & InfoSec risks share one sentence about unpatched software. Carried
 *   across rather than improved, and recorded here so it is not read as a bug.
 *
 *   INERT BY DESIGN: three affordances would write to or read from a server
 *   this port does not have — Edit risk, the workpaper reference on the control
 *   tests tab, and Export evidence over the ledger. They render disabled
 *   (opacity .5 + not-allowed, components/controls.md's own disabled state) and
 *   shell.inert says why on hover. Day-3 found all three looking live.
 *
 * Key Components:
 *   - RiskDetailPage: the screen, its three tabs, and its not-found state
 *   - matrixRows: the 5x5 grid with the I / R / T markers
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — risk detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/06-risk-detail.html
 *   - apps/web/src/data/extended/riskDetail.ts — the transcribed collections
 *   - apps/web/src/lib/posture.ts — riskBand(), the charter's thresholds
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { NoSource } from '@/components/NoSource';
import { useShell } from '@/components/shell/shell-state';

import {
  RISK_ASSESSMENT_CYCLES,
  RISK_CATEGORY_FALLBACK,
  RISK_CATEGORY_META,
  RISK_DECISION_FALLBACK,
  RISK_DECISIONS,
  RISK_DEFAULT_WORKPAPER,
  RISK_NEXT_REVIEW,
  RISK_STAGES,
  RISK_STATUS_DECISION,
  RISK_STATUS_STAGE,
  riskAuditTrail,
  riskSignOff,
  type TrailText,
} from '@/data/extended/riskDetail';
import type { TranslationKey } from '@/i18n';
import { getRisk, type RiskRow } from '@/lib/api/risks';
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

/** dc.html:3885 — Open is red, Treatment amber, Monitored green, Accepted neutral. */
const STATUS: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Open: { rating: 'R', labelKey: 'riskDetail.status.open' },
  Treatment: { rating: 'A', labelKey: 'riskDetail.status.treatment' },
  Monitored: { rating: 'G', labelKey: 'riskDetail.status.monitored' },
  Accepted: { rating: 'N', labelKey: 'riskDetail.status.accepted' },
};

/** riskBand()'s four band words, as keys. */
const BAND_KEY: Record<string, TranslationKey> = {
  Critical: 'riskDetail.band.critical',
  High: 'riskDetail.band.high',
  Medium: 'riskDetail.band.medium',
  Low: 'riskDetail.band.low',
};

/** dc.html:3886 — the control library's three-value result vocabulary. */
const CONTROL_RESULT: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Effective: { rating: 'G', labelKey: 'riskDetail.result.effective' },
  Partial: { rating: 'A', labelKey: 'riskDetail.result.partial' },
  Ineffective: { rating: 'R', labelKey: 'riskDetail.result.ineffective' },
};

/** dc.html:3888 — High and Critical are one red band, as on the dashboard. */
const SEVERITY: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Critical: { rating: 'R', labelKey: 'riskDetail.sev.critical' },
  High: { rating: 'R', labelKey: 'riskDetail.sev.high' },
  Medium: { rating: 'A', labelKey: 'riskDetail.sev.medium' },
  Low: { rating: 'G', labelKey: 'riskDetail.sev.low' },
};

/** dc.html:3889 — the issue register's own status palette. */
const ISSUE_STATUS: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Overdue: { rating: 'R', labelKey: 'riskDetail.issueStatus.overdue' },
  'In progress': { rating: 'A', labelKey: 'riskDetail.issueStatus.inProgress' },
  Closed: { rating: 'G', labelKey: 'riskDetail.issueStatus.closed' },
  Open: { rating: 'N', labelKey: 'riskDetail.issueStatus.open' },
};

type TabId = 'assess' | 'tests' | 'issues';

export default function RiskDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  // dc.html:4911 — the prototype opens on the assessment history.
  const [tab, setTab] = useState<TabId>('assess');

  // ⚠️ Both "no such risk" and "that risk belongs to another entity" arrive here
  // as null, and that is the point (AC-6). The API refuses to tell them apart,
  // so this screen must not either — one state, one card, no branch.
  const [source, setSource] = useState<{ row: RiskRow | null; failed: boolean; loading: boolean }>({
    row: null,
    failed: false,
    loading: true,
  });

  useEffect(() => {
    if (typeof id !== 'string') {
      setSource({ row: null, failed: false, loading: false });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const answer = await getRisk(id);
        // ⛔ No fixture fallback (AC-5): a dead backend must not render as a risk.
        if (!cancelled) setSource({ row: answer?.data ?? null, failed: false, loading: false });
      } catch {
        if (!cancelled) setSource({ row: null, failed: true, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const api = source.row;

  // dc.html:4976 recovered the inherent likelihood by dividing the stored score
  // by impact. The same identity runs the other way here, and it is exact rather
  // than a reconstruction: the database stores lkh and lkh × MAX(impacts), so
  // MAX(impacts) — which IS the single `imp` the design uses (15-design-alignment.md)
  // — is the quotient. Verified against the seed: 12 / 3 = 4, and the row's
  // impacts are {1,4,2,3,1}.
  const scored =
    api !== null && api.lkhBefore !== null && api.lkhBefore > 0 && api.scoreBefore !== null;

  const risk =
    api === null
      ? null
      : {
          id: api.refCode,
          routeId: api.id,
          title: api.title,
          category: api.category ?? RISK_CATEGORY_FALLBACK,
          updated: api.updatedAt,
          imp: scored ? api.scoreBefore! / api.lkhBefore! : 0,
          lik: api.lkhBefore ?? 0,
          inh: api.scoreBefore ?? 0,
          scoreAfter: api.scoreAfter,
          // No source in the API. lib/api/risks.ts documents which and why.
          entity: null as string | null,
          owner: null as string | null,
          role: null as string | null,
          status: null as string | null,
        };

  const back = (
    <Link
      href="/risks"
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
      {tr('riskDetail.back')}
    </Link>
  );

  if (source.loading) {
    return (
      <div data-screen-label="Risk detail">
        <DemoBadge variant="partial" />
        <div style={{ marginBottom: '14px' }}>{back}</div>
        <div style={{ ...PAD_CARD, maxWidth: '560px' }} data-source-state="loading">
          <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
            {tr('risks.source.loading')}
          </div>
        </div>
      </div>
    );
  }

  if (source.failed) {
    return (
      <div data-screen-label="Risk detail">
        <DemoBadge variant="partial" />
        <div style={{ marginBottom: '14px' }}>{back}</div>
        <div style={{ ...PAD_CARD, maxWidth: '560px' }} data-source-state="error">
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('risks.source.error.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {tr('risks.source.error.body')}
          </p>
        </div>
      </div>
    );
  }

  // ⭐ ONE CARD FOR BOTH REFUSALS (AC-6). An id that does not exist and an id
  // that belongs to another entity both arrive as null, and both render exactly
  // this. There is deliberately no branch here to keep them apart: a branch is
  // all it would take to turn this screen into an oracle for which ids are real.
  if (!risk) {
    return (
      <div data-screen-label="Risk detail">
        <DemoBadge variant="partial" />
        <div style={{ marginBottom: '14px' }}>{back}</div>
        <div style={{ ...PAD_CARD, maxWidth: '560px' }} data-source-state="not-found">
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('riskDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('riskDetail.notFound.body', { id: id ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  // An unassessed risk has no score, and NULL is the honest answer — not zero.
  // Every block below divides by or bands on those numbers, so rather than let
  // a 0 propagate into a heat map that would then draw a cell, the record stops
  // at its header.
  if (!scored) {
    return (
      <div data-screen-label="Risk detail">
        <DemoBadge variant="partial" />
        <div style={{ marginBottom: '14px' }}>{back}</div>
        <div style={{ ...PAD_CARD, maxWidth: '560px' }} data-source-state="unassessed">
          <div
            style={{
              fontSize: '10.5px',
              fontFamily: 'var(--mono)',
              color: 'var(--primary-ink)',
              fontWeight: 600,
            }}
          >
            {risk.id}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0 8px' }}>{risk.title}</div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {tr('riskDetail.unassessed.body')}
          </p>
        </div>
      </div>
    );
  }

  const residual = risk.imp * risk.lik;
  const residualBand = riskBand(residual);
  const residualTok = tok(residualBand.rating);
  const inherentBand = riskBand(risk.inh);
  const inherentTok = tok(inherentBand.rating);

  // The API's status vocabulary is not this screen's, so the chip falls back to
  // its neutral form rather than guessing a mapping between the two.
  const status = (risk.status === null ? undefined : STATUS[risk.status]) ?? {
    rating: 'N',
    labelKey: 'riskDetail.status.open' as TranslationKey,
  };
  const stTok = tok(status.rating);

  const meta = RISK_CATEGORY_META[risk.category] ?? RISK_CATEGORY_META[RISK_CATEGORY_FALLBACK]!;
  const apTok = tok(meta.appetiteRating);
  const withinAppetite = residual <= meta.apScore;

  // dc.html:4955 — status decides how far along the five stages the record is.
  const stage = (risk.status === null ? undefined : RISK_STATUS_STAGE[risk.status]) ?? 2;

  const decisionValue =
    (risk.status === null ? undefined : RISK_STATUS_DECISION[risk.status]) ??
    RISK_DECISION_FALLBACK;
  const decision = RISK_DECISIONS.find((d) => d.value === decisionValue) ?? RISK_DECISIONS[1]!;

  // dc.html:4976 — risks.ts stores the inherent SCORE but not the factors it was
  // built from, so the inherent likelihood is recovered by dividing out impact.
  const inhImp = risk.imp;
  const inhLik = Math.max(1, Math.min(5, Math.round(risk.inh / risk.imp)));
  const tgtImp = risk.imp;
  const tgtLik = Math.max(1, Math.floor(meta.apScore / risk.imp) || 1);
  const tgtScore = tgtImp * tgtLik;
  const targetBand = riskBand(tgtScore);

  const matrixRows = [5, 4, 3, 2, 1].map((likVal) => ({
    label: String(likVal),
    cells: [1, 2, 3, 4, 5].map((impVal) => {
      const band = riskBand(impVal * likVal);
      const marks: string[] = [];
      if (impVal === risk.imp && likVal === risk.lik) marks.push('R');
      if (impVal === inhImp && likVal === inhLik) marks.push('I');
      if (impVal === tgtImp && likVal === tgtLik) marks.push('T');

      const t = tok(band.rating);
      let bg = t.bg;
      let mark = 'transparent';
      let ring: React.CSSProperties = {};
      if (marks.includes('R')) {
        bg = t.dot;
        mark = '#fff';
        ring = { outline: '2px solid var(--text)', outlineOffset: '-2px' };
      } else if (marks.includes('I')) {
        mark = t.ink;
        ring = { outline: '1.5px solid var(--text-2)', outlineOffset: '-2px' };
      } else if (marks.includes('T')) {
        mark = 'var(--primary-ink)';
        ring = { outline: '1.5px dashed var(--primary)', outlineOffset: '-2px' };
      }
      return { key: `${impVal}-${likVal}`, bg, tag: marks.join('·'), mark, ring };
    }),
  }));

  // dc.html:4993-4997. Inherent and Residual take their colour from the band;
  // Target is always the primary outline because it is a goal, not a state.
  const scoreCards = [
    {
      key: 'inherent',
      labelKey: 'riskDetail.score.inherent' as TranslationKey,
      mark: 'I',
      imp: inhImp,
      lik: inhLik,
      score: risk.inh,
      bandKey: BAND_KEY[inherentBand.label]!,
      bg: 'transparent',
      badgeBg: inherentTok.bg,
      badgeInk: inherentTok.ink,
      badgeBorder: 'none',
      ink: inherentTok.ink,
    },
    {
      key: 'residual',
      labelKey: 'riskDetail.score.residual' as TranslationKey,
      mark: 'R',
      imp: risk.imp,
      lik: risk.lik,
      score: residual,
      bandKey: BAND_KEY[residualBand.label]!,
      bg: 'var(--surface-2)',
      badgeBg: residualTok.dot,
      badgeInk: '#fff',
      badgeBorder: 'none',
      ink: residualTok.ink,
    },
    {
      key: 'target',
      labelKey: 'riskDetail.score.target' as TranslationKey,
      mark: 'T',
      imp: tgtImp,
      lik: tgtLik,
      score: tgtScore,
      bandKey: BAND_KEY[targetBand.label]!,
      bg: 'transparent',
      badgeBg: 'transparent',
      badgeInk: 'var(--primary-ink)',
      badgeBorder: '2px dashed var(--primary)',
      ink: 'var(--primary-ink)',
    },
  ];

  // ⛔ EMPTY, AND DELIBERATELY NOT FILLED FROM THE FIXTURE. Both lists were keyed
  // by the risk's OpCo code, and the API sends an org_entity_id that no OpCo code
  // corresponds to (AD-EntityVocabularyMismatch-1) — so keying them would have
  // matched nothing anyway. Showing the fixture's controls next to a real risk
  // would attach another entity's controls to it, which is worse than showing
  // none. The screen says "no source" rather than rendering an empty list,
  // because an empty list of controls reads as "this risk has none".
  // The element types come from the fixtures via `typeof import`, which TypeScript
  // erases — the JSX below still knows every field it reads, and the bundle does
  // not gain a fixture it never renders.
  const linkedFull: (typeof import('@/data/controls'))['controls'] = [];
  const derivedIssues: (typeof import('@/data/issues'))['issues'] = [];

  const cycles = RISK_ASSESSMENT_CYCLES.map((cycle) => ({
    ...cycle,
    resd: Math.min(25, residual + cycle.residualOffset),
  }));

  const signOff = riskSignOff({ owner: risk.owner ?? '', role: risk.role ?? '' });
  const trail = riskAuditTrail({
    owner: risk.owner ?? '',
    role: risk.role ?? '',
    lik: risk.lik,
    residual,
    statusKey: status.labelKey,
    decisionLabel: tr(decision.labelKey),
    workpaper: linkedFull[0]?.id ?? RISK_DEFAULT_WORKPAPER,
  });

  /** Resolve one ledger value: a figure off the record, or a word that is copy. */
  const trail_text = (value: TrailText) =>
    'text' in value ? value.text : 'vars' in value ? trf(value.key, value.vars) : tr(value.key);

  const TABS = [
    {
      id: 'assess' as const,
      labelKey: 'riskDetail.tab.assess' as TranslationKey,
      n: cycles.length,
    },
    {
      id: 'tests' as const,
      labelKey: 'riskDetail.tab.tests' as TranslationKey,
      n: linkedFull.length,
    },
    {
      id: 'issues' as const,
      labelKey: 'riskDetail.tab.issues' as TranslationKey,
      n: derivedIssues.length,
    },
  ];

  return (
    <div data-screen-label="Risk detail">
      <DemoBadge variant="partial" />

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
          {tr('riskDetail.locked')}
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
              {risk.id}
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
              &nbsp;
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              <NoSource label={tr('risks.noSource.title')} /> · {risk.category}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              <NoSource label={tr('risks.noSource.title')} />
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
            {risk.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '9px',
              background: apTok.bg,
              border: `1px solid ${apTok.dot}`,
            }}
          >
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.4px',
                color: apTok.ink,
              }}
            >
              {tr(meta.appetiteKey)}
            </span>
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 13px',
              borderRadius: '9px',
              background: stTok.bg,
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: stTok.dot,
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: stTok.ink }}>
              {tr(status.labelKey)}
            </span>
          </span>
          {/* Inert: there is no /risks/[id]/edit route in this port, and the
              register is read-only until a write path exists. */}
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
            {tr('riskDetail.edit')}
          </button>
        </div>
      </div>

      <div style={{ ...CARD, padding: '16px 20px', marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            {tr('riskDetail.lifecycle')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            {trf('riskDetail.lifecycle.meta', { n: stage + 1, updated: risk.updated })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {RISK_STAGES.map((stageKey, index) => {
            const done = index < stage;
            const current = index === stage;
            return (
              <div key={stageKey} style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '7px',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: done ? 'var(--primary)' : 'var(--surface)',
                      border: `2px solid ${done || current ? 'var(--primary)' : 'var(--border-strong)'}`,
                      color: done ? '#fff' : current ? 'var(--primary-ink)' : 'var(--text-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      ...(current ? { boxShadow: '0 0 0 3px var(--primary-tint)' } : {}),
                    }}
                  >
                    {done ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: done
                        ? 'var(--text)'
                        : current
                          ? 'var(--primary-ink)'
                          : 'var(--text-3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tr(stageKey)}
                  </span>
                </div>
                <span
                  style={{
                    height: '2px',
                    flex: 1,
                    background: index < stage ? 'var(--primary)' : 'var(--border)',
                    margin: '15px 8px 0',
                    ...(index === RISK_STAGES.length - 1 ? { visibility: 'hidden' as const } : {}),
                  }}
                />
              </div>
            );
          })}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div style={CARD_TITLE}>{tr('riskDetail.assessment.title')}</div>
              <div
                style={{ fontSize: '11.5px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}
              >
                {tr('riskDetail.assessment.meta')}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.05fr 1fr',
                gap: '22px',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex' }}>
                <div
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '.5px',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                    textAlign: 'center',
                    paddingRight: '4px',
                  }}
                >
                  {tr('riskDetail.axis.likelihood')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto repeat(5,1fr)',
                      gap: '3px',
                    }}
                  >
                    <div />
                    {['1', '2', '3', '4', '5'].map((col) => (
                      <div
                        key={col}
                        style={{
                          textAlign: 'center',
                          fontSize: '9px',
                          color: 'var(--text-3)',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {col}
                      </div>
                    ))}
                    {matrixRows.map((row) => (
                      <div key={row.label} style={{ display: 'contents' }}>
                        <div
                          style={{
                            fontSize: '9px',
                            color: 'var(--text-3)',
                            fontFamily: 'var(--mono)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingRight: '5px',
                          }}
                        >
                          {row.label}
                        </div>
                        {row.cells.map((cell) => (
                          <div
                            key={cell.key}
                            style={{
                              minHeight: '32px',
                              borderRadius: '5px',
                              background: cell.bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              ...cell.ring,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'var(--mono)',
                                color: cell.mark,
                              }}
                            >
                              {cell.tag}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '.5px',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                      marginTop: '6px',
                      paddingLeft: '18px',
                    }}
                  >
                    {tr('riskDetail.axis.impact')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {scoreCards.map((card) => (
                  <div
                    key={card.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      background: card.bg,
                    }}
                  >
                    <span
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: card.badgeBg,
                        color: card.badgeInk,
                        border: card.badgeBorder,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                        flexShrink: 0,
                      }}
                    >
                      {card.mark}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'var(--text-3)',
                          textTransform: 'uppercase',
                          letterSpacing: '.4px',
                        }}
                      >
                        {tr(card.labelKey)}
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text-2)' }}>
                        {trf('riskDetail.score.detail', { imp: card.imp, lik: card.lik })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 600,
                          fontFamily: 'var(--mono)',
                          color: card.ink,
                          lineHeight: 1,
                        }}
                      >
                        {card.score}
                      </div>
                      <div style={{ fontSize: '9.5px', fontWeight: 700, color: card.ink }}>
                        {tr(card.bandKey)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={PAD_CARD}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ ...CARD_TITLE, marginBottom: '2px' }}>
                  {tr('riskDetail.treatment.title')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px' }}>
                  {tr('riskDetail.treatment.sub')}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {RISK_DECISIONS.map((option) => {
                    const active = option.value === decisionValue;
                    return (
                      <div
                        key={option.value}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '9px 4px',
                          border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-strong)'}`,
                          borderRadius: '9px',
                          background: active ? 'var(--primary)' : 'var(--surface-2)',
                          color: active ? '#fff' : 'var(--text-2)',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {tr(option.labelKey)}
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                    marginTop: '11px',
                    lineHeight: 1.5,
                  }}
                >
                  {tr(decision.noteKey)}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                <div style={{ ...CARD_TITLE, marginBottom: '2px' }}>
                  {tr('riskDetail.appetite.title')}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px' }}>
                  {tr('riskDetail.appetite.sub')}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '11px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: apTok.ink }}>
                    {tr(meta.appetiteKey)}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--mono)',
                    }}
                  >
                    {trf('riskDetail.appetite.threshold', { n: meta.apScore })}
                  </span>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '9px',
                    background: withinAppetite ? 'var(--rag-g-bg)' : 'var(--rag-r-bg)',
                    border: `1px solid ${withinAppetite ? 'var(--rag-g)' : 'var(--rag-r)'}`,
                  }}
                >
                  {withinAppetite ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--rag-g-ink)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--rag-r-ink)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3 2 20h20L12 3z" />
                      <line x1="12" y1="10" x2="12" y2="14" />
                      <circle cx="12" cy="17" r=".6" fill="currentColor" />
                    </svg>
                  )}
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: withinAppetite ? 'var(--rag-g-ink)' : 'var(--rag-r-ink)',
                    }}
                  >
                    {tr(
                      withinAppetite ? 'riskDetail.appetite.within' : 'riskDetail.appetite.above',
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={PAD_CARD}>
            <div style={{ ...CARD_TITLE, marginBottom: '10px' }}>
              {tr('riskDetail.description')}
            </div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
              {trf(meta.descKey, { entity: tr('risks.noSource.title') })}
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
                <div style={FIELD_LABEL}>{tr('riskDetail.meta.owner')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                  <NoSource label={tr('risks.noSource.title')} />
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                  <NoSource label={tr('risks.noSource.title')} />
                </div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('riskDetail.meta.treatment')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{tr(decision.labelKey)}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('riskDetail.meta.nextReview')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{RISK_NEXT_REVIEW}</div>
              </div>
              <div>
                <div style={FIELD_LABEL}>{tr('riskDetail.meta.controls')}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  <NoSource label={tr('risks.noSource.title')} />
                </div>
              </div>
            </div>
          </div>

          <div style={PAD_CARD}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div style={CARD_TITLE}>{tr('riskDetail.linkedControls')}</div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                {trf('riskDetail.linkedControls.meta', { n: linkedFull.length })}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {linkedFull.map((control) => {
                const result = CONTROL_RESULT[control.result];
                const rTok = tok(result?.rating ?? 'N');
                return (
                  <div
                    key={control.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '11px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '9px',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: rTok.dot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                        {control.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-3)',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {control.id} · {control.type}
                      </div>
                    </div>
                    <div style={{ width: '118px', flexShrink: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '9.5px',
                          color: 'var(--text-3)',
                          marginBottom: '3px',
                        }}
                      >
                        <span>{tr('riskDetail.effectiveness')}</span>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            color: rTok.ink,
                            fontWeight: 600,
                          }}
                        >
                          {control.cov}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: '5px',
                          borderRadius: '3px',
                          background: 'var(--surface-3)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${control.cov}%`,
                            background: rTok.dot,
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: rTok.ink,
                        width: '72px',
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      {result ? tr(result.labelKey) : control.result}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={PAD_CARD}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ ...CARD_TITLE, marginBottom: '12px' }}>
                  {tr('riskDetail.obligations')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {meta.obligations.map((obligation) => (
                    <div
                      key={obligation.ref}
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
                        {obligation.ref}
                      </span>
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: 'var(--text-2)',
                          lineHeight: 1.35,
                        }}
                      >
                        {tr(obligation.nameKey)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px' }}>
                <div style={{ ...CARD_TITLE, marginBottom: '12px' }}>{tr('riskDetail.assets')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {meta.assets.map((asset) => (
                    <div
                      key={asset.nameKey}
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '8px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--text-3)"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                      >
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <line x1="8" y1="20" x2="16" y2="20" />
                        <line x1="12" y1="16" x2="12" y2="20" />
                      </svg>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                          {tr(asset.nameKey)}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                          {tr(asset.typeKey)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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

            {tab === 'assess' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={TH}>{tr('riskDetail.col.cycle')}</th>
                    <th style={TH_MID}>{tr('riskDetail.col.date')}</th>
                    <th style={TH_MID}>{tr('riskDetail.col.assessor')}</th>
                    <th style={TH_CENTER}>{tr('riskDetail.col.inh')}</th>
                    <th style={TH_CENTER}>{tr('riskDetail.col.res')}</th>
                    <th style={TH}>{tr('riskDetail.col.decision')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle) => {
                    const inhT = tok(riskBand(risk.inh).rating);
                    const resdT = tok(riskBand(cycle.resd).rating);
                    return (
                      <tr key={cycle.cycleKey} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td
                          style={{
                            padding: '11px 18px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: 'var(--text)',
                          }}
                        >
                          {tr(cycle.cycleKey)}
                        </td>
                        <td
                          style={{
                            padding: '11px 12px',
                            fontSize: '12px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {cycle.date}
                        </td>
                        <td
                          style={{
                            padding: '11px 12px',
                            fontSize: '12.5px',
                            color: 'var(--text-2)',
                          }}
                        >
                          {'fromOwner' in cycle.assessor ? (
                            <NoSource label={tr('risks.noSource.title')} />
                          ) : (
                            tr(cycle.assessor.key)
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '11px 12px' }}>
                          <span
                            style={{
                              minWidth: '26px',
                              height: '22px',
                              padding: '0 6px',
                              borderRadius: '5px',
                              background: inhT.bg,
                              color: inhT.ink,
                              fontFamily: 'var(--mono)',
                              fontWeight: 700,
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {risk.inh}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', padding: '11px 12px' }}>
                          <span
                            style={{
                              minWidth: '26px',
                              height: '22px',
                              padding: '0 6px',
                              borderRadius: '5px',
                              background: resdT.bg,
                              color: resdT.ink,
                              fontFamily: 'var(--mono)',
                              fontWeight: 700,
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {cycle.resd}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '11px 18px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-2)',
                          }}
                        >
                          {'current' in cycle.decision
                            ? tr(decision.labelKey)
                            : tr(cycle.decision.key)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === 'tests' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={TH}>{tr('riskDetail.col.control')}</th>
                    <th style={TH_MID}>{tr('riskDetail.col.tested')}</th>
                    <th style={TH_MID}>{tr('riskDetail.col.result')}</th>
                    <th style={TH}>{tr('riskDetail.col.evidence')}</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedFull.map((control, index) => {
                    const result = CONTROL_RESULT[control.result];
                    const rTok = tok(result?.rating ?? 'N');
                    // dc.html:5009 — alternating tester, first row Internal Audit.
                    const testerKey: TranslationKey =
                      index % 2 === 0
                        ? 'riskDetail.tester.internalAudit'
                        : 'riskDetail.tester.controlOwner';
                    return (
                      <tr key={control.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '11px 18px' }}>
                          <div
                            style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}
                          >
                            {control.name}
                          </div>
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: 'var(--text-3)',
                              fontFamily: 'var(--mono)',
                            }}
                          >
                            {trf('riskDetail.tests.by', {
                              id: control.id,
                              tester: tr(testerKey),
                            })}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '11px 12px',
                            fontSize: '12px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {control.lastTest}
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: rTok.dot,
                              }}
                            />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: rTok.ink }}>
                              {result ? tr(result.labelKey) : control.result}
                            </span>
                          </span>
                        </td>
                        <td style={{ padding: '11px 18px' }}>
                          {/* Inert: no document service stands behind the
                              workpaper reference. A <span>, so there is no
                              `disabled` to set — the pointer cursor was the
                              whole of its liveness and it is what goes. */}
                          <span
                            title={tr('shell.inert')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11.5px',
                              color: 'var(--primary-ink)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              ...INERT,
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 3v5h5" />
                              <path d="M6 2h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
                            </svg>
                            WP-{control.id}.pdf
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === 'issues' && (
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {derivedIssues.length === 0 && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>
                    {tr('riskDetail.issues.empty')}
                  </div>
                )}
                {derivedIssues.map((issue) => {
                  const sev = SEVERITY[issue.severity];
                  const sevTok = tok(sev?.rating ?? 'N');
                  const issueStatus = ISSUE_STATUS[issue.status] ?? ISSUE_STATUS.Open!;
                  const iTok = tok(issueStatus.rating);
                  return (
                    <div
                      key={issue.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '11px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '9px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: sevTok.ink,
                          background: sevTok.bg,
                          borderRadius: '5px',
                          padding: '3px 8px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {sev ? tr(sev.labelKey) : issue.severity}
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
                          {issue.title}
                        </div>
                        <div
                          style={{
                            fontSize: '10.5px',
                            color: 'var(--text-3)',
                            fontFamily: 'var(--mono)',
                          }}
                        >
                          {trf('riskDetail.issues.due', { id: issue.id, due: issue.due })}
                        </div>
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: iTok.bg,
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: iTok.dot,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: iTok.ink }}>
                          {tr(issueStatus.labelKey)}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div style={PAD_CARD}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px',
              }}
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
              <div style={CARD_TITLE}>{tr('riskDetail.signOff')}</div>
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
                      {step.who.tag === 'preparedBy'
                        ? trf('riskDetail.signOff.preparedWho', {
                            owner: step.who.owner,
                            role: step.who.role,
                          })
                        : step.who.tag === 'internalAudit'
                          ? tr('riskDetail.signOff.reviewedWho')
                          : trf('riskDetail.signOff.approvedWho', { name: step.who.name })}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {step.date} ·{' '}
                      {tr(step.done ? 'riskDetail.signOff.signed' : 'riskDetail.signOff.pending')}
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
                      once at 10px (dc.html:1077). Ported as written — the second
                      line is a defect in the design, not in the transcription. */}
                  <div style={CARD_TITLE}>{tr('riskDetail.audit.title')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {tr('riskDetail.audit.title')}
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
                {tr('riskDetail.audit.tamperEvident')}
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
              <span>{tr('riskDetail.audit.chain')}</span>
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
                {tr('riskDetail.audit.export')}
              </span>
            </div>
            <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
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
                      {trail_text(entry.before)}
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
                      {trail_text(entry.after)}
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
                        {trail_text(entry.actor)}
                      </b>{' '}
                      · {trail_text(entry.role)}
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
                    {trf('riskDetail.audit.hash', { hash: entry.hash })}
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
