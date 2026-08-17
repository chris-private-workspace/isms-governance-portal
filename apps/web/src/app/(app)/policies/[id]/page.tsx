'use client';

/**
 * File: apps/web/src/app/(app)/policies/[id]/page.tsx
 * Purpose: One controlled policy — its record, its attached file, and who signed it.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/10-policy-detail.html (187 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   The screen's premise, stated on the screen itself: policy files across the
 *   region are NOT in one house format, so the platform standardises the record
 *   fields and treats the ATTACHED FILE as authoritative. Everything inside the
 *   white sheet is therefore a preview of a document, not platform content —
 *   which is why the toolbar names the real file and the strip under the canvas
 *   says 'rendered preview'.
 *
 *   THE VIEWER IS A FACSIMILE AND SAYS SO. Four generated pages stand in for a
 *   real embedded viewer (document-viewer.md closes on exactly that swap). Two
 *   consequences are visible and deliberate rather than bugs:
 *     - the toolbar's page count is the FILE's (12 for POL-301) while the pager
 *       counts the facsimile's (4). Both are read from data; they disagree
 *       because they count different things, and the fragment has the same gap.
 *     - the same four pages render for every policy, as in the prototype.
 *
 *   ZOOM USES CSS `zoom`, NOT `transform: scale()`. document-viewer.md:47-50 is
 *   explicit: zoom re-lays-out so the scroll container resizes with the page,
 *   whereas a transform paints larger over an unchanged box and puts the left
 *   edge of the page permanently out of reach. Range 70-160 in steps of 10,
 *   from the prototype's own clamp — the prose in that doc says 60-200/20% and
 *   the code disagrees; the code is what the design actually does.
 *
 *   ALL FOUR FILE ACTIONS ARE DISABLED, and the facsimile is why. Open in new
 *   tab, Download, Print and Download original every one act on the ATTACHED
 *   FILE — the toolbar names it, sizes it and calls it 12 pages. That file does
 *   not exist here. Print is the one that looks rescuable, since window.print()
 *   needs no server; it is disabled anyway, because what it would print is the
 *   4-page facsimile this screen labels a rendered preview, not the 12-page
 *   document the button sits beside. A backend would not fix these four — the
 *   document itself is what is missing. Rendered disabled per controls.md:7,
 *   with title=shell.inert saying so, and their hover declarations dropped: a
 *   hover response is the signal that a control is live.
 *
 *   TWO COLLECTIONS ARE DERIVED, and both had to be, because policies.ts holds
 *   neither: attestation-by-entity is computed over entityPosture (so it lists
 *   13 entities, not the fragment's 6 placeholders), and linked controls are
 *   the first three of the control library, which is the rule the prototype
 *   used. Version history is computed from the record's own version number.
 *
 * Key Components:
 *   - PolicyDetailPage: the screen, including its not-found state
 *   - versionHistory: three entries derived from one version string
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19) — policy detail port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/10-policy-detail.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/document-viewer.md
 *   - apps/web/src/data/extended/policyDocument.ts — the facsimile's page structure
 */

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';

import { DemoBadge } from '@/components/DemoBadge';
import { IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { controls } from '@/data/controls';
import { entityPosture } from '@/data/entityPosture';
import { COVER_LINES, POLICY_PAGES, ZOOM, type PolicyPage } from '@/data/extended/policyDocument';
import { policies } from '@/data/policies';
import type { TranslationKey } from '@/i18n';
import { tok } from '@/lib/tok';

type Policy = (typeof policies)[number];

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

const SIDE_CARD: React.CSSProperties = { ...CARD, padding: '16px 17px' };

const SIDE_HEADING: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
};

const ICON_BUTTON: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '1px solid var(--border-strong)',
  borderRadius: '7px',
  background: 'var(--surface)',
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const PAGER_BUTTON: React.CSSProperties = { ...ICON_BUTTON, width: '28px', height: '28px' };

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Merged into the four FILE actions, never into PAGER_BUTTON: the pager and the
 * zoom controls drive the facsimile and genuinely work.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

/** dc.html:3887 — published is green, in review amber, anything else neutral. */
const STATUS: Record<
  string,
  { rating: string; labelKey: TranslationKey; lowerKey: TranslationKey }
> = {
  Published: {
    rating: 'G',
    labelKey: 'policyDetail.status.published',
    lowerKey: 'policyDetail.statusLower.published',
  },
  'Under review': {
    rating: 'A',
    labelKey: 'policyDetail.status.underReview',
    lowerKey: 'policyDetail.statusLower.underReview',
  },
  Draft: {
    rating: 'N',
    labelKey: 'policyDetail.status.draft',
    lowerKey: 'policyDetail.statusLower.draft',
  },
};

const CATEGORY: Record<string, { labelKey: TranslationKey; lowerKey: TranslationKey }> = {
  Security: { labelKey: 'policyDetail.cat.security', lowerKey: 'policyDetail.catLower.security' },
  Privacy: { labelKey: 'policyDetail.cat.privacy', lowerKey: 'policyDetail.catLower.privacy' },
  Compliance: {
    labelKey: 'policyDetail.cat.compliance',
    lowerKey: 'policyDetail.catLower.compliance',
  },
  Operational: {
    labelKey: 'policyDetail.cat.operational',
    lowerKey: 'policyDetail.catLower.operational',
  },
  HR: { labelKey: 'policyDetail.cat.hr', lowerKey: 'policyDetail.catLower.hr' },
};

/** dc.html:3886 — the control library's own three-value result vocabulary. */
const CONTROL_RESULT: Record<string, { rating: string; labelKey: TranslationKey }> = {
  Effective: { rating: 'G', labelKey: 'ctlResult.effective' },
  Partial: { rating: 'A', labelKey: 'ctlResult.partial' },
  Ineffective: { rating: 'R', labelKey: 'ctlResult.ineffective' },
};

/** dc.html:5256 — one publication date for the whole demo library. */
const EFFECTIVE_DATE = '2025-09-01';

/**
 * dc.html:5260-5264 — three entries from one version string.
 *
 * The two older versions are arithmetic on the current one (minus .1, minus 1),
 * which is the prototype's rule. Kept rather than replaced by a stored history:
 * inventing real dates and authors per policy would look like a record and be
 * no more true than this is.
 */
function versionHistory(policy: Policy) {
  const current = Number.parseFloat(policy.version.replace('v', ''));
  return [
    {
      version: policy.version,
      date: EFFECTIVE_DATE,
      author: policy.owner,
      kind: 'current' as const,
    },
    {
      version: `v${(current - 0.1).toFixed(1)}`,
      date: '2024-08-15',
      author: policy.owner,
      kind: 'annual' as const,
    },
    {
      version: `v${(current - 1).toFixed(1)}`,
      date: '2023-07-20',
      author: null,
      kind: 'regulatory' as const,
    },
  ];
}

export default function PolicyDetailPage() {
  const { tr, trf } = useShell();
  const params = useParams();
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  const [pageNo, setPageNo] = useState(1);
  const [zoom, setZoom] = useState<number>(ZOOM.initial);

  const policy = policies.find((p) => p.id === id) ?? null;

  const back = (
    <Link
      href="/policies"
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
      {tr('policyDetail.back')}
    </Link>
  );

  if (!policy) {
    return (
      <div data-screen-label="Policy detail">
        <DemoBadge />
        {back}
        <div style={{ ...CARD, padding: '18px', maxWidth: '560px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
            {tr('policyDetail.notFound.title')}
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
            {trf('policyDetail.notFound.body', { id: id ?? '—' })}
          </p>
        </div>
      </div>
    );
  }

  const status = STATUS[policy.status] ?? {
    rating: 'N',
    labelKey: 'policyDetail.status.draft' as TranslationKey,
    lowerKey: 'policyDetail.statusLower.draft' as TranslationKey,
  };
  const stTok = tok(status.rating);
  const category = CATEGORY[policy.category];
  const categoryLabel = category ? tr(category.labelKey) : policy.category;
  const categoryLower = category ? tr(category.lowerKey) : policy.category.toLowerCase();

  const isPdf = policy.file.fmt === 'PDF';
  const uploadYear = policy.file.uploaded.slice(0, 4);

  // Falls back to the cover rather than to POLICY_PAGES[0], which is the same
  // page but typed as possibly-undefined — and an undefined page here would
  // erase the union narrowing the whole sheet below depends on.
  const page: PolicyPage = POLICY_PAGES.find((p) => p.no === pageNo) ?? { no: 1, kind: 'cover' };
  const pageCount = POLICY_PAGES.length;
  const pageTitle = (p: PolicyPage, forOutline: boolean) =>
    p.kind === 'cover' ? (forOutline ? tr('policyDetail.toc.cover') : policy.name) : tr(p.titleKey);

  // dc.html:5254 — the record's own attestation percentage, spread across the
  // entities so the bars differ, clamped to 60-100. Over 13 rows, not the
  // fragment's 6: the entity list is the charter's, and it is read from the
  // fixture rather than written down.
  const attestation = entityPosture.map((e, index) => {
    const pct = policy.att === 0 ? 0 : Math.max(60, Math.min(100, policy.att - 6 + index * 3));
    const rating = pct === 0 ? 'N' : pct >= 90 ? 'G' : pct >= 80 ? 'A' : 'R';
    return { code: e.code, name: e.name, flag: e.flag, pct, t: tok(rating) };
  });

  // dc.html:5255 — the first three controls in the library. A real policy-to-
  // control mapping is a core-model relationship this fixture does not carry,
  // so the prototype's rule is kept rather than a plausible one invented.
  const linkedControls = controls.slice(0, 3);

  const versions = versionHistory(policy);

  return (
    <div data-screen-label="Policy detail">
      <DemoBadge />
      {back}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '256px minmax(0,1fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'sticky',
            top: '76px',
          }}
        >
          <div style={SIDE_CARD}>
            <div style={{ ...SIDE_HEADING, marginBottom: '8px' }}>
              {tr('policyDetail.side.document')}
            </div>
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 700,
                lineHeight: 1.35,
                letterSpacing: '-.15px',
                textWrap: 'pretty',
              }}
            >
              {policy.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11.5px',
                color: 'var(--primary-ink)',
                fontWeight: 600,
                marginTop: '6px',
              }}
            >
              {policy.id}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                marginTop: '11px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '20px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  background: 'var(--surface-3)',
                  color: 'var(--text-2)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                }}
              >
                {policy.version}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '20px',
                  padding: '0 8px',
                  borderRadius: '5px',
                  background: stTok.bg,
                  color: stTok.ink,
                  fontSize: '10.5px',
                  fontWeight: 700,
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
                {tr(status.labelKey)}
              </span>
            </div>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--text-3)',
                marginTop: '11px',
                paddingTop: '11px',
                borderTop: '1px solid var(--border)',
                lineHeight: 1.5,
              }}
            >
              {trf('policyDetail.meta', { category: categoryLabel, owner: policy.owner })}
            </div>
          </div>

          <div style={SIDE_CARD}>
            <div style={{ ...SIDE_HEADING, marginBottom: '11px' }}>
              {tr('policyDetail.side.publication')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(
                [
                  { key: 'policyDetail.pub.published', value: EFFECTIVE_DATE, bold: 600 },
                  {
                    key: 'policyDetail.pub.uploaded',
                    value: policy.file.uploaded,
                    bold: 600,
                  },
                  { key: 'policyDetail.pub.nextReview', value: policy.nextReview, bold: 600 },
                  {
                    key: 'policyDetail.pub.attestation',
                    value: policy.att === 0 ? '—' : `${policy.att}%`,
                    bold: 700,
                  },
                ] as const
              ).map((row) => (
                <div
                  key={row.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '11.5px',
                  }}
                >
                  <span style={{ color: 'var(--text-3)' }}>{tr(row.key)}</span>
                  <span style={{ fontWeight: row.bold, fontFamily: 'var(--mono)' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={SIDE_CARD}>
            <div style={{ ...SIDE_HEADING, marginBottom: '10px' }}>
              {tr('policyDetail.side.toc')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {POLICY_PAGES.map((p) => {
                const active = p.no === pageNo;
                return (
                  <button
                    key={p.no}
                    type="button"
                    onClick={() => setPageNo(p.no)}
                    data-hov="s2"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '9px',
                      textAlign: 'left',
                      padding: '8px 10px',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      background: active ? 'var(--primary-tint)' : 'transparent',
                      color: active ? 'var(--primary-ink)' : 'var(--text-2)',
                      fontFamily: 'inherit',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      lineHeight: 1.4,
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '10px',
                        color: 'var(--text-3)',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {p.no}
                    </span>
                    <span style={{ minWidth: 0, textWrap: 'pretty' }}>{pageTitle(p, true)}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '9px' }}>
              {tr('policyDetail.side.tocHint')}
            </div>
          </div>

          <div style={SIDE_CARD}>
            <div style={{ ...SIDE_HEADING, marginBottom: '11px' }}>
              {tr('policyDetail.side.versions')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {versions.map((v) => (
                <div
                  key={v.version}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--primary-ink)',
                      width: '34px',
                      flexShrink: 0,
                    }}
                  >
                    {v.version}
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-2)',
                      }}
                    >
                      {v.date}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '10.5px',
                        color: 'var(--text-3)',
                        lineHeight: 1.45,
                        marginTop: '2px',
                        textWrap: 'pretty',
                      }}
                    >
                      {v.kind === 'current'
                        ? trf('policyDetail.ver.current', { status: tr(status.lowerKey) })
                        : v.kind === 'annual'
                          ? tr('policyDetail.ver.annual')
                          : tr('policyDetail.ver.regulatory')}{' '}
                      · {v.author ?? tr('policyDetail.ver.groupRisk')}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
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
                {tr('policyDetail.eyebrow')}
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '-.3px',
                  lineHeight: 1.2,
                  maxWidth: '560px',
                  textWrap: 'pretty',
                }}
              >
                {policy.name}
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              {/* Both disabled: they act on the ATTACHED FILE, and there is no
                  file — the sheet below is a facsimile the screen itself labels
                  a rendered preview. No backend could be swapped in to fix that
                  here; the document itself is what is missing. */}
              <button
                type="button"
                disabled
                title={tr('shell.inert')}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
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
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 5h10v10" />
                  <path d="M19 5L9.5 14.5" />
                  <path d="M15 19H5V9" />
                </svg>
                {tr('policyDetail.openNewTab')}
              </button>
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  ...INERT,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4v11" />
                  <path d="M8 11l4 4 4-4" />
                  <path d="M4 19h16" />
                </svg>
                {tr('policyDetail.download')}
              </button>
            </div>
          </div>

          <div style={{ ...CARD, padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
              {tr('policyDetail.summary')}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-2)',
                textWrap: 'pretty',
              }}
            >
              {trf('policyDetail.purpose', { category: categoryLower })}
            </p>
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--text-3)',
                lineHeight: 1.6,
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                textWrap: 'pretty',
              }}
            >
              {tr('policyDetail.standardNote')}
            </div>
          </div>

          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  width: '32px',
                  height: '38px',
                  borderRadius: '5px',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
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
                  <path d="M14 3v5h5" />
                  <path d="M6 2h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
                </svg>
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    lineHeight: 1.35,
                    wordBreak: 'break-all',
                  }}
                >
                  {policy.file.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
                  {trf('policyDetail.file.meta', {
                    size: policy.file.size,
                    pages: policy.file.pages,
                    uploaded: policy.file.uploaded,
                  })}
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '22px',
                  padding: '0 9px',
                  borderRadius: '6px',
                  background: isPdf ? 'var(--rag-r-bg)' : 'var(--primary-tint)',
                  color: isPdf ? 'var(--rag-r-ink)' : 'var(--primary-ink)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  flexShrink: 0,
                }}
              >
                {policy.file.fmt}
              </span>
              <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
                {/* Disabled for the same reason as the header pair. The action
                    label moves to aria-label because title is now the inert
                    explanation, and these buttons carry no text of their own. */}
                <button
                  type="button"
                  disabled
                  aria-label={tr('policyDetail.action.print')}
                  title={tr('shell.inert')}
                  style={{ ...ICON_BUTTON, ...INERT }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 9V4h10v5" />
                    <rect x="4" y="9" width="16" height="7" rx="1.5" />
                    <path d="M7 16h10v4H7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled
                  aria-label={tr('policyDetail.action.downloadOriginal')}
                  title={tr('shell.inert')}
                  style={{ ...ICON_BUTTON, ...INERT }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 4v11" />
                    <path d="M8 11l4 4 4-4" />
                    <path d="M4 19h16" />
                  </svg>
                </button>
              </div>
            </div>

            {!isPdf && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  background: 'var(--rag-a-bg)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rag-a-ink)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4.5" />
                  <circle cx="12" cy="16" r=".7" fill="currentColor" stroke="none" />
                </svg>
                <span style={{ fontSize: '11.5px', color: 'var(--rag-a-ink)', lineHeight: 1.5 }}>
                  {policy.file.note}
                </span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              <button
                type="button"
                onClick={() => setPageNo((n) => Math.max(1, n - 1))}
                title={tr('policyDetail.action.prevPage')}
                data-hov="s3"
                style={PAGER_BUTTON}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setPageNo((n) => Math.min(pageCount, n + 1))}
                title={tr('policyDetail.action.nextPage')}
                data-hov="s3"
                style={PAGER_BUTTON}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <span
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-2)',
                  fontFamily: 'var(--mono)',
                }}
              >
                {trf('policyDetail.pager', { n: pageNo, total: pageCount })}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                · {pageTitle(page, false)}
              </span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(ZOOM.min, z - ZOOM.step))}
                title={tr('policyDetail.action.zoomOut')}
                data-hov="s3"
                style={PAGER_BUTTON}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                >
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </button>
              <span
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-2)',
                  fontFamily: 'var(--mono)',
                  width: '42px',
                  textAlign: 'center',
                }}
              >
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(ZOOM.max, z + ZOOM.step))}
                title={tr('policyDetail.action.zoomIn')}
                data-hov="s3"
                style={PAGER_BUTTON}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="6" x2="12" y2="18" />
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </button>
            </div>

            <div
              style={{
                height: '620px',
                overflow: 'auto',
                background: 'var(--surface-3)',
                padding: '22px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '0 18px',
                  minWidth: 'min-content',
                }}
              >
                <div style={{ zoom: zoom / 100, width: '100%', maxWidth: '620px' }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '620px',
                      minHeight: '810px',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 14px rgba(16,24,40,.16)',
                      padding: '58px 60px 40px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {page.kind === 'cover' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '1.4px',
                            textTransform: 'uppercase',
                            color: '#8A94A6',
                          }}
                        >
                          {tr('policyDetail.doc.controlledHeader')}
                        </div>
                        <div
                          style={{
                            height: '2px',
                            background: '#111827',
                            margin: '14px 0 34px',
                            width: '52px',
                          }}
                        />
                        <h2
                          style={{
                            margin: 0,
                            fontSize: '25px',
                            fontWeight: 700,
                            lineHeight: 1.25,
                            color: '#111827',
                            letterSpacing: '-.3px',
                            maxWidth: '420px',
                            textWrap: 'pretty',
                          }}
                        >
                          {policy.name}
                        </h2>
                        <div style={{ marginTop: '46px', borderTop: '1px solid #E4E7EC' }}>
                          {COVER_LINES.map((line) => (
                            <div
                              key={line.labelKey}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '148px minmax(0,1fr)',
                                gap: '14px',
                                padding: '9px 0',
                                borderBottom: '1px solid #E4E7EC',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  color: '#667085',
                                  textTransform: 'uppercase',
                                  letterSpacing: '.4px',
                                }}
                              >
                                {tr(line.labelKey)}
                              </span>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  color: '#111827',
                                  lineHeight: 1.5,
                                }}
                              >
                                {'field' in line.value
                                  ? policy[line.value.field]
                                  : trf(line.value.copyKey, { year: uploadYear })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {page.kind === 'body' && (
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            margin: '0 0 16px',
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#111827',
                            letterSpacing: '-.1px',
                          }}
                        >
                          {tr(page.titleKey)}
                        </h3>
                        {page.paraKeys.map((key) => (
                          <p
                            key={key}
                            style={{
                              margin: '0 0 13px',
                              fontSize: '11.5px',
                              lineHeight: 1.75,
                              color: '#344054',
                              textAlign: 'justify',
                            }}
                          >
                            {trf(key, { category: categoryLower })}
                          </p>
                        ))}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '9px',
                            margin: '14px 0 0',
                          }}
                        >
                          {page.numberedKeys.map((key, index) => (
                            <div
                              key={key}
                              style={{
                                display: 'flex',
                                gap: '11px',
                                fontSize: '11.5px',
                                lineHeight: 1.7,
                                color: '#344054',
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--mono)',
                                  fontSize: '10.5px',
                                  color: '#8A94A6',
                                  flexShrink: 0,
                                  marginTop: '2px',
                                }}
                              >
                                {index + 1}.
                              </span>
                              <span>{tr(key)}</span>
                            </div>
                          ))}
                        </div>
                        {page.headKey && (
                          <h3
                            style={{
                              margin: '30px 0 14px',
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#111827',
                              letterSpacing: '-.1px',
                            }}
                          >
                            {tr(page.headKey)}
                          </h3>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                          {page.bulletKeys.map((key) => (
                            <div
                              key={key}
                              style={{
                                display: 'flex',
                                gap: '11px',
                                fontSize: '11.5px',
                                lineHeight: 1.7,
                                color: '#344054',
                              }}
                            >
                              <span
                                style={{
                                  width: '3px',
                                  height: '3px',
                                  borderRadius: '50%',
                                  background: '#8A94A6',
                                  flexShrink: 0,
                                  marginTop: '9px',
                                }}
                              />
                              <span>{tr(key)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        marginTop: '32px',
                        paddingTop: '12px',
                        borderTop: '1px solid #E4E7EC',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9px',
                          color: '#98A2B3',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {policy.id} · {policy.version} · {tr('policyDetail.doc.footer.internal')}
                      </span>
                      <span style={{ fontSize: '9px', color: '#98A2B3' }}>
                        {tr('policyDetail.doc.footer.uncontrolled')}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          color: '#98A2B3',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {trf('policyDetail.doc.footer.pageOf', { n: pageNo, total: pageCount })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '9px 14px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface-2)',
                fontSize: '11px',
                color: 'var(--text-3)',
              }}
            >
              {trf('policyDetail.renderedPreview', { note: policy.file.note })}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
              gap: '16px',
            }}
          >
            <div style={{ ...CARD, padding: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
                {tr('policyDetail.attByEntity')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {attestation.map((a) => (
                  <div key={a.code} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                        flexShrink: 0,
                      }}
                    >
                      {a.flag}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-2)',
                        width: '78px',
                        flexShrink: 0,
                      }}
                    >
                      {a.name}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: '5px',
                        borderRadius: '3px',
                        background: 'var(--surface-3)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${a.pct}%`,
                          background: a.t.dot,
                          borderRadius: '3px',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 600,
                        color: a.t.ink,
                        width: '34px',
                        textAlign: 'right',
                      }}
                    >
                      {a.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...CARD, padding: '18px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                {tr('policyDetail.linkedControls')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkedControls.map((c) => {
                  const result = CONTROL_RESULT[c.result];
                  const rTok = tok(result?.rating ?? 'N');
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 11px',
                        border: '1px solid var(--border)',
                        borderRadius: '9px',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: rTok.dot,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            lineHeight: 1.3,
                          }}
                        >
                          {c.name}
                        </div>
                        <div
                          style={{
                            fontSize: '10.5px',
                            color: 'var(--text-3)',
                            fontFamily: 'var(--mono)',
                          }}
                        >
                          {c.id}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: rTok.ink }}>
                        {result ? tr(result.labelKey) : c.result}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
