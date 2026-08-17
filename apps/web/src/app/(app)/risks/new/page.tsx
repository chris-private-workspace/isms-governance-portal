'use client';

/**
 * File: apps/web/src/app/(app)/risks/new/page.tsx
 * Purpose: Capture a new risk register entry — title, scope, and a live residual score.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/05-risk-form.html (83 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout;
 *   the only mechanism change is style-hover -> data-hov="s3".
 *
 *   THIS IS A DEMO SCREEN WITH NO BACKEND, so Save must not pretend. Every
 *   control is controlled React state, Save stays disabled until the three
 *   fields the fragment marks with a red asterisk are filled, and pressing it
 *   raises an inline notice saying nothing was saved. A form that accepts a
 *   click and silently discards the record is the exact shape
 *   verification-discipline.md calls a dead control.
 *
 *   THREE PLACES WHERE THE FRAGMENT'S DATA IS NOT COPIED:
 *   1. Entity options read `opcos` (13). The fragment's hint-placeholder-count
 *      was 6 — the deliverable's sample scope, not the charter's 13 OpCos
 *      across 11 jurisdictions. Value is the OpCo code, since that is the
 *      identity the register keys on.
 *   2. Category options are derived from the risk fixture, which is what the
 *      prototype's own logic class did ([...new Set(risks.map(r=>r.category))]).
 *      Six distinct values, which is exactly the count the hint declared.
 *   3. Banding comes from riskBand() — the charter's >=16 treatment threshold
 *      (parameter #7). The prototype banded at >=15 / >=8, so a score of 15
 *      reads High there and Medium here. The charter wins; see the report.
 *
 *   KNOWN DIVERGENCE FROM THE ARCHITECTURE, stated rather than hidden:
 *   02-architecture/15-design-alignment.md:80-82 requires the risk form to
 *   capture FIVE impact dimensions (FIN/BOP/LRY/REP/SIS, max taken) and both
 *   pre- and post-control scores. The fragment has one impact value and one
 *   readout. This port is faithful to the fragment; closing that gap is open
 *   item #6 in the same document and needs a design, not an improvisation here.
 *
 * Key Components:
 *   - RiskFormPage: the screen
 *   - SCALE: the shared 1-5 impact / likelihood selector values
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — first of the three form screens
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/05-risk-form.html
 *   - apps/web/src/lib/posture.ts — riskBand() and the >=16 threshold
 */

import Link from 'next/link';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { useShell } from '@/components/shell/shell-state';
import { opcos } from '@/data/opcos';
import { risks } from '@/data/risks';
import { riskBand } from '@/lib/posture';
import { tok } from '@/lib/tok';

/** Fragment :58,66 — hint-placeholder-count="5" on both scales. */
const SCALE = [1, 2, 3, 4, 5] as const;

/**
 * The four treatment statuses and their display labels.
 *
 * Values are the fixture's own status strings so a saved record would match the
 * register; labels differ from values for exactly one of them ('Treatment' ->
 * 'In treatment'), which is the prototype's riskStatusTok mapping.
 */
const STATUS_OPTIONS = [
  { value: 'Open', labelKey: 'riskForm.status.open' },
  { value: 'Treatment', labelKey: 'riskForm.status.treatment' },
  { value: 'Monitored', labelKey: 'riskForm.status.monitored' },
  { value: 'Accepted', labelKey: 'riskForm.status.accepted' },
] as const;

/**
 * riskBand() returns an English band word; the UI needs a translated one.
 *
 * Written out as four literals rather than `sev.${label.toLowerCase()}` so the
 * keys stay greppable — a key assembled at runtime type-checks, renders, and is
 * invisible to the source scan in i18n.test.ts.
 */
const BAND_LABEL_KEY = {
  Critical: 'sev.critical',
  High: 'sev.high',
  Medium: 'sev.medium',
  Low: 'sev.low',
} as const;

/** Field label, copied from fragment :17. */
const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-2)',
  marginBottom: '6px',
};

/** Text input, copied from fragment :18. */
const INPUT: React.CSSProperties = {
  width: '100%',
  height: '38px',
  padding: '0 12px',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  background: 'var(--surface-2)',
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
};

/** Select, copied from fragment :27. */
const SELECT: React.CSSProperties = { ...INPUT, padding: '0 10px', cursor: 'pointer' };

export default function RiskFormPage() {
  const { tr, trf, entity } = useShell();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // null = "follow the topbar". Holding the shell's code in state instead would
  // freeze the field at whatever the scope was when the screen mounted.
  const [entityCode, setEntityCode] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<string>(STATUS_OPTIONS[0].value);
  // Prototype default (openNewRisk: fImpact:3, fLikelihood:3), copied.
  const [impact, setImpact] = useState(3);
  const [likelihood, setLikelihood] = useState(3);
  const [submitted, setSubmitted] = useState(false);

  const selectedEntity = entityCode ?? entity?.code ?? '';

  // The prototype's own derivation, not a hardcoded list.
  const categories = [...new Set(risks.map((r) => r.category))];

  const residual = impact * likelihood;
  const band = riskBand(residual);
  const bandTok = tok(band.rating);

  const complete = title.trim().length > 0 && selectedEntity !== '' && category !== '';

  return (
    <div data-screen-label="Risk form">
      <DemoBadge />

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
          marginBottom: '14px',
          textDecoration: 'none',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        {tr('riskForm.back')}
      </Link>

      <div style={{ marginBottom: '18px' }}>
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
          {tr('riskForm.idLabel')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('riskForm.heading')}
        </h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.55fr 1fr',
          gap: '16px',
          alignItems: 'start',
          maxWidth: '1000px',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div>
            <label htmlFor="risk-title" style={LABEL}>
              {tr('riskForm.title.label')}{' '}
              <span style={{ color: 'var(--rag-r)' }} title={tr('riskForm.required')}>
                *
              </span>
            </label>
            <input
              id="risk-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              aria-required="true"
              placeholder={tr('riskForm.title.placeholder')}
              style={INPUT}
            />
          </div>
          <div>
            <label htmlFor="risk-description" style={LABEL}>
              {tr('riskForm.description.label')}
            </label>
            <textarea
              id="risk-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tr('riskForm.description.placeholder')}
              style={{
                width: '100%',
                minHeight: '88px',
                padding: '11px 12px',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                background: 'var(--surface-2)',
                fontFamily: 'inherit',
                fontSize: '13px',
                color: 'var(--text)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label htmlFor="risk-entity" style={LABEL}>
                {tr('riskForm.entity.label')}{' '}
                <span style={{ color: 'var(--rag-r)' }} title={tr('riskForm.required')}>
                  *
                </span>
              </label>
              <select
                id="risk-entity"
                value={selectedEntity}
                onChange={(e) => setEntityCode(e.target.value)}
                required
                aria-required="true"
                style={SELECT}
              >
                <option value="">{tr('riskForm.entity.placeholder')}</option>
                {opcos.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="risk-category" style={LABEL}>
                {tr('riskForm.category.label')}{' '}
                <span style={{ color: 'var(--rag-r)' }} title={tr('riskForm.required')}>
                  *
                </span>
              </label>
              <select
                id="risk-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                aria-required="true"
                style={SELECT}
              >
                <option value="">{tr('riskForm.category.placeholder')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="risk-owner" style={LABEL}>
                {tr('riskForm.owner.label')}
              </label>
              <input
                id="risk-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder={tr('riskForm.owner.placeholder')}
                style={INPUT}
              />
            </div>
            <div>
              <label htmlFor="risk-status" style={LABEL}>
                {tr('riskForm.status.label')}
              </label>
              <select
                id="risk-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={SELECT}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {tr(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
            {tr('riskForm.assess.title')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '16px' }}>
            {tr('riskForm.assess.formula')}
          </div>

          {/* The two scales are identical apart from which state they drive, so
              they are rendered from one list rather than written out twice. */}
          {(
            [
              {
                id: 'impact',
                labelKey: 'riskForm.impact.label',
                optionKey: 'riskForm.impact.option',
                value: impact,
                set: setImpact,
                marginBottom: '16px',
              },
              {
                id: 'likelihood',
                labelKey: 'riskForm.likelihood.label',
                optionKey: 'riskForm.likelihood.option',
                value: likelihood,
                set: setLikelihood,
                marginBottom: '18px',
              },
            ] as const
          ).map((scale) => (
            <div key={scale.id} style={{ marginBottom: scale.marginBottom }}>
              {/* The fragment uses <label> for a control that is a row of
                  buttons, so it labels a group rather than a single input. */}
              <label
                id={`risk-${scale.id}-label`}
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  marginBottom: '7px',
                }}
              >
                {tr(scale.labelKey)}
              </label>
              <div
                role="group"
                aria-labelledby={`risk-${scale.id}-label`}
                style={{ display: 'flex', gap: '6px' }}
              >
                {SCALE.map((v) => {
                  const on = v === scale.value;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => scale.set(v)}
                      aria-pressed={on}
                      aria-label={trf(scale.optionKey, { n: v })}
                      style={{
                        flex: 1,
                        height: '36px',
                        border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                        borderRadius: '8px',
                        background: on ? 'var(--primary)' : 'var(--surface-2)',
                        color: on ? '#fff' : 'var(--text-2)',
                        fontFamily: 'var(--mono)',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
              background: bandTok.bg,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '.4px',
                marginBottom: '4px',
              }}
            >
              {tr('riskForm.residual.label')}
            </div>
            <div
              style={{
                fontSize: '34px',
                fontWeight: 600,
                fontFamily: 'var(--mono)',
                color: bandTok.ink,
                lineHeight: 1,
              }}
            >
              {residual}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: bandTok.dot,
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 700, color: bandTok.ink }}>
                {tr(BAND_LABEL_KEY[band.label as keyof typeof BAND_LABEL_KEY])}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '16px',
          maxWidth: '1000px',
          justifyContent: 'flex-end',
        }}
      >
        {!complete && (
          <span style={{ marginRight: 'auto', fontSize: '11.5px', color: 'var(--text-3)' }}>
            {tr('riskForm.saveHint')}
          </span>
        )}
        <Link
          href="/risks"
          data-hov="s3"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '38px',
            padding: '0 16px',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          {tr('riskForm.cancel')}
        </Link>
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={!complete}
          style={{
            height: '38px',
            padding: '0 18px',
            border: 'none',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '12.5px',
            fontWeight: 600,
            // components/controls.md: disabled is opacity .5 + not-allowed.
            cursor: complete ? 'pointer' : 'not-allowed',
            opacity: complete ? 1 : 0.5,
          }}
        >
          {tr('riskForm.save')}
        </button>
      </div>

      {submitted && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            maxWidth: '1000px',
            marginTop: '12px',
            padding: '11px 15px',
            borderRadius: '10px',
            background: 'var(--rag-a-bg)',
            border: '1px solid var(--rag-a)',
            color: 'var(--rag-a-ink)',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          {tr('riskForm.demoNotice')}
        </div>
      )}
    </div>
  );
}
