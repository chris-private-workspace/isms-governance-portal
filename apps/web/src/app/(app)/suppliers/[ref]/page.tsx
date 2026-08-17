'use client';

/**
 * File: apps/web/src/app/(app)/suppliers/[ref]/page.tsx
 * Purpose: One external-party risk assessment — access requested, risks, decision.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/21-supplier-detail.html (70 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   This screen is a digitised FORM, not a dashboard: the six fields under
 *   'Access requested' are the company's own external-party assessment
 *   template, which is why they are laid out as labelled prose rather than as
 *   a table, and why none of them is scored.
 *
 *   THE DECISION BANNER IS DERIVED FROM ONE FIELD, `newCtl`. That is the
 *   prototype's rule (dc.html:4653) and it is worth stating because the banner
 *   reads as a judgement while being a restatement: 'new control required' is
 *   amber, everything else is green. It is NOT a function of `status`, so an
 *   assessment can be Under review and still show the green banner.
 *
 *   `reason` appears twice — in the context line under the title and again as
 *   'Business reason'. That duplication is in the fragment (:17 and :32) and is
 *   carried across rather than tidied away.
 *
 *   The three itemised lists are the template's, held in data/extended/ with
 *   their provenance; `suppliers.ts` carries the adequacy VERDICTS but not the
 *   items those verdicts are about.
 *
 * Key Components:
 *   - SupplierDetailPage: the screen, including its not-found state
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — supplier detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/21-supplier-detail.html
 *   - apps/web/src/data/extended/supplierAssessment.ts — where the three lists come from
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import {
  SUPPLIER_CONTROL_KEYS,
  SUPPLIER_RISK_KEYS,
  SUPPLIER_TP_CONTROL_KEYS,
} from '@/data/extended/supplierAssessment';
import { opcos } from '@/data/opcos';
import { suppliers } from '@/data/suppliers';
import type { TranslationKey } from '@/i18n';
import { tok } from '@/lib/tok';

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
  padding: '18px 20px',
};

const SMALL_CARD: React.CSSProperties = { ...CARD, padding: '16px 18px' };

/** dc.html:4630 — Approved is green, Remediation red, everything else amber. */
const STATUS: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Approved: { rating: 'G', labelKey: 'supplierDetail.status.approved' },
  Remediation: { rating: 'R', labelKey: 'supplierDetail.status.remediation' },
  Conditional: { rating: 'A', labelKey: 'supplierDetail.status.conditional' },
  'Under review': { rating: 'A', labelKey: 'supplierDetail.status.underReview' },
};

/** Adequacy and the new-control flag share one three-value vocabulary. */
const VERDICT: Record<string, TranslationKey> = {
  Yes: 'supplierDetail.yes',
  No: 'supplierDetail.no',
  Partial: 'supplierDetail.partial',
};

export default function SupplierDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.ref;
  const ref = Array.isArray(raw) ? raw[0] : raw;

  const record = suppliers.find((s) => s.ref === ref) ?? null;

  const back = (
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
      <IconChevronLeft width="15" height="15" stroke="currentColor" strokeWidth="2" />
      {tr('supplierDetail.back')}
    </Link>
  );

  if (!record) {
    return (
      <div data-screen-label="Supplier assessment detail">
        <DemoBadge />
        {back}
        <div style={{ ...CARD, maxWidth: '560px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('supplierDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('supplierDetail.notFound.body', { ref: ref ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  const status = STATUS[record.status] ?? {
    rating: 'A',
    labelKey: 'supplierDetail.status.underReview' as TranslationKey,
  };
  const stTok = tok(status.rating);
  const opcoName = opcos.find((o) => o.code === record.opco)?.name ?? record.opco;

  const needsControl = record.newCtl === 'Yes';
  const decisionTok = tok(needsControl ? 'A' : 'G');
  const verdict = (value: string) => {
    const key = VERDICT[value];
    return key ? tr(key) : value;
  };

  // The six template fields, in the order the paper form asks them.
  const ACCESS_FIELDS: { labelKey: TranslationKey; value: string; wrap: boolean }[] = [
    { labelKey: 'supplierDetail.field.asset', value: record.asset, wrap: true },
    { labelKey: 'supplierDetail.field.access', value: record.access, wrap: false },
    { labelKey: 'supplierDetail.field.cls', value: record.cls, wrap: false },
    { labelKey: 'supplierDetail.field.dur', value: record.dur, wrap: false },
    { labelKey: 'supplierDetail.field.people', value: record.people, wrap: false },
    { labelKey: 'supplierDetail.field.reason', value: record.reason, wrap: true },
  ];

  const RECORD_FIELDS: { labelKey: TranslationKey; value: string; mono: boolean }[] = [
    { labelKey: 'supplierDetail.field.date', value: record.date, mono: true },
    { labelKey: 'supplierDetail.field.by', value: record.by, mono: false },
    { labelKey: 'supplierDetail.field.opco', value: record.opco, mono: false },
    { labelKey: 'supplierDetail.field.newCtl', value: verdict(record.newCtl), mono: false },
    { labelKey: 'supplierDetail.field.review', value: record.review, mono: true },
  ];

  return (
    <div data-screen-label="Supplier assessment detail">
      <DemoBadge />
      {back}

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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--primary-ink)',
              }}
            >
              {record.ref}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: stTok.ink,
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: stTok.dot,
                }}
              />
              {tr(status.labelKey)}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '21px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {record.party}
          </h1>
          <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '6px' }}>
            {trf('supplierDetail.contextLine', { reason: record.reason, opco: opcoName })}
          </div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '34px',
            padding: '0 14px',
            borderRadius: '8px',
            background: decisionTok.bg,
            color: decisionTok.ink,
            fontSize: '12.5px',
            fontWeight: 700,
          }}
        >
          {tr(
            needsControl
              ? 'supplierDetail.decision.newControl'
              : 'supplierDetail.decision.approved',
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 330px',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={CARD}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '14px' }}>
              {tr('supplierDetail.accessRequested')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                gap: '14px 24px',
                fontSize: '12.5px',
              }}
            >
              {ACCESS_FIELDS.map((f) => (
                <div key={f.labelKey}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      marginBottom: '4px',
                    }}
                  >
                    {tr(f.labelKey)}
                  </div>
                  <div style={{ fontWeight: 600, lineHeight: f.wrap ? 1.45 : undefined }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
              gap: '14px',
            }}
          >
            <div style={SMALL_CARD}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
                {tr('supplierDetail.risks')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {SUPPLIER_RISK_KEYS.map((key) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      lineHeight: 1.45,
                    }}
                  >
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'var(--rag-a)',
                        flexShrink: 0,
                        marginTop: '7px',
                      }}
                    />
                    {tr(key)}
                  </div>
                ))}
              </div>
            </div>

            <div style={SMALL_CARD}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                {tr('supplierDetail.controls')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px' }}>
                {trf('supplierDetail.adequate', { value: verdict(record.adequate) })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {SUPPLIER_CONTROL_KEYS.map((key) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      lineHeight: 1.45,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--rag-g)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: '3px' }}
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {tr(key)}
                  </div>
                ))}
              </div>
            </div>

            <div style={SMALL_CARD}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                {tr('supplierDetail.tpControls')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px' }}>
                {trf('supplierDetail.adequate', { value: verdict(record.tpAdequate) })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {SUPPLIER_TP_CONTROL_KEYS.map((key) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-2)',
                      lineHeight: 1.45,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--rag-g)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0, marginTop: '3px' }}
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {tr(key)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '11px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>
            {tr('supplierDetail.record')}
          </div>
          {RECORD_FIELDS.map((f) => (
            <div
              key={f.labelKey}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: 'var(--text-3)' }}>{tr(f.labelKey)}</span>
              <span
                style={
                  f.mono ? { fontFamily: 'var(--mono)', fontSize: '11.5px' } : { fontWeight: 600 }
                }
              >
                {f.value}
              </span>
            </div>
          ))}
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
          {/* No handler: starting a re-assessment creates a record and opens a
              workflow, neither of which exists yet. Rendered, deliberately
              unwired, and listed on the drive-through checklist. */}
          <button
            type="button"
            style={{
              height: '36px',
              border: 'none',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: '#fff',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tr('supplierDetail.startReassessment')}
          </button>
        </div>
      </div>
    </div>
  );
}
