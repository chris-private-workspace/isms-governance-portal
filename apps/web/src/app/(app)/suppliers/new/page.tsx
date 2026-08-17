'use client';

/**
 * File: apps/web/src/app/(app)/suppliers/new/page.tsx
 * Purpose: The external party risk assessment form — what access is granted, and why it is safe.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/22-supplier-form.html (47 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged; the one
 *   mechanism change is style-hover -> data-hov="s3".
 *
 *   Every field here corresponds to a populated column in the suppliers
 *   fixture, so all of them are treated as required and Submit stays disabled
 *   until they are filled. The fragment marks NOTHING required — no asterisks
 *   at all — so rather than invent asterisk markers the screen does not have,
 *   the requirement is expressed as aria-required plus one help line beside the
 *   disabled button (the placement components/controls.md gives help text).
 *
 *   Submit is honest about being a demo: it raises an inline notice saying no
 *   assessment was submitted for review. "Submit for RISO review" that quietly
 *   does nothing would be worse than no button at all.
 *
 *   THE OPTION LISTS ARE THE PROTOCOL'S, NOT INVENTED: access types, the four
 *   classification levels, the five common risks and the six common controls
 *   are the prototype's own arrays, and each matches its hint-placeholder-count
 *   exactly (4 / 4 / 5 / 6). Both checkbox groups start fully ticked, which is
 *   the fragment's defaultChecked="true".
 *
 *   GAP WORTH NAMING: this form has no entity field, while every row in the
 *   register carries an `opco`. A record created here would have no owning
 *   entity, which guardrail 4 does not allow. Adding the field is a change to
 *   the source form (confirmed parameter #9 forbids inventing fields), so it is
 *   reported rather than patched here.
 *
 * Key Components:
 *   - SupplierFormPage: the screen
 *   - COMMON_RISKS / COMMON_CONTROLS: the two checklists, ticked by default
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — third of the three form screens
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/22-supplier-form.html
 */

import Link from 'next/link';
import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { useShell } from '@/components/shell/shell-state';

/** Fragment :21 — hint-placeholder-count="4". */
const ACCESS_TYPES = [
  { value: 'Physical', labelKey: 'supplierForm.access.physical' },
  { value: 'Logical', labelKey: 'supplierForm.access.logical' },
  { value: 'Onsite', labelKey: 'supplierForm.access.onsite' },
  { value: 'Offsite', labelKey: 'supplierForm.access.offsite' },
] as const;

/** Fragment :23 — hint-placeholder-count="4". The register's `cls` column. */
const CLASSIFICATIONS = [
  { value: 'Public', labelKey: 'supplierForm.class.public' },
  { value: 'Internal', labelKey: 'supplierForm.class.internal' },
  { value: 'Confidential', labelKey: 'supplierForm.class.confidential' },
  { value: 'Restricted', labelKey: 'supplierForm.class.restricted' },
] as const;

/** Fragment :31 — hint-placeholder-count="5". */
const COMMON_RISKS = [
  'supplierForm.risks.theft',
  'supplierForm.risks.disclosure',
  'supplierForm.risks.physicalAccess',
  'supplierForm.risks.logicalAccess',
  'supplierForm.risks.disruption',
] as const;

/** Fragment :35 — hint-placeholder-count="6". */
const COMMON_CONTROLS = [
  'supplierForm.controls.entry',
  'supplierForm.controls.nac',
  'supplierForm.controls.logging',
  'supplierForm.controls.monitoring',
  'supplierForm.controls.nda',
  'supplierForm.controls.epra',
] as const;

/** Fragment :38 — the only select the fragment writes out by hand. */
const ADEQUACY = [
  { value: 'Yes', labelKey: 'supplierForm.adequate.yes' },
  { value: 'Partial', labelKey: 'supplierForm.adequate.partial' },
  { value: 'No', labelKey: 'supplierForm.adequate.no' },
] as const;

/** Section heading strip, copied from fragment :15. */
const SECTION: React.CSSProperties = {
  padding: '12px 18px',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)',
  fontSize: '12px',
  fontWeight: 700,
};

/** Field caption, copied from fragment :17. */
const CAPTION: React.CSSProperties = {
  display: 'block',
  fontSize: '11.5px',
  fontWeight: 600,
  color: 'var(--text-2)',
  marginBottom: '6px',
};

/** Text input and select share one declaration block in this fragment (:17,:21). */
const FIELD: React.CSSProperties = {
  width: '100%',
  height: '38px',
  padding: '0 11px',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  background: 'var(--surface-2)',
  fontFamily: 'inherit',
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
};

/** Checkbox row, copied from fragment :31. */
const CHECK_ROW: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  fontSize: '12.5px',
  color: 'var(--text-2)',
  cursor: 'pointer',
};

const CHECK_BOX: React.CSSProperties = {
  width: '15px',
  height: '15px',
  accentColor: 'var(--primary)',
};

export default function SupplierFormPage() {
  const { tr } = useShell();

  const [party, setParty] = useState('');
  const [reason, setReason] = useState('');
  const [asset, setAsset] = useState('');
  const [access, setAccess] = useState<string>(ACCESS_TYPES[0].value);
  const [classification, setClassification] = useState<string>(CLASSIFICATIONS[0].value);
  const [duration, setDuration] = useState('');
  const [people, setPeople] = useState('');
  const [riskChecked, setRiskChecked] = useState<string[]>([...COMMON_RISKS]);
  const [controlChecked, setControlChecked] = useState<string[]>([...COMMON_CONTROLS]);
  const [adequate, setAdequate] = useState<string>(ADEQUACY[0].value);
  // null = "still showing the default". Storing the translated string instead
  // would freeze it in whichever language the screen happened to mount in.
  const [assessor, setAssessor] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const assessorValue = assessor ?? tr('supplierForm.by.default');

  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const complete = [party, reason, asset, duration, people, assessorValue].every(
    (v) => v.trim().length > 0,
  );

  return (
    <div data-screen-label="External party assessment form">
      <DemoBadge />

      <Link
        href="/suppliers"
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
        {tr('supplierForm.back')}
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
          {tr('supplierForm.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('supplierForm.heading')}
        </h1>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
          maxWidth: '940px',
        }}
      >
        <div style={SECTION}>{tr('supplierForm.section.party')}</div>
        <div
          style={{
            padding: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: '14px 18px',
          }}
        >
          {/* The fragment wraps each control in its own <label>, so the caption
              and the control are already associated — nothing to add here. */}
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.party.label')}</span>
            <input
              value={party}
              onChange={(e) => setParty(e.target.value)}
              required
              aria-required="true"
              placeholder={tr('supplierForm.party.placeholder')}
              style={FIELD}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.reason.label')}</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              aria-required="true"
              placeholder={tr('supplierForm.reason.placeholder')}
              style={FIELD}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.asset.label')}</span>
            <input
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              required
              aria-required="true"
              placeholder={tr('supplierForm.asset.placeholder')}
              style={FIELD}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.access.label')}</span>
            <select value={access} onChange={(e) => setAccess(e.target.value)} style={FIELD}>
              {ACCESS_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {tr(a.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.class.label')}</span>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              style={FIELD}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {tr(c.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.duration.label')}</span>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              aria-required="true"
              placeholder={tr('supplierForm.duration.placeholder')}
              style={FIELD}
            />
          </label>
          <label style={{ display: 'block', gridColumn: 'span 2' }}>
            <span style={CAPTION}>{tr('supplierForm.people.label')}</span>
            <input
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              required
              aria-required="true"
              placeholder={tr('supplierForm.people.placeholder')}
              style={FIELD}
            />
          </label>
        </div>

        <div style={{ ...SECTION, borderTop: '1px solid var(--border)' }}>
          {tr('supplierForm.section.risk')}
        </div>
        <div
          style={{
            padding: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: '16px 18px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-2)',
                marginBottom: '8px',
              }}
            >
              {tr('supplierForm.risks.label')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {COMMON_RISKS.map((key) => (
                <label key={key} style={CHECK_ROW}>
                  <input
                    type="checkbox"
                    checked={riskChecked.includes(key)}
                    onChange={() => toggle(riskChecked, setRiskChecked, key)}
                    style={CHECK_BOX}
                  />
                  {tr(key)}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-2)',
                marginBottom: '8px',
              }}
            >
              {tr('supplierForm.controls.label')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {COMMON_CONTROLS.map((key) => (
                <label key={key} style={CHECK_ROW}>
                  <input
                    type="checkbox"
                    checked={controlChecked.includes(key)}
                    onChange={() => toggle(controlChecked, setControlChecked, key)}
                    style={CHECK_BOX}
                  />
                  {tr(key)}
                </label>
              ))}
            </div>
          </div>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.adequate.label')}</span>
            <select value={adequate} onChange={(e) => setAdequate(e.target.value)} style={FIELD}>
              {ADEQUACY.map((a) => (
                <option key={a.value} value={a.value}>
                  {tr(a.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block' }}>
            <span style={CAPTION}>{tr('supplierForm.by.label')}</span>
            <input
              value={assessorValue}
              onChange={(e) => setAssessor(e.target.value)}
              required
              aria-required="true"
              style={FIELD}
            />
          </label>
        </div>

        <div
          style={{
            padding: '16px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={!complete}
            style={{
              height: '40px',
              padding: '0 18px',
              border: 'none',
              borderRadius: '9px',
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: 600,
              // components/controls.md: disabled is opacity .5 + not-allowed.
              cursor: complete ? 'pointer' : 'not-allowed',
              opacity: complete ? 1 : 0.5,
            }}
          >
            {tr('supplierForm.submit')}
          </button>
          <Link
            href="/suppliers"
            data-hov="s3"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '40px',
              padding: '0 16px',
              border: '1px solid var(--border-strong)',
              borderRadius: '9px',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            {tr('supplierForm.cancel')}
          </Link>
          {!complete && (
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              {tr('supplierForm.submitHint')}
            </span>
          )}
        </div>
      </div>

      {submitted && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            maxWidth: '940px',
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
          {tr('supplierForm.demoNotice')}
        </div>
      )}
    </div>
  );
}
