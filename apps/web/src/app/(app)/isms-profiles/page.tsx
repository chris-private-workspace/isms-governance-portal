'use client';

/**
 * File: apps/web/src/app/(app)/isms-profiles/page.tsx
 * Purpose: Each APAC OpCo's ISMS profile — standards, sites, scope, leader, catalogue, versions.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/23-apac-isms-profiles.html (36 <sc-if>, 8
 *   <sc-for>) under the five port rules in AppShell.tsx. Inline style values are
 *   unchanged; only the hover mechanism moves, to data-hov.
 *
 *   THE TOPBAR SCOPE DECIDES WHICH PROFILE, ALWAYS. The prototype had a role
 *   selector that both changed the presentation and reassigned the OpCo being
 *   shown (dc.html:4432 forces selIsms to a hardcoded OpCo). Reassigning the
 *   entity from a control on the page is exactly what guardrail 4 forbids, so
 *   the two jobs are split: `useShell().entity` is the only source of entity
 *   identity, and the role selector keeps only the presentation half.
 *     - regional scope (entity === null) -> the fragment's isPlatformAdmin view:
 *       KPI strip, the rail of all 13 OpCos, and a rail selection for the detail.
 *       Reading across entities is legitimate here because the scope IS the
 *       region; the rail selection is a view choice inside an authorised scope,
 *       not an identity claim.
 *     - an OpCo in scope -> the fragment's isOpcoScoped view: no rail, no KPI
 *       strip, that entity's profile and nothing else.
 *   The two are mutually exclusive, so the role buttons are disabled where they
 *   would contradict the scope: 'Platform administrator' cannot be chosen while
 *   the scope is narrowed (it would list other entities), and the two OpCo roles
 *   cannot be chosen while the scope is the whole region (their banner says
 *   "other operating companies are not visible", which would be false next to a
 *   13-row rail). Disabled with a reason beats a control that lies.
 *
 *   EDITING IS REAL BUT LOCAL. Every input, the standards toggles, add/remove
 *   site, cancel and 'Save as new version' work: the draft lives in state, and
 *   saving commits it to a local overlay, marks the previous version superseded,
 *   prepends a new version row and fires the toast. Nothing is persisted and
 *   nothing claims to be — <DemoBadge/> is on the screen throughout. The
 *   alternative, rendering the edit branch of 22 <sc-if> as inert markup, is the
 *   Potemkin shape AP-3 is about.
 *
 *   TWO CONTROLS ARE INERT BY DESIGN, and both are marked as such rather than
 *   left live-looking: 'New profile' and 'Export profile'. Creating a profile
 *   needs a write path and an entity to create it under; exporting needs a
 *   document backend. Neither exists, and the prototype gave neither an onClick.
 *
 *   THE CATALOGUE'S TWO DATE COLUMNS ARE NOT IN THE FIXTURE. Effective and
 *   Valid to are derived at the view layer from the OpCo's certificate, exactly
 *   as dc.html:4686-4687 does, fallbacks included. Transcribed, not invented.
 *
 * Key Components:
 *   - IsmsProfilesPage: the screen
 *   - ROLES / TABS / FILTERS: the three segmented controls, in the design's order
 *   - catalogueDates: the derivation the fixture deliberately does not store
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — APAC ISMS profiles port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/23-apac-isms-profiles.html
 *   - apps/web/src/data/extended/ismsProfiles.ts — the records, versions and catalogue generator
 */

import { useEffect, useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconCheck, IconEdit, IconExport, IconMinus, IconPlus, IconSave } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import {
  DEFAULT_VERSIONS,
  ISMS_PROFILES,
  ISMS_STANDARDS,
  ISMS_VERSIONS,
  ismsCounts,
  type CatalogueStatus,
  type IsmsLeader,
  type IsmsProfile,
  type IsmsSite,
  type IsmsVersion,
} from '@/data/extended/ismsProfiles';
import { opcos, type OpCo } from '@/data/opcos';
import type { TranslationKey } from '@/i18n';
import { tok } from '@/lib/tok';

type IsmsRole = 'platform' | 'opco' | 'os';
/** The two roles that only make sense once the scope is a single OpCo. */
type ScopedRole = Exclude<IsmsRole, 'platform'>;
type IsmsTab = 'profile' | 'catalogue' | 'versions';
type CatalogueFilter = 'all' | 'op' | 'os';

/**
 * The record plus the one field the fixture deliberately does not store: the
 * scope statement is generated per OpCo (dc.html:4434) until somebody edits it,
 * at which point the edited text has to live somewhere.
 */
type ProfileDraft = IsmsProfile & { scope: string };

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

/** Fragment :108, :177, :189 — the three plain card headers are identical. */
const CARD_HEAD: React.CSSProperties = {
  padding: '12px 18px',
  background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)',
  fontSize: '12px',
  fontWeight: 700,
};

const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '.4px',
  marginBottom: '6px',
};

const FIELD_VALUE: React.CSSProperties = { fontSize: '13px', fontWeight: 600 };

const INPUT: React.CSSProperties = {
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

/**
 * Three inputs declare font-family twice (:164, :204, :209) — `inherit`, then
 * `var(--mono)`. CSS takes the last declaration; an object literal cannot hold
 * the same key twice, so only the winner is written. Same for the second
 * font-size on the email and phone inputs. Nothing is re-derived.
 */
const MONO_INPUT: React.CSSProperties = { ...INPUT, fontFamily: 'var(--mono)' };
const MONO_INPUT_SM: React.CSSProperties = { ...MONO_INPUT, fontSize: '12.5px' };

const SITE_COLUMNS = '34px minmax(0,1.1fr) minmax(0,2fr) 150px 40px';
const CATALOGUE_COLUMNS = '78px minmax(0,2fr) 66px 104px 112px 108px 108px 120px';
const VERSION_COLUMNS = '84px 112px 150px minmax(0,1fr) 118px';

const ROLES: { value: IsmsRole; labelKey: TranslationKey; subKey: TranslationKey }[] = [
  {
    value: 'platform',
    labelKey: 'ismsProfile.role.platform',
    subKey: 'ismsProfile.role.platform.sub',
  },
  { value: 'opco', labelKey: 'ismsProfile.role.opco', subKey: 'ismsProfile.role.opco.sub' },
  { value: 'os', labelKey: 'ismsProfile.role.os', subKey: 'ismsProfile.role.os.sub' },
];

const TABS: { value: IsmsTab; labelKey: TranslationKey }[] = [
  { value: 'profile', labelKey: 'ismsProfile.tab.profile' },
  { value: 'catalogue', labelKey: 'ismsProfile.tab.catalogue' },
  { value: 'versions', labelKey: 'ismsProfile.tab.versions' },
];

const FILTERS: { value: CatalogueFilter; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'ismsProfile.filter.all' },
  { value: 'op', labelKey: 'ismsProfile.filter.op' },
  { value: 'os', labelKey: 'ismsProfile.filter.os' },
];

/** dc.html:4659 — the certificate state is a RAG rating like any other. */
const CERT_RATING: Record<OpCo['cert'], string> = {
  Certified: 'G',
  'In scope': 'A',
  'Not in scope': 'N',
};

const CERT_LABEL: Record<OpCo['cert'], TranslationKey> = {
  Certified: 'ismsProfile.cert.certified',
  'In scope': 'ismsProfile.cert.inScope',
  'Not in scope': 'ismsProfile.cert.notInScope',
};

/** dc.html:4682 */
const STATUS_RATING: Record<CatalogueStatus, string> = {
  Approved: 'G',
  Conditional: 'A',
  Pending: 'N',
};

const STATUS_LABEL: Record<CatalogueStatus, TranslationKey> = {
  Approved: 'ismsProfile.item.approved',
  Conditional: 'ismsProfile.item.conditional',
  Pending: 'ismsProfile.item.pending',
};

/**
 * dc.html:4434 — the scope statement branches on the OpCo's role. Only the
 * branch is decided here; both sentences are copy and live in the dictionaries.
 * A map of literals rather than a computed key: a key assembled at runtime
 * type-checks and then renders as its own name.
 */
const SCOPE_KEY_BY_ROLE: Record<string, TranslationKey> = {
  'Supply chain': 'ismsProfile.scope.supplyChain',
};
const DEFAULT_SCOPE_KEY: TranslationKey = 'ismsProfile.scope.sales';

/** dc.html:4718 — "within the next quarter", as the design fixed it. */
const NEXT_QUARTER_END = '2026-10-01';

/**
 * dc.html:4686-4687 — the Effective / Valid to columns are not stored on a
 * catalogue item. The design reads them off the OpCo's certificate and falls
 * back to these two dates for an OpCo that has none. Transcribed, not invented.
 */
function catalogueDates(opco: OpCo, status: CatalogueStatus): { eff: string; valid: string } {
  if (status === 'Pending') return { eff: '—', valid: '—' };
  return {
    eff: opco.issued !== '—' ? opco.issued : '2025-06-30',
    valid: opco.expires !== '—' ? opco.expires : '2026-12-31',
  };
}

/** dc.html:3843-3851 — RAPO has its own history, everything else shares one. */
function baseVersions(code: string): IsmsVersion[] {
  return ISMS_VERSIONS[code] ?? DEFAULT_VERSIONS;
}

/** dc.html:4680 — the header count follows the sites, including edited ones. */
function totalEmployees(sites: IsmsSite[]): number {
  return sites.reduce((total, site) => total + (parseInt(String(site.emp), 10) || 0), 0);
}

/** dc.html:4457-4458 — v3.2 -> v3.3. */
function nextVersion(current: string | undefined): string {
  const parsed = Number.parseFloat((current ?? 'v2.0').replace('v', ''));
  return `v${((Number.isFinite(parsed) ? parsed : 2) + 0.1).toFixed(1)}`;
}

export default function IsmsProfilesPage() {
  const { tr, trf, entity } = useShell();

  // Which OpCo the rail is pointing at. Only consulted at regional scope; when
  // the topbar names an entity, that entity wins and this is ignored.
  const [railCode, setRailCode] = useState(opcos[0]?.code ?? '');
  const [scopedRole, setScopedRole] = useState<ScopedRole>('opco');
  const [tab, setTab] = useState<IsmsTab>('profile');
  const [filter, setFilter] = useState<CatalogueFilter>('all');
  const [draft, setDraft] = useState<{ code: string; data: ProfileDraft } | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<Record<string, ProfileDraft>>({});
  const [savedVersions, setSavedVersions] = useState<Record<string, IsmsVersion[]>>({});
  const [toast, setToast] = useState<string | null>(null);

  // dc.html:4466 — the toast clears itself after 3.6s.
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const regional = entity === null;
  const role: IsmsRole = regional ? 'platform' : scopedRole;
  const canEdit = role !== 'os';

  const selected = entity ?? opcos.find((o) => o.code === railCode) ?? null;
  const savedProfile = selected ? savedProfiles[selected.code] : undefined;
  const stored = savedProfile ?? (selected ? ISMS_PROFILES[selected.code] : undefined) ?? null;
  // A draft belongs to one OpCo. Changing scope therefore leaves edit mode
  // rather than carrying somebody else's half-typed values across.
  const activeDraft = selected && draft && draft.code === selected.code ? draft.data : null;
  const editing = activeDraft !== null;
  const src = activeDraft ?? stored ?? null;

  const versions = selected ? (savedVersions[selected.code] ?? baseVersions(selected.code)) : [];
  const counts = selected ? ismsCounts(selected) : null;
  const shownItems = (counts?.items ?? []).filter((item) =>
    filter === 'all' ? true : filter === 'op' ? item.biz === 'OP' : item.biz === 'OS',
  );

  const certifiedCount = opcos.filter((o) => o.cert === 'Certified').length;
  const approvedItems = opcos.reduce((total, o) => {
    const k = ismsCounts(o);
    return total + k.op + k.os;
  }, 0);
  const surveillanceDue = opcos.filter((o) => o.surv !== '—' && o.surv < NEXT_QUARTER_END).length;

  // Generated until somebody edits it, then whatever they saved. Written as a
  // chain over the three sources rather than an `in` check on the union: `in`
  // narrowing widens the absent property to `unknown`, which is a compile error
  // the moment the text is rendered.
  const scopeText = (() => {
    if (activeDraft) return activeDraft.scope;
    if (savedProfile) return savedProfile.scope;
    if (!selected) return '';
    const key = SCOPE_KEY_BY_ROLE[selected.role] ?? DEFAULT_SCOPE_KEY;
    return trf(key, { name: selected.name });
  })();

  function startEdit() {
    if (!selected || !stored) return;
    setDraft({
      code: selected.code,
      data: {
        company: stored.company,
        country: stored.country,
        standards: [...stored.standards],
        certCount: stored.certCount,
        sites: stored.sites.map((site) => ({ ...site })),
        leader: { ...stored.leader },
        scope: scopeText,
      },
    });
    setTab('profile');
  }

  function patchDraft(patch: Partial<ProfileDraft>) {
    setDraft((current) =>
      current ? { ...current, data: { ...current.data, ...patch } } : current,
    );
  }

  function patchLeader(patch: Partial<IsmsLeader>) {
    setDraft((current) =>
      current
        ? { ...current, data: { ...current.data, leader: { ...current.data.leader, ...patch } } }
        : current,
    );
  }

  function patchSite(index: number, patch: Partial<IsmsSite>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              sites: current.data.sites.map((site, ix) =>
                ix === index ? { ...site, ...patch } : site,
              ),
            },
          }
        : current,
    );
  }

  function addSite() {
    setDraft((current) =>
      current
        ? {
            ...current,
            data: {
              ...current.data,
              sites: [...current.data.sites, { name: '', address: '', emp: '' }],
            },
          }
        : current,
    );
  }

  function removeSite(index: number) {
    setDraft((current) =>
      current
        ? {
            ...current,
            data: { ...current.data, sites: current.data.sites.filter((_, ix) => ix !== index) },
          }
        : current,
    );
  }

  function toggleStandard(standard: string) {
    setDraft((current) => {
      if (!current) return current;
      const held = current.data.standards.includes(standard);
      return {
        ...current,
        data: {
          ...current.data,
          standards: held
            ? current.data.standards.filter((s) => s !== standard)
            : [...current.data.standards, standard],
        },
      };
    });
  }

  /**
   * dc.html:4447-4466, with the persistence swapped for a local overlay. The
   * effect is real and visible — the profile, the rail card, the version list
   * and the toast all change — and it survives exactly as long as the page does.
   */
  function saveVersion() {
    if (!selected || !activeDraft) return;
    const kept = activeDraft.sites.filter((site) => String(site.name).trim() !== '');
    const data: ProfileDraft = {
      ...activeDraft,
      sites: kept.length > 0 ? kept : [{ name: '—', address: '—', emp: 0 }],
    };
    const ver = nextVersion(versions[0]?.ver);
    const head: IsmsVersion = {
      ver,
      date: new Date().toISOString().slice(0, 10),
      by: { key: role === 'platform' ? 'ismsProfile.role.platform' : 'ismsProfile.role.opco' },
      noteKey:
        role === 'platform'
          ? 'ismsProfile.ver.note.updatedPlatform'
          : 'ismsProfile.ver.note.updatedOpco',
      statusKey: 'ismsProfile.ver.status.published',
    };
    const priors = versions.map((version, ix) =>
      ix === 0 ? { ...version, statusKey: 'ismsProfile.ver.status.superseded' as const } : version,
    );

    setSavedProfiles((current) => ({ ...current, [selected.code]: data }));
    setSavedVersions((current) => ({ ...current, [selected.code]: [head, ...priors] }));
    setDraft(null);
    setToast(ver);
  }

  const certTok = selected ? tok(CERT_RATING[selected.cert]) : tok('N');
  const sites = src?.sites ?? [];
  const employees = totalEmployees(sites);
  // The banner bolds only the company name (fragment :46); the dictionary holds
  // the sentence with a {company} hole, so it is split rather than concatenated.
  const bannerParts = tr('ismsProfile.banner.shown').split('{company}');

  return (
    <div data-screen-label="APAC ISMS profiles">
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
            {tr('ismsProfile.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('ismsProfile.title')}
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
            {tr('ismsProfile.subtitle')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            role="group"
            title={tr('ismsProfile.role.hint')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'var(--surface-3)',
              borderRadius: '9px',
              padding: '3px',
            }}
          >
            {ROLES.map((option) => {
              // A role that contradicts the current scope is offered as
              // unavailable rather than allowed to redraw the screen into a
              // state the scope forbids. See the file header.
              const available = regional
                ? option.value === 'platform'
                : option.value !== 'platform';
              const active = option.value === role;
              const scopedOption = option.value !== 'platform';
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  disabled={!available || active}
                  onClick={
                    available && !active && scopedOption
                      ? () => setScopedRole(option.value as ScopedRole)
                      : undefined
                  }
                  title={available ? tr(option.subKey) : tr('ismsProfile.role.unavailable')}
                  style={{
                    height: '32px',
                    padding: '0 13px',
                    border: `1px solid ${active ? 'var(--border-strong)' : 'transparent'}`,
                    borderRadius: '7px',
                    background: active ? 'var(--surface)' : 'transparent',
                    color: active ? 'var(--primary-ink)' : 'var(--text-2)',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    fontWeight: 600,
                    // components/controls.md: unavailable is opacity .5 + not-allowed.
                    cursor: available ? 'pointer' : 'not-allowed',
                    opacity: available ? 1 : 0.5,
                  }}
                >
                  {tr(option.labelKey)}
                </button>
              );
            })}
          </div>
          {regional && (
            /* Inert by design: creating a profile needs a write path and an
               entity to create it under, and this port has neither. Marked
               disabled rather than left live-looking. */
            <button
              type="button"
              disabled
              title={tr('ismsProfile.action.unavailable')}
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
                cursor: 'not-allowed',
                opacity: 0.5,
              }}
            >
              <IconPlus width="16" height="16" stroke="currentColor" strokeWidth="2.1" />
              {tr('ismsProfile.newProfile')}
            </button>
          )}
        </div>
      </div>

      {toast !== null && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '11px 15px',
            border: '1px solid var(--rag-g)',
            borderRadius: '10px',
            background: 'var(--rag-g-bg)',
            marginBottom: '14px',
          }}
        >
          <IconCheck
            width="16"
            height="16"
            stroke="var(--rag-g-ink)"
            strokeWidth="2.4"
            style={{ flexShrink: 0 }}
          />
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--rag-g-ink)' }}>
            {trf('ismsProfile.toast.saved', { ver: toast })}
          </span>
        </div>
      )}

      {regional && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div style={{ ...CARD, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              {tr('ismsProfile.kpi.certified.label')}
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-.6px',
                marginTop: '5px',
                color: 'var(--rag-g-ink)',
              }}
            >
              {certifiedCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
              {trf('ismsProfile.kpi.certified.foot', { n: opcos.length })}
            </div>
          </div>
          <div style={{ ...CARD, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              {tr('ismsProfile.kpi.items.label')}
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-.6px',
                marginTop: '5px',
              }}
            >
              {approvedItems}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
              {tr('ismsProfile.kpi.items.foot')}
            </div>
          </div>
          <div style={{ ...CARD, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              {tr('ismsProfile.kpi.surveillance.label')}
            </div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 700,
                letterSpacing: '-.6px',
                marginTop: '5px',
                color: 'var(--rag-a-ink)',
              }}
            >
              {surveillanceDue}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>
              {tr('ismsProfile.kpi.surveillance.foot')}
            </div>
          </div>
          <div style={{ ...CARD, padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
              {tr('ismsProfile.kpi.standards.label')}
            </div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: 700,
                letterSpacing: '-.3px',
                marginTop: '9px',
              }}
            >
              {tr('ismsProfile.kpi.standards.value')}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '5px' }}>
              {tr('ismsProfile.kpi.standards.foot')}
            </div>
          </div>
        </div>
      )}

      {!regional && src && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            padding: '12px 16px',
            border: '1px solid var(--primary)',
            borderRadius: '10px',
            background: 'var(--primary-tint)',
            marginBottom: '16px',
          }}
        >
          {/* Not IconInfo: the fragment's dot is r=.8 where IconInfo carries
              r=.6, and substituting one for the other would re-derive a value. */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--primary-ink)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none" />
          </svg>
          <span style={{ fontSize: '12.5px', color: 'var(--primary-ink)', lineHeight: 1.5 }}>
            {tr(role === 'os' ? 'ismsProfile.banner.os' : 'ismsProfile.banner.opco')}{' '}
            {bannerParts[0]}
            <b>{src.company}</b>
            {bannerParts[1]}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: regional ? '300px minmax(0,1fr)' : 'minmax(0,1fr)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {regional && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '.5px',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                padding: '0 4px 2px',
              }}
            >
              {trf('ismsProfile.rail.heading', { n: opcos.length })}
            </div>
            {opcos.map((opco) => {
              const record = savedProfiles[opco.code] ?? ISMS_PROFILES[opco.code];
              const standards = record?.standards ?? [];
              const active = selected?.code === opco.code;
              const railTok = tok(CERT_RATING[opco.cert]);
              return (
                <div
                  key={opco.code}
                  onClick={() => setRailCode(opco.code)}
                  data-hov="bs"
                  style={{
                    background: active ? 'var(--primary-tint)' : 'var(--surface)',
                    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '10px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span
                      style={{
                        width: '34px',
                        height: '24px',
                        borderRadius: '5px',
                        background: 'var(--surface-3)',
                        color: 'var(--text-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--mono)',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {opco.code}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          lineHeight: 1.3,
                        }}
                      >
                        {record?.company ?? opco.name}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10.5px',
                          color: 'var(--text-3)',
                          marginTop: '2px',
                        }}
                      >
                        {record?.country ?? opco.country}
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      marginTop: '9px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '19px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        background: railTok.bg,
                        color: railTok.ink,
                        fontSize: '10.5px',
                        fontWeight: 700,
                      }}
                    >
                      {tr(CERT_LABEL[opco.cert])}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {standards.length > 0
                        ? standards.map((s) => s.replace('ISO ', '')).join(' · ')
                        : tr('ismsProfile.rail.noStandard')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selected && src && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            <div style={{ ...CARD, padding: '18px 20px' }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      marginBottom: '6px',
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
                        background: certTok.bg,
                        color: certTok.ink,
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {tr(CERT_LABEL[selected.cert])}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '21px',
                        padding: '0 9px',
                        borderRadius: '6px',
                        background: 'var(--surface-3)',
                        color: 'var(--text-2)',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {versions[0]?.ver}
                    </span>
                  </div>
                  <h2
                    style={{ margin: 0, fontSize: '19px', fontWeight: 700, letterSpacing: '-.2px' }}
                  >
                    {src.company}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-2)', marginTop: '5px' }}>
                    {trf('ismsProfile.meta', {
                      country: src.country,
                      sites: sites.length,
                      emp: employees,
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {!editing && (
                    <>
                      {/* Inert by design: exporting the profile needs a document
                          backend this port does not have. The prototype gave this
                          button no handler either (fragment :85).
                          The fragment's style-hover="background:var(--surface-3)"
                          is deliberately NOT carried across — :hover still fires
                          on a disabled button, and lighting up under the pointer
                          is precisely the "looks live" signal the disable exists
                          to remove. The one declaration dropped on this screen. */}
                      <button
                        type="button"
                        disabled
                        title={tr('ismsProfile.action.unavailable')}
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
                          cursor: 'not-allowed',
                          opacity: 0.5,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                        }}
                      >
                        <IconExport
                          width="15"
                          height="15"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        {tr('ismsProfile.export')}
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={startEdit}
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
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                          }}
                        >
                          <IconEdit
                            width="15"
                            height="15"
                            stroke="currentColor"
                            strokeWidth="1.9"
                          />
                          {tr('ismsProfile.edit')}
                        </button>
                      )}
                    </>
                  )}
                  {editing && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDraft(null)}
                        data-hov="s3"
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
                        }}
                      >
                        {tr('ismsProfile.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={saveVersion}
                        style={{
                          height: '34px',
                          padding: '0 15px',
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
                        }}
                      >
                        <IconSave width="15" height="15" stroke="currentColor" strokeWidth="1.9" />
                        {tr('ismsProfile.save')}
                      </button>
                    </>
                  )}
                </div>
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
                width: 'fit-content',
                flexWrap: 'wrap',
              }}
            >
              {TABS.map((option) => {
                const on = option.value === tab;
                // dc.html:4761 — an open draft locks the other two tabs, so a
                // half-edited profile cannot be navigated away from by accident.
                const locked = editing && !on;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    disabled={locked || on}
                    onClick={locked || on ? undefined : () => setTab(option.value)}
                    style={{
                      height: '32px',
                      padding: '0 15px',
                      border: `1px solid ${on ? 'var(--border-strong)' : 'transparent'}`,
                      borderRadius: '7px',
                      background: on ? 'var(--surface)' : 'transparent',
                      color: on ? 'var(--primary-ink)' : locked ? 'var(--text-3)' : 'var(--text-2)',
                      fontFamily: 'inherit',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    {tr(option.labelKey)}
                  </button>
                );
              })}
            </div>

            {tab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ ...CARD, overflow: 'hidden' }}>
                  <div style={CARD_HEAD}>{tr('ismsProfile.card.company')}</div>
                  <div
                    style={{
                      padding: '18px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                      gap: '16px 20px',
                    }}
                  >
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.standards')}</span>
                      {!editing && (
                        <div style={FIELD_VALUE}>
                          {src.standards.length > 0
                            ? src.standards.join(' · ')
                            : tr('ismsProfile.standards.none')}
                        </div>
                      )}
                      {editing && (
                        <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
                          {ISMS_STANDARDS.map((standard) => {
                            const on = src.standards.includes(standard);
                            return (
                              <div
                                key={standard}
                                onClick={() => toggleStandard(standard)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '9px',
                                  padding: '9px 13px',
                                  border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`,
                                  borderRadius: '8px',
                                  background: on ? 'var(--primary-tint)' : 'var(--surface-2)',
                                  cursor: 'pointer',
                                }}
                              >
                                <span
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '4px',
                                    border: '1.5px solid',
                                    background: on ? 'var(--primary)' : 'transparent',
                                    borderColor: on ? 'var(--primary)' : 'var(--border-strong)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <IconCheck
                                    width="10"
                                    height="10"
                                    stroke="#fff"
                                    strokeWidth="3.4"
                                  />
                                </span>
                                <span
                                  style={{
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: on ? 'var(--primary-ink)' : 'var(--text-3)',
                                  }}
                                >
                                  {standard}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.certCount')}</span>
                      {!editing && (
                        <div style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)' }}>
                          {src.certCount}
                        </div>
                      )}
                      {editing && (
                        <input
                          value={String(src.certCount)}
                          onChange={(e) => patchDraft({ certCount: e.target.value })}
                          style={INPUT}
                        />
                      )}
                    </div>
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.companyName')}</span>
                      {!editing && <div style={FIELD_VALUE}>{src.company}</div>}
                      {editing && (
                        <input
                          value={src.company}
                          onChange={(e) => patchDraft({ company: e.target.value })}
                          style={INPUT}
                        />
                      )}
                    </div>
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.country')}</span>
                      {!editing && <div style={FIELD_VALUE}>{src.country}</div>}
                      {editing && (
                        <input
                          value={src.country}
                          onChange={(e) => patchDraft({ country: e.target.value })}
                          style={INPUT}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ ...CARD, overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 18px',
                      background: 'var(--surface-2)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      {tr('ismsProfile.card.sites')}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {trf('ismsProfile.sites.meta', { sites: sites.length, emp: employees })}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: SITE_COLUMNS,
                      gap: '12px',
                      padding: '9px 18px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '.45px',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                    }}
                  >
                    <span>{tr('ismsProfile.col.num')}</span>
                    <span>{tr('ismsProfile.col.siteName')}</span>
                    <span>{tr('ismsProfile.col.address')}</span>
                    <span>{tr('ismsProfile.col.emp')}</span>
                    <span />
                  </div>
                  {sites.map((site, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: SITE_COLUMNS,
                        gap: '12px',
                        padding: '11px 18px',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '12.5px',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--text-3)',
                        }}
                      >
                        {index + 1}
                      </span>
                      {!editing && (
                        <>
                          <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{site.name}</span>
                          <span style={{ color: 'var(--text-2)', lineHeight: 1.45 }}>
                            {site.address}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: '12px',
                              color: 'var(--text-2)',
                            }}
                          >
                            {site.emp}
                          </span>
                          <span />
                        </>
                      )}
                      {editing && (
                        <>
                          <input
                            value={site.name}
                            onChange={(e) => patchSite(index, { name: e.target.value })}
                            placeholder={tr('ismsProfile.placeholder.siteName')}
                            style={INPUT}
                          />
                          <input
                            value={site.address}
                            onChange={(e) => patchSite(index, { address: e.target.value })}
                            placeholder={tr('ismsProfile.placeholder.address')}
                            style={INPUT}
                          />
                          <input
                            value={String(site.emp)}
                            onChange={(e) => patchSite(index, { emp: e.target.value })}
                            placeholder={tr('ismsProfile.placeholder.emp')}
                            style={MONO_INPUT}
                          />
                          <button
                            type="button"
                            onClick={() => removeSite(index)}
                            title={tr('ismsProfile.action.removeSite')}
                            data-hov="r-bg-ink"
                            style={{
                              width: '32px',
                              height: '32px',
                              border: '1px solid var(--border-strong)',
                              borderRadius: '7px',
                              background: 'var(--surface)',
                              color: 'var(--text-3)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconMinus
                              width="14"
                              height="14"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <div style={{ padding: '12px 18px' }}>
                      <button
                        type="button"
                        onClick={addSite}
                        data-hov="s2"
                        style={{
                          height: '34px',
                          padding: '0 14px',
                          border: '1px dashed var(--border-strong)',
                          borderRadius: '8px',
                          background: 'transparent',
                          color: 'var(--text-2)',
                          fontFamily: 'inherit',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                        }}
                      >
                        <IconPlus width="14" height="14" stroke="currentColor" strokeWidth="2.1" />
                        {tr('ismsProfile.addSite')}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ ...CARD, overflow: 'hidden' }}>
                  <div style={CARD_HEAD}>{tr('ismsProfile.card.scope')}</div>
                  <div style={{ padding: '18px' }}>
                    {!editing && (
                      <div
                        style={{
                          fontSize: '13px',
                          lineHeight: 1.7,
                          color: 'var(--text-2)',
                          textWrap: 'pretty',
                        }}
                      >
                        {scopeText}
                      </div>
                    )}
                    {editing && (
                      <textarea
                        value={scopeText}
                        onChange={(e) => patchDraft({ scope: e.target.value })}
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid var(--border-strong)',
                          borderRadius: '8px',
                          background: 'var(--surface-2)',
                          fontFamily: 'inherit',
                          fontSize: '13px',
                          lineHeight: 1.65,
                          color: 'var(--text)',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ ...CARD, overflow: 'hidden' }}>
                  <div style={CARD_HEAD}>{tr('ismsProfile.card.leader')}</div>
                  <div
                    style={{
                      padding: '18px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                      gap: '16px 20px',
                    }}
                  >
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.name')}</span>
                      {!editing && <div style={FIELD_VALUE}>{src.leader.name}</div>}
                      {editing && (
                        <input
                          value={src.leader.name}
                          onChange={(e) => patchLeader({ name: e.target.value })}
                          style={INPUT}
                        />
                      )}
                    </div>
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.dept')}</span>
                      {!editing && <div style={FIELD_VALUE}>{src.leader.dept}</div>}
                      {editing && (
                        <input
                          value={src.leader.dept}
                          onChange={(e) => patchLeader({ dept: e.target.value })}
                          style={INPUT}
                        />
                      )}
                    </div>
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.email')}</span>
                      {!editing && (
                        <div
                          style={{
                            ...FIELD_VALUE,
                            fontFamily: 'var(--mono)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {src.leader.email}
                        </div>
                      )}
                      {editing && (
                        <input
                          value={src.leader.email}
                          onChange={(e) => patchLeader({ email: e.target.value })}
                          style={MONO_INPUT_SM}
                        />
                      )}
                    </div>
                    <div>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.phone')}</span>
                      {!editing && (
                        <div style={{ ...FIELD_VALUE, fontFamily: 'var(--mono)' }}>
                          {src.leader.phone}
                        </div>
                      )}
                      {editing && (
                        <input
                          value={src.leader.phone}
                          onChange={(e) => patchLeader({ phone: e.target.value })}
                          style={MONO_INPUT_SM}
                        />
                      )}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={FIELD_LABEL}>{tr('ismsProfile.field.address')}</span>
                      {!editing && (
                        <div style={{ ...FIELD_VALUE, lineHeight: 1.5 }}>{src.leader.address}</div>
                      )}
                      {editing && (
                        <input
                          value={src.leader.address}
                          onChange={(e) => patchLeader({ address: e.target.value })}
                          style={INPUT}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'catalogue' && (
              <div style={{ ...CARD, overflow: 'auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    padding: '13px 18px',
                    borderBottom: '1px solid var(--border)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 700 }}>
                    {tr('ismsProfile.cat.title')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {FILTERS.map((option) => {
                      const on = option.value === filter;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setFilter(option.value)}
                          style={{
                            height: '28px',
                            padding: '0 12px',
                            border: `1px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                            borderRadius: '7px',
                            background: on ? 'var(--primary)' : 'var(--surface-2)',
                            color: on ? '#fff' : 'var(--text-2)',
                            fontFamily: 'inherit',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {tr(option.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: CATALOGUE_COLUMNS,
                    minWidth: '1010px',
                    gap: '12px',
                    padding: '9px 18px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.45px',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                  }}
                >
                  <span>{tr('ismsProfile.col.code')}</span>
                  <span>{tr('ismsProfile.col.item')}</span>
                  <span>{tr('ismsProfile.col.biz')}</span>
                  <span>{tr('ismsProfile.col.category')}</span>
                  <span>{tr('ismsProfile.col.status')}</span>
                  <span>{tr('ismsProfile.col.effective')}</span>
                  <span>{tr('ismsProfile.col.validTo')}</span>
                  <span>{tr('ismsProfile.col.linked')}</span>
                </div>
                {shownItems.map((item) => {
                  const statusTok = tok(STATUS_RATING[item.status]);
                  const dates = catalogueDates(selected, item.status);
                  return (
                    <div
                      key={item.code}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: CATALOGUE_COLUMNS,
                        minWidth: '1010px',
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
                          fontSize: '11px',
                          color: 'var(--primary-ink)',
                          fontWeight: 600,
                        }}
                      >
                        {item.code}
                      </span>
                      <span style={{ fontWeight: 600, lineHeight: 1.35, textWrap: 'pretty' }}>
                        {item.name}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '20px',
                          padding: '0 8px',
                          borderRadius: '5px',
                          background:
                            item.biz === 'OP' ? 'var(--primary-tint)' : 'var(--surface-3)',
                          color: item.biz === 'OP' ? 'var(--primary-ink)' : 'var(--text-2)',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          fontFamily: 'var(--mono)',
                          justifySelf: 'start',
                        }}
                      >
                        {item.biz}
                      </span>
                      <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{item.cat}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: statusTok.ink,
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: statusTok.dot,
                          }}
                        />
                        {tr(STATUS_LABEL[item.status])}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--text-2)',
                        }}
                      >
                        {dates.eff}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--text-2)',
                        }}
                      >
                        {dates.valid}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '10.5px',
                          color: 'var(--text-3)',
                        }}
                      >
                        {item.risk} · {item.ctl}
                      </span>
                    </div>
                  );
                })}
                <div
                  style={{
                    padding: '11px 18px',
                    background: 'var(--surface-2)',
                    fontSize: '11.5px',
                    color: 'var(--text-3)',
                  }}
                >
                  {trf('ismsProfile.cat.foot', { n: shownItems.length })}
                </div>
              </div>
            )}

            {tab === 'versions' && (
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '13px 18px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>
                    {tr('ismsProfile.ver.title')}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {trf('ismsProfile.ver.meta', { n: versions.length })}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: VERSION_COLUMNS,
                    gap: '14px',
                    padding: '9px 18px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.5px',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                  }}
                >
                  <span>{tr('ismsProfile.col.version')}</span>
                  <span>{tr('ismsProfile.col.saved')}</span>
                  <span>{tr('ismsProfile.col.savedBy')}</span>
                  <span>{tr('ismsProfile.col.note')}</span>
                  <span>{tr('ismsProfile.col.status')}</span>
                </div>
                {versions.map((version, index) => {
                  // dc.html:4673 — positional, not a rating: the newest row is
                  // green, every superseded one is neutral. The green pair is
                  // tok('G'); the neutral pair is text-3, which tok() has no
                  // member for, so those two are copied from the fragment.
                  const current = index === 0;
                  const currentTok = tok('G');
                  return (
                    <div
                      key={version.ver}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: VERSION_COLUMNS,
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
                          fontWeight: 700,
                          color: 'var(--primary-ink)',
                        }}
                      >
                        {version.ver}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11.5px',
                          color: 'var(--text-2)',
                        }}
                      >
                        {version.date}
                      </span>
                      <span style={{ color: 'var(--text-2)' }}>
                        {'name' in version.by ? version.by.name : tr(version.by.key)}
                      </span>
                      <span
                        style={{
                          color: 'var(--text-2)',
                          lineHeight: 1.45,
                          textWrap: 'pretty',
                        }}
                      >
                        {tr(version.noteKey)}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '21px',
                          padding: '0 9px',
                          borderRadius: '6px',
                          background: current ? currentTok.bg : 'var(--surface-3)',
                          color: current ? currentTok.ink : 'var(--text-3)',
                          fontSize: '11px',
                          fontWeight: 600,
                          justifySelf: 'start',
                        }}
                      >
                        {tr(version.statusKey)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
