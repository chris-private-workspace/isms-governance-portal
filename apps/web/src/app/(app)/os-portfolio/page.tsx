'use client';

/**
 * File: apps/web/src/app/(app)/os-portfolio/page.tsx
 * Purpose: The APAC office-service catalogue and each service's security profile.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/24-os-portfolio.html (103 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   Master-detail on one screen: the category chips filter the list, the list
 *   selects, and the right column is the selection's security profile. Both are
 *   local useState and both genuinely work — a filter chip that does not filter
 *   is the dead control verification-discipline.md is about.
 *
 *   THE FRAGMENT'S ONE HARDCODED COUNT IS WRONG FOR THIS PROJECT. Line 19 reads
 *   "across 14 operating companies"; the charter is 13 OpCos across 11
 *   jurisdictions, and in any case the honest number is how many of them
 *   actually deliver a service — 12, since RVN appears in no service's `opcos`.
 *   It is counted from the fixture rather than written down, so it follows the
 *   data instead of being re-checked by hand.
 *
 *   Every other figure on the strip is a reduction over `osServices` for the
 *   same reason. 'In certified ISMS scope' counts the ISO 27001 wording
 *   specifically, so a service carrying only ISO 27017 cloud controls does NOT
 *   count — which is the distinction the card's own subtitle draws.
 *
 *   NOT SCOPED BY THE TOPBAR, and that is a decision rather than an omission: a
 *   service portfolio is a regional catalogue, and the per-service 'Delivered
 *   by' list is where the entity dimension lives. Filtering the catalogue by
 *   the selected OpCo would answer a different question than the page asks.
 *
 * Key Components:
 *   - OsPortfolioPage: the screen
 *   - CATEGORIES: the filter vocabulary, in the design's order
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — OS portfolio port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/24-os-portfolio.html
 *   - apps/web/src/data/extended/osRequirements.ts — where the delivery requirements come from
 */

import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { useShell } from '@/components/shell/shell-state';
import { OS_REQUIREMENT_KEYS } from '@/data/extended/osRequirements';
import { opcos } from '@/data/opcos';
import { osServices } from '@/data/osServices';
import type { TranslationKey } from '@/i18n';
import { tok } from '@/lib/tok';

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

/** The six columns, identical on the header strip and every row (fragment :33,:37). */
const COLUMNS = '82px minmax(0,2fr) 116px 96px 110px 92px';

/** dc.html:4298 — 'all' plus the nine categories, in the design's order. */
const CATEGORIES: { value: string; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'osPortfolio.filter.all' },
  { value: 'Managed services', labelKey: 'osPortfolio.cat.managedServices' },
  { value: 'Cloud', labelKey: 'osPortfolio.cat.cloud' },
  { value: 'Security', labelKey: 'osPortfolio.cat.security' },
  { value: 'Workplace', labelKey: 'osPortfolio.cat.workplace' },
  { value: 'Software', labelKey: 'osPortfolio.cat.software' },
  { value: 'BPO', labelKey: 'osPortfolio.cat.bpo' },
  { value: 'Infrastructure', labelKey: 'osPortfolio.cat.infrastructure' },
  { value: 'Supply', labelKey: 'osPortfolio.cat.supply' },
  { value: 'Advisory', labelKey: 'osPortfolio.cat.advisory' },
];

const CATEGORY_KEY = new Map(CATEGORIES.map((c) => [c.value, c.labelKey]));

/** dc.html:4299 — a shipped service is green, growing amber, anything earlier red. */
function stageOf(stage: string): { rating: string; labelKey: TranslationKey } {
  if (stage === 'Live') return { rating: 'G', labelKey: 'osPortfolio.stage.live' };
  if (stage === 'Mature') return { rating: 'G', labelKey: 'osPortfolio.stage.mature' };
  if (stage === 'Growth') return { rating: 'A', labelKey: 'osPortfolio.stage.growth' };
  return { rating: 'R', labelKey: 'osPortfolio.stage.pilot' };
}

/** dc.html:4303 — the RAG letter already on the record, spelled out. */
const RISK_LABEL: Record<string, TranslationKey> = {
  G: 'osPortfolio.risk.low',
  A: 'osPortfolio.risk.medium',
  R: 'osPortfolio.risk.high',
};

const DATA_CLASS: Record<string, TranslationKey> = {
  Confidential: 'osPortfolio.data.confidential',
  Restricted: 'osPortfolio.data.restricted',
  Internal: 'osPortfolio.data.internal',
};

const CERT_POSITION: Record<string, TranslationKey> = {
  'In ISO 27001 scope': 'osPortfolio.cert.iso27001',
  'ISO 27017 controls applied': 'osPortfolio.cert.iso27017',
  'Vendor SaaS — supplier assessed': 'osPortfolio.cert.vendorSaas',
  'Not yet in scope': 'osPortfolio.cert.notYet',
};

/** dc.html:4309 — 27017 cloud controls are not the 27001 certificate. */
const inCertifiedScope = (cert: string) => cert.includes('ISO 27001');

export default function OsPortfolioPage() {
  const { tr, trf } = useShell();
  const [category, setCategory] = useState('all');
  const [selectedCode, setSelectedCode] = useState(osServices[0]?.code ?? '');

  const list = osServices.filter((s) => category === 'all' || s.cat === category);
  const selected = osServices.find((s) => s.code === selectedCode) ?? osServices[0];

  // Counted, never copied. The fragment writes "14 operating companies" as a
  // literal; this is how many distinct OpCos actually appear as a deliverer.
  const deliveringOpCos = new Set(osServices.flatMap((s) => s.opcos)).size;
  const inScopeCount = osServices.filter((s) => inCertifiedScope(s.cert)).length;
  const attentionCount = osServices.filter((s) => s.risk === 'R').length;
  const contractCount = osServices.reduce((total, s) => total + s.clients, 0);

  const KPIS = [
    {
      key: 'total',
      labelKey: 'osPortfolio.kpi.total',
      value: osServices.length,
      colour: undefined,
      foot: trf('osPortfolio.kpi.totalFoot', { n: deliveringOpCos }),
    },
    {
      key: 'inScope',
      labelKey: 'osPortfolio.kpi.inScope',
      value: inScopeCount,
      colour: 'var(--rag-g-ink)',
      foot: tr('osPortfolio.kpi.inScopeFoot'),
    },
    {
      key: 'attention',
      labelKey: 'osPortfolio.kpi.attention',
      value: attentionCount,
      colour: 'var(--rag-r-ink)',
      foot: tr('osPortfolio.kpi.attentionFoot'),
    },
    {
      key: 'clients',
      labelKey: 'osPortfolio.kpi.clients',
      value: contractCount,
      colour: undefined,
      foot: tr('osPortfolio.kpi.clientsFoot'),
    },
  ] as const;

  const COLUMN_HEADS = [
    'osPortfolio.col.code',
    'osPortfolio.col.service',
    'osPortfolio.col.category',
    'osPortfolio.col.opcos',
    'osPortfolio.col.stage',
    'osPortfolio.col.risk',
  ] as const;

  if (!selected) return null;

  const selStage = stageOf(selected.stage);
  const selStageTok = tok(selStage.rating);
  const selRiskTok = tok(selected.risk);
  const selCertKey = CERT_POSITION[selected.cert];
  const selDataKey = DATA_CLASS[selected.data];
  const selCatKey = CATEGORY_KEY.get(selected.cat);
  const selRiskKey = RISK_LABEL[selected.risk];

  const selOpcos = selected.opcos.map((code) => {
    const o = opcos.find((x) => x.code === code);
    return { code, name: o?.name ?? code, country: o?.country ?? '' };
  });

  const PROFILE_FIELDS: { labelKey: TranslationKey; value: string; mono: boolean }[] = [
    { labelKey: 'osPortfolio.field.owner', value: selected.owner, mono: false },
    {
      labelKey: 'osPortfolio.field.cat',
      value: selCatKey ? tr(selCatKey) : selected.cat,
      mono: false,
    },
    {
      labelKey: 'osPortfolio.field.data',
      value: selDataKey ? tr(selDataKey) : selected.data,
      mono: false,
    },
    { labelKey: 'osPortfolio.field.clients', value: `${selected.clients}`, mono: true },
    { labelKey: 'osPortfolio.field.ctl', value: selected.ctl, mono: true },
    { labelKey: 'osPortfolio.field.rev', value: selected.rev, mono: true },
  ];

  return (
    <div data-screen-label="OS portfolio">
      <DemoBadge />

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
            {tr('osPortfolio.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('osPortfolio.title')}
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-2)',
              marginTop: '5px',
              maxWidth: '700px',
              textWrap: 'pretty',
            }}
          >
            {tr('osPortfolio.subtitle')}
          </div>
        </div>
        {/* No handler: adding a service means creating a catalogue record and an
            ISMS scope question, neither of which exists yet. Rendered as the
            design has it, deliberately unwired. */}
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '38px',
            padding: '0 16px',
            border: 'none',
            borderRadius: '9px',
            background: 'var(--primary)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {tr('osPortfolio.addService')}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {KPIS.map((k) => (
          <div key={k.key} style={{ ...CARD, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              {tr(k.labelKey)}
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-.6px',
                marginTop: '5px',
                color: k.colour,
              }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
              {k.foot}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        {CATEGORIES.map((c) => {
          const on = category === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              style={{
                height: '30px',
                padding: '0 13px',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                borderRadius: '8px',
                background: on ? 'var(--primary)' : 'var(--surface-2)',
                color: on ? '#fff' : 'var(--text-2)',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tr(c.labelKey)}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div style={{ ...CARD, overflow: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: COLUMNS,
              minWidth: '720px',
              gap: '12px',
              padding: '9px 16px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '.45px',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}
          >
            {COLUMN_HEADS.map((key) => (
              <span key={key}>{tr(key)}</span>
            ))}
          </div>

          {list.map((s) => {
            const stage = stageOf(s.stage);
            const stageTok = tok(stage.rating);
            const riskTok = tok(s.risk);
            const active = s.code === selectedCode;
            const catKey = CATEGORY_KEY.get(s.cat);
            const riskKey = RISK_LABEL[s.risk];
            return (
              <div
                key={s.code}
                onClick={() => setSelectedCode(s.code)}
                data-hov="s2"
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLUMNS,
                  minWidth: '720px',
                  gap: '12px',
                  padding: '11px 16px',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `3px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  background: active ? 'var(--primary-tint)' : 'var(--surface)',
                  alignItems: 'center',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    color: 'var(--primary-ink)',
                    fontWeight: 600,
                  }}
                >
                  {s.code}
                </span>
                <span>
                  <b
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      lineHeight: 1.35,
                      textWrap: 'pretty',
                    }}
                  >
                    {s.name}
                  </b>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10.5px',
                      color: 'var(--text-3)',
                      marginTop: '2px',
                    }}
                  >
                    {trf('osPortfolio.rowMeta', { owner: s.owner, n: s.clients })}
                  </span>
                </span>
                <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
                  {catKey ? tr(catKey) : s.cat}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  {s.opcos.length}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '21px',
                    padding: '0 9px',
                    borderRadius: '6px',
                    background: stageTok.bg,
                    color: stageTok.ink,
                    fontSize: '11px',
                    fontWeight: 600,
                    justifySelf: 'start',
                  }}
                >
                  {tr(stage.labelKey)}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: riskTok.ink,
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: riskTok.dot,
                    }}
                  />
                  {riskKey ? tr(riskKey) : s.risk}
                </span>
              </div>
            );
          })}

          <div
            style={{
              padding: '11px 16px',
              background: 'var(--surface-2)',
              fontSize: '11.5px',
              color: 'var(--text-3)',
            }}
          >
            {trf('osPortfolio.footer', { n: list.length })}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            position: 'sticky',
            top: '76px',
          }}
        >
          <div style={{ ...CARD, padding: '18px 20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                marginBottom: '7px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--primary-ink)',
                }}
              >
                {selected.code}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '21px',
                  padding: '0 9px',
                  borderRadius: '6px',
                  background: selStageTok.bg,
                  color: selStageTok.ink,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {tr(selStage.labelKey)}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: selRiskTok.ink,
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: selRiskTok.dot,
                  }}
                />
                {trf('osPortfolio.selResidual', {
                  label: selRiskKey ? tr(selRiskKey) : selected.risk,
                })}
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '-.2px',
                lineHeight: 1.3,
                textWrap: 'pretty',
              }}
            >
              {selected.name}
            </h2>
            <div
              style={{
                fontSize: '12.5px',
                lineHeight: 1.65,
                color: 'var(--text-2)',
                marginTop: '9px',
                textWrap: 'pretty',
              }}
            >
              {selected.note}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                gap: '12px 18px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border)',
              }}
            >
              {PROFILE_FIELDS.map((f) => (
                <div key={f.labelKey}>
                  <div
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--text-3)',
                      marginBottom: '3px',
                    }}
                  >
                    {tr(f.labelKey)}
                  </div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      fontFamily: f.mono ? 'var(--mono)' : undefined,
                    }}
                  >
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '9px' }}>
              {tr('osPortfolio.certPosition')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.6 }}>
              {selCertKey ? tr(selCertKey) : selected.cert}
            </div>
            {!inCertifiedScope(selected.cert) && (
              <div
                style={{
                  display: 'flex',
                  gap: '9px',
                  alignItems: 'flex-start',
                  marginTop: '11px',
                  padding: '10px 12px',
                  borderRadius: '9px',
                  background: 'var(--rag-a-bg)',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--rag-a-ink)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: '2px' }}
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4.5" />
                  <circle cx="12" cy="16" r=".7" fill="currentColor" stroke="none" />
                </svg>
                <span
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--rag-a-ink)',
                    lineHeight: 1.55,
                  }}
                >
                  {tr('osPortfolio.notInScopeWarning')}
                </span>
              </div>
            )}
          </div>

          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
              {trf('osPortfolio.deliveredBy', { n: selOpcos.length })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selOpcos.map((o) => (
                <div
                  key={o.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                  }}
                >
                  <span
                    style={{
                      width: '34px',
                      height: '22px',
                      borderRadius: '5px',
                      background: 'var(--surface-3)',
                      color: 'var(--text-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {o.code}
                  </span>
                  <span
                    style={{
                      minWidth: 0,
                      flex: 1,
                      fontSize: '12px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {o.name}
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>{o.country}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...CARD, padding: '16px 18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>
              {tr('osPortfolio.securityReqs')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {OS_REQUIREMENT_KEYS.map((key) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    gap: '9px',
                    fontSize: '12px',
                    color: 'var(--text-2)',
                    lineHeight: 1.55,
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
                  <span style={{ textWrap: 'pretty' }}>{tr(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
