'use client';

/**
 * File: apps/web/src/app/(app)/admin/page.tsx
 * Purpose: System administration — eleven configuration sections behind one
 *     sticky section list, from role permissions to the platform audit log.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/14-admin.html (343 lines) under the five port
 *   rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   FOUR THINGS ARE COMPUTED RATHER THAN COPIED, because the fragment states
 *   them as literals that its own loops contradict (port rule 10):
 *
 *   1. THE RAG THRESHOLD TABLE IS READ FROM lib/posture.ts, not transcribed.
 *      This screen claims to define how every KPI bands, and the dashboard
 *      already applies THRESHOLD to decide exactly that. Two copies of a
 *      threshold set is the one thing an admin screen must not be. Two of the
 *      five rows consequently differ from the mockup: RCSA completion ambers
 *      from 70 (the mockup printed 75) and high/critical risks greens at 4
 *      (the mockup printed 5). The module wins — it is what actually runs.
 *   2. Entity, user, category, connection and pending-request counts are all
 *      reductions over the fixture. The fragment hardcoded '6 active entities
 *      across 6 jurisdictions', '43 users' and '6 connected' beside loops of
 *      13, 8 and 8.
 *   3. The roles card lists the SIX roles of confirmed parameter #13, counted
 *      from ADMIN_USERS. The mockup's four (Regional Governance, Risk Owner,
 *      Vendor Risk Manager…) are not this project's role model, the same clash
 *      lib/personas.ts already settled in the charter's favour.
 *   4. Access-review progress bands on the fragment's own 90/60 split, which is
 *      NOT THRESHOLD.completion (90/70). Recertifying access and completing an
 *      RCSA are different metrics; folding them together would quietly redefine
 *      one of them.
 *
 *   NOT ROLE-GATED, and that is a gap rather than a decision. The fragment
 *   wraps the whole screen in <sc-if isAdmin> and permMatrix gives the
 *   Administration module to Platform admin alone. ShellState carries no role,
 *   the nav rail links /admin for every seat, and no ported screen enforces
 *   route-level RBAC yet — so gating here alone would be a single unenforced
 *   claim. Reported, not silently half-built.
 *
 *   INERT BY DESIGN: seven buttons in the fragment write to a server this port
 *   does not have. They render disabled — opacity .5 + not-allowed, which is
 *   components/controls.md's own disabled state — and admin.inert says so on
 *   screen. Their style-hover declarations are deliberately NOT carried across:
 *   a hover response is the signal that a control is live.
 *
 *   Fixture record content — module names, retention classes, notification
 *   events, session-policy rows, report names, audit actions — renders as
 *   written, the way every other panel in this port renders its records. Only
 *   the furniture and the six role names (which have dictionary keys already in
 *   use on the profile and login screens) are translated.
 *
 * Key Components:
 *   - AdminPage: the screen; owns section selection and the notification toggles
 *   - THRESHOLD_ROWS: the banding table, derived from lib/posture.ts
 *   - ROLE_LABEL / ROLE_DESC: literal key maps, so no key is assembled at runtime
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/14-admin.html
 *   - apps/web/src/lib/posture.ts — the thresholds the RAG panel reads
 */

import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconLock, IconShieldOutline, IconTaxonomy } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { accessRequests } from '@/data/accessRequests';
import { accessReviews } from '@/data/accessReviews';
import { entityPosture, jurisdictionCount } from '@/data/entityPosture';
import {
  ADMIN_SECTIONS,
  DEFAULT_ADMIN_SECTION,
  type AdminSectionKey,
} from '@/data/extended/adminSections';
import { ADMIN_USERS, type AdminUser } from '@/data/extended/adminUsers';
import { INTEGRATIONS } from '@/data/extended/integrations';
import { PERM_LEGEND, permLevel } from '@/data/extended/permKey';
import { RECENT_EXPORTS } from '@/data/extended/recentExports';
import { ROLES, type Role } from '@/data/extended/roles';
import { AUDIT_DOT, SYSTEM_AUDIT } from '@/data/extended/systemAudit';
import { TAXONOMY } from '@/data/extended/taxonomy';
import { notifyRules } from '@/data/notifyRules';
import { opcos } from '@/data/opcos';
import { permMatrix } from '@/data/permMatrix';
import { reportLibrary } from '@/data/reportLibrary';
import { retention } from '@/data/retention';
import { sessionPolicy } from '@/data/sessionPolicy';
import type { TranslationKey } from '@/i18n';
import { ROLE_KEYS, type RoleKey } from '@/lib/personas';
import { THRESHOLD } from '@/lib/posture';
import { tok } from '@/lib/tok';

/* ── shared surfaces, character-identical across the eleven panels ────────── */

const CARD: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow)',
};

/** Fragment :29,:57,:73,:86,:121,:138,:159 — title strip above a panel. */
const CARD_HEAD: React.CSSProperties = {
  padding: '16px 18px',
  borderBottom: '1px solid var(--border)',
};

const CARD_TITLE: React.CSSProperties = { fontSize: '14px', fontWeight: 700 };

const CARD_SUB: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--text-3)',
  marginTop: '2px',
};

/** Fragment :31,:58,:105,:140,:161 — the tinted uppercase column strip. */
const TH: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
};

/** Fragment :211-216,:240-244 — the same strip as a real <th>. */
const TH_CELL: React.CSSProperties = { ...TH, textAlign: 'left', padding: '9px 12px' };

/** Fragment :102,:208,:237 — the one primary action a panel may carry. */
const BTN_PRIMARY: React.CSSProperties = {
  height: '32px',
  padding: '0 12px',
  border: 'none',
  borderRadius: '8px',
  background: 'var(--primary)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

/** Fragment :275,:294 — the ghost variant. */
const BTN_GHOST: React.CSSProperties = {
  height: '32px',
  padding: '0 12px',
  border: '1px solid var(--border-strong)',
  borderRadius: '8px',
  background: 'var(--surface)',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-2)',
  cursor: 'pointer',
};

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Applied to every action that would need a server. Not an invented visual:
 * it is the design system's own disabled state, and it is the only honest way
 * to render a capability the design promises and this port cannot deliver.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

/* ── literal key maps ─────────────────────────────────────────────────────── */

/**
 * Permission-matrix column -> its translated role name.
 *
 * Keyed by the role STRING rather than by index. ROLES and ROLE_KEYS happen to
 * be in the same order today; indexing one with the other's position would turn
 * a future reorder of either list into silently relabelled permissions, which
 * is the exact failure extended/roles.ts warns about.
 */
const ROLE_LABEL: Record<Role, TranslationKey> = {
  'Platform admin': 'role.platformAdmin',
  'Regional ISO': 'role.regionalIso',
  'OpCo admin': 'role.opcoAdmin',
  'Control owner': 'role.controlOwner',
  'OpCo OS': 'role.opcoOs',
  Auditor: 'role.auditor',
};

/** What each of the six roles may do. Keys literal, per the i18n scan. */
const ROLE_DESC: Record<RoleKey, TranslationKey> = {
  'role.platformAdmin': 'admin.role.desc.platformAdmin',
  'role.regionalIso': 'admin.role.desc.regionalIso',
  'role.opcoAdmin': 'admin.role.desc.opcoAdmin',
  'role.controlOwner': 'admin.role.desc.controlOwner',
  'role.opcoOs': 'admin.role.desc.opcoOs',
  'role.auditor': 'admin.role.desc.auditor',
};

/** dc.html:4728 — Approved is green, Rejected red, anything pending amber. */
const ACCESS_STATUS: Record<string, { rating: string; key: TranslationKey }> = {
  Pending: { rating: 'A', key: 'admin.access.status.pending' },
  Approved: { rating: 'G', key: 'admin.access.status.approved' },
  Rejected: { rating: 'R', key: 'admin.access.status.rejected' },
};

/** dc.html:4734 — Scheduled green, Draft amber, Manual neutral. */
const REPORT_STATUS: Record<string, { rating: string; key: TranslationKey }> = {
  Scheduled: { rating: 'G', key: 'admin.report.status.scheduled' },
  Manual: { rating: 'N', key: 'admin.report.status.manual' },
  Draft: { rating: 'A', key: 'admin.report.status.draft' },
};

/** dc.html:5104 — an active seat is green, an unaccepted invitation amber. */
const USER_STATUS: Record<AdminUser['status'], { rating: string; key: TranslationKey }> = {
  Active: { rating: 'G', key: 'admin.users.status.active' },
  Invited: { rating: 'A', key: 'admin.users.status.invited' },
};

/* ── the RAG threshold table, derived rather than transcribed ─────────────── */

type Band = { key: TranslationKey; vars: Record<string, number> };
type Bands = { g: Band; a: Band; r: Band };

/**
 * Higher-is-better percentages — what band() does, written out.
 *
 * The amber floor is `watch` and its ceiling is one below `good`, because
 * band() returns G at exactly `good`. Reading the boundary off the function
 * rather than off the mockup is the whole point of this panel.
 */
function ascendingPct(good: number, watch: number): Bands {
  return {
    g: { key: 'admin.thresholds.band.atLeastPct', vars: { n: good } },
    a: { key: 'admin.thresholds.band.rangePct', vars: { lo: watch, hi: good - 1 } },
    r: { key: 'admin.thresholds.band.underPct', vars: { n: watch } },
  };
}

/**
 * Lower-is-better counts — what bandDesc() does.
 *
 * Two degenerate shapes get their own rendering rather than a silly range:
 * a `good` of 0 reads '0' and not '<= 0', and an amber band one value wide
 * reads '1' and not '1-1'. Open critical issues is both at once.
 */
function descendingCount(good: number, watch: number): Bands {
  return {
    g:
      good === 0
        ? { key: 'admin.thresholds.band.exactly', vars: { n: 0 } }
        : { key: 'admin.thresholds.band.atMost', vars: { n: good } },
    a:
      good + 1 === watch
        ? { key: 'admin.thresholds.band.exactly', vars: { n: watch } }
        : { key: 'admin.thresholds.band.range', vars: { lo: good + 1, hi: watch } },
    r: { key: 'admin.thresholds.band.atLeast', vars: { n: watch + 1 } },
  };
}

/** The five KPIs the dashboard bands, in the fragment's order (:191). */
const THRESHOLD_ROWS: { metricKey: TranslationKey; bands: Bands }[] = [
  {
    metricKey: 'admin.thresholds.metric.coverage',
    bands: ascendingPct(THRESHOLD.coverage.good, THRESHOLD.coverage.watch),
  },
  {
    metricKey: 'admin.thresholds.metric.rcsa',
    bands: ascendingPct(THRESHOLD.completion.good, THRESHOLD.completion.watch),
  },
  {
    metricKey: 'admin.thresholds.metric.overdue',
    bands: descendingCount(THRESHOLD.overdue.good, THRESHOLD.overdue.watch),
  },
  {
    metricKey: 'admin.thresholds.metric.openCritical',
    bands: descendingCount(THRESHOLD.openCritical.good, THRESHOLD.openCritical.watch),
  },
  {
    metricKey: 'admin.thresholds.metric.highRisks',
    bands: descendingCount(THRESHOLD.highRisks.good, THRESHOLD.highRisks.watch),
  },
];

/**
 * dc.html:4730 — access recertification bands at 90/60.
 *
 * Deliberately NOT THRESHOLD.completion (90/70). Recertifying who holds a role
 * and completing an RCSA cycle are different measurements; sharing a constant
 * because both happen to be percentages would redefine one of them by accident.
 */
const REVIEW_GOOD = 90;
const REVIEW_WATCH = 60;

/* ── grid templates, copied from the fragment ─────────────────────────────── */

/** Fragment :31,:36 */
const PERM_COLS = '210px repeat(6,minmax(0,1fr))';
/** Fragment :58,:62 */
const ACCESS_COLS = '92px minmax(0,1.1fr) minmax(0,1.5fr) 118px 116px';
/** Fragment :88 */
const POLICY_COLS = '190px minmax(0,1fr)';
/** Fragment :105,:109 */
const REPORT_COLS = 'minmax(0,1.6fr) minmax(0,1.3fr) 116px 108px 104px 104px';
/** Fragment :123 */
const EXPORT_COLS = 'minmax(0,2fr) 150px 150px 96px 104px';
/** Fragment :140,:144 */
const NOTIFY_COLS = 'minmax(0,1.4fr) minmax(0,1.6fr) 150px 128px 70px';
/** Fragment :161,:165 */
const RETENTION_COLS = 'minmax(0,1.4fr) 170px minmax(0,1.4fr) 150px 170px';

export default function AdminPage() {
  const { tr, trf, scopeCode } = useShell();
  const [section, setSection] = useState<AdminSectionKey>(DEFAULT_ADMIN_SECTION);

  // Seeded from the fixture and held in memory only. admin.notPersisted says so
  // on screen — a settings toggle that forgets without admitting it is the
  // dishonest kind of mock, and no browser storage may hold platform state.
  const [notify, setNotify] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notifyRules.map((n) => [n.ev, n.on])),
  );

  const accessPending = accessRequests.filter((a) => a.status === 'Pending').length;
  const connected = INTEGRATIONS.filter((i) => i.connected).length;

  return (
    <div data-screen-label="Admin — settings">
      <DemoBadge />

      <div style={{ marginBottom: '16px' }}>
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
          {tr('admin.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('admin.title')}
        </h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '210px 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* ── section list ─────────────────────────────────────────────── */}
        <div
          style={{
            ...CARD,
            padding: '8px',
            position: 'sticky',
            top: '78px',
          }}
        >
          {ADMIN_SECTIONS.map((s, i, arr) => {
            const on = section === s.key;
            // dc.html:5086 computes the heading from the neighbouring row rather
            // than storing it, so a reorder can never print a group twice.
            const newGrp = i === 0 || arr[i - 1]?.groupKey !== s.groupKey;
            return (
              <div key={s.key}>
                {newGrp && (
                  <div
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      letterSpacing: '.6px',
                      textTransform: 'uppercase',
                      color: 'var(--text-3)',
                      padding: '10px 11px 5px',
                    }}
                  >
                    {tr(s.groupKey)}
                  </div>
                )}
                {/* A <div onClick> in the fragment; a button here so the list is
                    operable by keyboard. No design value changes — the extra
                    declarations are button resets, not styling. */}
                <button
                  type="button"
                  onClick={() => setSection(s.key)}
                  aria-pressed={on}
                  data-hov="s3"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '9px 11px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: on ? 700 : 500,
                    color: on ? 'var(--primary-ink)' : 'var(--text-2)',
                    background: on ? 'var(--primary-tint)' : 'transparent',
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: 'inherit',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  {tr(s.labelKey)}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {/* ── permissions ─────────────────────────────────────────────── */}
          {section === 'permissions' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={CARD_HEAD}>
                <div style={CARD_TITLE}>{tr('admin.perm.title')}</div>
                <div style={CARD_SUB}>{tr('admin.perm.sub')}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div
                  style={{
                    ...TH,
                    display: 'grid',
                    gridTemplateColumns: PERM_COLS,
                    minWidth: '820px',
                    gap: '8px',
                    padding: '9px 18px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{tr('admin.perm.col.module')}</span>
                  {ROLES.map((r) => (
                    <span key={r} style={{ textAlign: 'center' }}>
                      {tr(ROLE_LABEL[r])}
                    </span>
                  ))}
                </div>
                {permMatrix.map((row) => (
                  <div
                    key={row.mod}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: PERM_COLS,
                      minWidth: '820px',
                      gap: '8px',
                      padding: '9px 18px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{row.mod}</span>
                    {row.p.map((c, i) => {
                      const lvl = permLevel(c);
                      return (
                        <span
                          key={`${row.mod}-${ROLES[i] ?? i}`}
                          style={{
                            justifySelf: 'center',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '22px',
                            minWidth: '62px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            background: lvl.bg,
                            color: lvl.ink,
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          {tr(lvl.labelKey)}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 18px',
                  background: 'var(--surface-2)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
                  {tr('admin.perm.legend')}
                </span>
                {PERM_LEGEND.map((code) => {
                  const lvl = permLevel(code);
                  return (
                    <span
                      key={code}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '20px',
                        padding: '0 8px',
                        borderRadius: '5px',
                        background: lvl.bg,
                        color: lvl.ink,
                        fontSize: '10.5px',
                        fontWeight: 700,
                      }}
                    >
                      {tr(lvl.labelKey)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── access management ───────────────────────────────────────── */}
          {section === 'access' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={CARD_HEAD}>
                  <div style={CARD_TITLE}>{tr('admin.access.title')}</div>
                  <div style={CARD_SUB}>{trf('admin.access.sub', { n: accessPending })}</div>
                </div>
                <div
                  style={{
                    ...TH,
                    display: 'grid',
                    gridTemplateColumns: ACCESS_COLS,
                    gap: '12px',
                    padding: '9px 18px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{tr('admin.access.col.ref')}</span>
                  <span>{tr('admin.access.col.requester')}</span>
                  <span>{tr('admin.access.col.ask')}</span>
                  <span>{tr('admin.access.col.approver')}</span>
                  <span>{tr('admin.access.col.status')}</span>
                </div>
                {accessRequests.map((a) => {
                  const st = ACCESS_STATUS[a.status] ?? ACCESS_STATUS.Pending!;
                  const t = tok(st.rating);
                  return (
                    <div
                      key={a.ref}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: ACCESS_COLS,
                        gap: '12px',
                        padding: '11px 18px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        fontSize: '12.5px',
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
                        {a.ref}
                      </span>
                      <span>
                        <b style={{ display: 'block', fontWeight: 600 }}>{a.who}</b>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10.5px',
                            color: 'var(--text-3)',
                            fontFamily: 'var(--mono)',
                            marginTop: '2px',
                          }}
                        >
                          {a.opco} · {a.raised}
                        </span>
                      </span>
                      <span>
                        <b style={{ display: 'block', fontWeight: 600, lineHeight: 1.35 }}>
                          {a.ask}
                        </b>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10.5px',
                            color: 'var(--text-3)',
                            marginTop: '2px',
                            lineHeight: 1.45,
                            textWrap: 'pretty',
                          }}
                        >
                          {a.reason}
                        </span>
                      </span>
                      <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{a.appr}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: t.ink,
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: t.dot,
                          }}
                        />
                        {tr(st.key)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={CARD_HEAD}>
                  <div style={CARD_TITLE}>{tr('admin.reviews.title')}</div>
                  <div style={CARD_SUB}>{tr('admin.reviews.sub')}</div>
                </div>
                {accessReviews.map((c) => {
                  const pct = Math.round((c.done / c.total) * 100);
                  const t = tok(pct >= REVIEW_GOOD ? 'G' : pct >= REVIEW_WATCH ? 'A' : 'R');
                  return (
                    <div
                      key={c.camp}
                      style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '14px',
                          flexWrap: 'wrap',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{c.camp}</div>
                          <div
                            style={{
                              fontSize: '10.5px',
                              color: 'var(--text-3)',
                              marginTop: '2px',
                            }}
                          >
                            {trf('admin.reviews.meta', {
                              scope: c.scope,
                              owner: c.owner,
                              due: c.due,
                            })}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: t.ink,
                            fontFamily: 'var(--mono)',
                          }}
                        >
                          {trf('admin.reviews.progress', {
                            done: c.done,
                            total: c.total,
                            pct,
                          })}
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
                            width: `${pct}%`,
                            background: t.dot,
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={CARD_HEAD}>
                  <div style={CARD_TITLE}>{tr('admin.session.title')}</div>
                  <div style={CARD_SUB}>{tr('admin.session.sub')}</div>
                </div>
                {sessionPolicy.map((p) => (
                  <div
                    key={p.k}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: POLICY_COLS,
                      gap: '16px',
                      padding: '11px 18px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '12.5px',
                    }}
                  >
                    <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{p.k}</span>
                    <span style={{ color: 'var(--text-2)', lineHeight: 1.5, textWrap: 'pretty' }}>
                      {p.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── reporting & exports ─────────────────────────────────────── */}
          {section === 'reporting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div
                  style={{
                    ...CARD_HEAD,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={CARD_TITLE}>{tr('admin.report.title')}</div>
                    <div style={CARD_SUB}>{tr('admin.report.sub')}</div>
                  </div>
                  <button
                    type="button"
                    disabled
                    title={tr('admin.inert')}
                    style={{ ...BTN_PRIMARY, ...INERT }}
                  >
                    {tr('admin.report.new')}
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <div
                    style={{
                      ...TH,
                      display: 'grid',
                      gridTemplateColumns: REPORT_COLS,
                      minWidth: '840px',
                      gap: '12px',
                      padding: '9px 18px',
                      background: 'var(--surface-2)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span>{tr('admin.report.col.report')}</span>
                    <span>{tr('admin.report.col.audience')}</span>
                    <span>{tr('admin.report.col.frequency')}</span>
                    <span>{tr('admin.report.col.next')}</span>
                    <span>{tr('admin.report.col.format')}</span>
                    <span>{tr('admin.report.col.status')}</span>
                  </div>
                  {reportLibrary.map((r) => {
                    const st = REPORT_STATUS[r.status] ?? REPORT_STATUS.Manual!;
                    const t = tok(st.rating);
                    return (
                      <div
                        key={r.name}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: REPORT_COLS,
                          minWidth: '840px',
                          gap: '12px',
                          padding: '11px 18px',
                          borderBottom: '1px solid var(--border)',
                          alignItems: 'center',
                          fontSize: '12.5px',
                        }}
                      >
                        <span>
                          <b style={{ display: 'block', fontWeight: 600, lineHeight: 1.35 }}>
                            {r.name}
                          </b>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '10.5px',
                              color: 'var(--text-3)',
                              marginTop: '2px',
                            }}
                          >
                            {trf('admin.report.owner', { name: r.owner })}
                          </span>
                        </span>
                        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{r.aud}</span>
                        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{r.freq}</span>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '11px',
                            color: 'var(--text-2)',
                          }}
                        >
                          {r.next}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '11px',
                            color: 'var(--text-2)',
                          }}
                        >
                          {r.fmt}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '21px',
                            padding: '0 9px',
                            borderRadius: '6px',
                            background: t.bg,
                            color: t.ink,
                            fontSize: '11px',
                            fontWeight: 600,
                            justifySelf: 'start',
                          }}
                        >
                          {tr(st.key)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={CARD_HEAD}>
                  <div style={CARD_TITLE}>{tr('admin.exports.title')}</div>
                  <div style={CARD_SUB}>{tr('admin.exports.sub')}</div>
                </div>
                {RECENT_EXPORTS.map((e) => (
                  <div
                    key={e.file}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: EXPORT_COLS,
                      gap: '12px',
                      padding: '11px 18px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      fontSize: '12.5px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11.5px',
                        wordBreak: 'break-all',
                      }}
                    >
                      {e.file}
                    </span>
                    <span style={{ color: 'var(--text-2)' }}>{e.by}</span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: 'var(--text-3)',
                      }}
                    >
                      {e.when}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: 'var(--text-3)',
                      }}
                    >
                      {e.size}
                    </span>
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
                        justifySelf: 'start',
                      }}
                    >
                      {e.cls}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── notifications & escalation ──────────────────────────────── */}
          {section === 'notifications' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={CARD_HEAD}>
                <div style={CARD_TITLE}>{tr('admin.notify.title')}</div>
                <div style={CARD_SUB}>{tr('admin.notify.sub')}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div
                  style={{
                    ...TH,
                    display: 'grid',
                    gridTemplateColumns: NOTIFY_COLS,
                    minWidth: '860px',
                    gap: '12px',
                    padding: '9px 18px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{tr('admin.notify.col.event')}</span>
                  <span>{tr('admin.notify.col.recipients')}</span>
                  <span>{tr('admin.notify.col.channel')}</span>
                  <span>{tr('admin.notify.col.timing')}</span>
                  <span>{tr('admin.notify.col.state')}</span>
                </div>
                {notifyRules.map((n) => {
                  const on = notify[n.ev] ?? false;
                  return (
                    <div
                      key={n.ev}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: NOTIFY_COLS,
                        minWidth: '860px',
                        gap: '12px',
                        padding: '11px 18px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        fontSize: '12.5px',
                      }}
                    >
                      <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{n.ev}</span>
                      <span
                        style={{
                          color: 'var(--text-2)',
                          fontSize: '12px',
                          lineHeight: 1.45,
                          textWrap: 'pretty',
                        }}
                      >
                        {n.to}
                      </span>
                      <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{n.ch}</span>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--text-2)',
                        }}
                      >
                        {n.sla}
                      </span>
                      {/* A <span> in the fragment; a role=switch button here so
                          the control is operable and announced. The knob values
                          are dc.html:4738's, unchanged. */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${n.ev} — ${tr(on ? 'admin.notify.state.on' : 'admin.notify.state.off')}`}
                        onClick={() => setNotify((prev) => ({ ...prev, [n.ev]: !on }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          width: '38px',
                          height: '21px',
                          borderRadius: '11px',
                          padding: '2px',
                          background: on ? 'var(--rag-g)' : 'var(--border-strong)',
                          justifyContent: on ? 'flex-end' : 'flex-start',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            background: '#fff',
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── records & retention ─────────────────────────────────────── */}
          {section === 'retention' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div style={CARD_HEAD}>
                <div style={CARD_TITLE}>{tr('admin.retention.title')}</div>
                <div style={CARD_SUB}>{tr('admin.retention.sub')}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div
                  style={{
                    ...TH,
                    display: 'grid',
                    gridTemplateColumns: RETENTION_COLS,
                    minWidth: '900px',
                    gap: '12px',
                    padding: '9px 18px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>{tr('admin.retention.col.class')}</span>
                  <span>{tr('admin.retention.col.keep')}</span>
                  <span>{tr('admin.retention.col.basis')}</span>
                  <span>{tr('admin.retention.col.hold')}</span>
                  <span>{tr('admin.retention.col.disposal')}</span>
                </div>
                {retention.map((r) => (
                  <div
                    key={r.cls}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: RETENTION_COLS,
                      minWidth: '900px',
                      gap: '12px',
                      padding: '11px 18px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      fontSize: '12.5px',
                    }}
                  >
                    <span style={{ fontWeight: 600, lineHeight: 1.35 }}>{r.cls}</span>
                    <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{r.keep}</span>
                    <span
                      style={{
                        color: 'var(--text-2)',
                        fontSize: '12px',
                        lineHeight: 1.45,
                        textWrap: 'pretty',
                      }}
                    >
                      {r.basis}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: r.hold === '—' ? 'var(--text-3)' : 'var(--rag-a-ink)',
                      }}
                    >
                      {r.hold}
                    </span>
                    <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{r.disp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RAG thresholds ──────────────────────────────────────────── */}
          {section === 'thresholds' && (
            <div style={{ ...CARD, padding: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>
                {tr('admin.thresholds.title')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>
                {tr('admin.thresholds.sub')}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th
                        style={{
                          ...TH,
                          fontSize: '10.5px',
                          textAlign: 'left',
                          padding: '9px 14px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr('admin.thresholds.col.metric')}
                      </th>
                      <th
                        style={{
                          ...TH,
                          fontSize: '10.5px',
                          textAlign: 'left',
                          padding: '9px 14px',
                          color: 'var(--rag-g-ink)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr('admin.thresholds.col.green')}
                      </th>
                      <th
                        style={{
                          ...TH,
                          fontSize: '10.5px',
                          textAlign: 'left',
                          padding: '9px 14px',
                          color: 'var(--rag-a-ink)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr('admin.thresholds.col.amber')}
                      </th>
                      <th
                        style={{
                          ...TH,
                          fontSize: '10.5px',
                          textAlign: 'left',
                          padding: '9px 14px',
                          color: 'var(--rag-r-ink)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr('admin.thresholds.col.red')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {THRESHOLD_ROWS.map((row) => (
                      <tr key={row.metricKey} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: 'var(--text)',
                          }}
                        >
                          {tr(row.metricKey)}
                        </td>
                        {(['G', 'A', 'R'] as const).map((letter) => {
                          const band =
                            letter === 'G'
                              ? row.bands.g
                              : letter === 'A'
                                ? row.bands.a
                                : row.bands.r;
                          const t = tok(letter);
                          return (
                            <td key={letter} style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: t.bg,
                                  color: t.ink,
                                  fontFamily: 'var(--mono)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {trf(band.key, band.vars)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                {tr('admin.thresholds.source')}
              </div>
            </div>
          )}

          {/* ── entities & jurisdictions ────────────────────────────────── */}
          {section === 'entities' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div
                style={{
                  ...CARD_HEAD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={CARD_TITLE}>{tr('admin.entities.title')}</div>
                  <div style={CARD_SUB}>
                    {trf('admin.entities.sub', {
                      e: entityPosture.length,
                      j: jurisdictionCount,
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled
                  title={tr('admin.inert')}
                  style={{ ...BTN_PRIMARY, ...INERT }}
                >
                  {tr('admin.entities.add')}
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th
                      style={{
                        ...TH_CELL,
                        padding: '9px 18px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.entities.col.entity')}
                    </th>
                    <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                      {tr('admin.entities.col.jurisdiction')}
                    </th>
                    <th
                      style={{
                        ...TH_CELL,
                        textAlign: 'center',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.entities.col.risks')}
                    </th>
                    <th
                      style={{
                        ...TH_CELL,
                        textAlign: 'center',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.entities.col.high')}
                    </th>
                    <th
                      style={{
                        ...TH_CELL,
                        textAlign: 'center',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.entities.col.coverage')}
                    </th>
                    <th
                      style={{
                        ...TH_CELL,
                        padding: '9px 18px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.entities.col.posture')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entityPosture.map((e) => {
                    const ov = tok(e.overall);
                    return (
                      <tr key={e.code} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '11px 18px' }}>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}
                          >
                            <span
                              style={{
                                width: '26px',
                                height: '19px',
                                borderRadius: '5px',
                                background: 'var(--surface-3)',
                                border: '1px solid var(--border)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: 700,
                                fontFamily: 'var(--mono)',
                                color: 'var(--text-2)',
                              }}
                            >
                              {e.flag}
                            </span>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 600,
                                color: 'var(--text)',
                              }}
                            >
                              {e.name}
                            </span>
                            {/* Not in the fragment. The admin registry is
                                legitimately cross-entity, so it is not filtered
                                by the topbar — but leaving no trace of the
                                current scope would make the selector look like
                                it does nothing here. */}
                            {e.code === scopeCode && (
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  letterSpacing: '.4px',
                                  textTransform: 'uppercase',
                                  color: 'var(--primary-ink)',
                                  background: 'var(--primary-tint)',
                                  borderRadius: '5px',
                                  padding: '2px 6px',
                                }}
                              >
                                {tr('admin.entities.selected')}
                              </span>
                            )}
                          </span>
                        </td>
                        <td
                          style={{ padding: '11px 12px', fontSize: '12px', color: 'var(--text-2)' }}
                        >
                          {e.juris}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '11px 12px',
                            fontSize: '12.5px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {e.risks}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '11px 12px',
                            fontSize: '12.5px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {e.high}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: '11px 12px',
                            fontSize: '12.5px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-2)',
                          }}
                        >
                          {`${e.cov}%`}
                        </td>
                        <td style={{ padding: '11px 18px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              background: ov.bg,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: ov.dot,
                              }}
                            />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: ov.ink }}>
                              {tr(
                                e.overall === 'R'
                                  ? 'rag.critical'
                                  : e.overall === 'A'
                                    ? 'rag.watch'
                                    : 'rag.good',
                              )}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── users & roles ───────────────────────────────────────────── */}
          {section === 'users' && (
            <>
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div
                  style={{
                    ...CARD_HEAD,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={CARD_TITLE}>{tr('admin.users.title')}</div>
                    <div style={CARD_SUB}>{trf('admin.users.sub', { n: ADMIN_USERS.length })}</div>
                  </div>
                  <button
                    type="button"
                    disabled
                    title={tr('admin.inert')}
                    style={{ ...BTN_PRIMARY, ...INERT }}
                  >
                    {tr('admin.users.invite')}
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th
                        style={{
                          ...TH_CELL,
                          padding: '9px 18px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr('admin.users.col.user')}
                      </th>
                      <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                        {tr('admin.users.col.role')}
                      </th>
                      <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                        {tr('admin.users.col.scope')}
                      </th>
                      <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                        {tr('admin.users.col.last')}
                      </th>
                      <th
                        style={{
                          ...TH_CELL,
                          padding: '9px 18px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr('admin.users.col.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADMIN_USERS.map((u) => {
                      const st = USER_STATUS[u.status];
                      const t = tok(st.rating);
                      const home = opcos.find((o) => o.code === u.scope);
                      return (
                        <tr key={u.email} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '11px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px',
                              }}
                            >
                              <span
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background:
                                    'linear-gradient(135deg,var(--primary),var(--primary-ink))',
                                  color: '#fff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {u.initials}
                              </span>
                              <span>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: 'var(--text)',
                                  }}
                                >
                                  {u.name}
                                </span>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: '10.5px',
                                    color: 'var(--text-3)',
                                    fontFamily: 'var(--mono)',
                                  }}
                                >
                                  {u.email}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '11px 12px',
                              fontSize: '12px',
                              color: 'var(--text-2)',
                            }}
                          >
                            {tr(u.roleKey)}
                          </td>
                          <td
                            style={{
                              padding: '11px 12px',
                              fontSize: '12px',
                              color: 'var(--text-2)',
                            }}
                          >
                            {home ? `${home.code} · ${home.country}` : tr('admin.users.scope.apac')}
                          </td>
                          <td
                            style={{
                              padding: '11px 12px',
                              fontSize: '11.5px',
                              color: 'var(--text-3)',
                            }}
                          >
                            {tr(u.lastKey)}
                          </td>
                          <td style={{ padding: '11px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: t.bg,
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: t.dot,
                                }}
                              />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: t.ink }}>
                                {tr(st.key)}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ ...CARD, padding: '18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
                  {tr('admin.roles.title')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ROLE_KEYS.map((roleKey) => {
                    // Counted, not stated. The mockup's per-role totals were
                    // written beside a directory that did not contain them.
                    const count = ADMIN_USERS.filter((u) => u.roleKey === roleKey).length;
                    return (
                      <div
                        key={roleKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '11px 13px',
                          border: '1px solid var(--border)',
                          borderRadius: '9px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: 'var(--text)',
                            }}
                          >
                            {tr(roleKey)}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: 'var(--text-3)',
                              marginTop: '1px',
                            }}
                          >
                            {tr(ROLE_DESC[roleKey])}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 600,
                            color: 'var(--text-2)',
                            background: 'var(--surface-3)',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            flexShrink: 0,
                          }}
                        >
                          {trf('admin.roles.count', { n: count })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── risk taxonomy ───────────────────────────────────────────── */}
          {section === 'taxonomy' && (
            <div style={{ ...CARD, padding: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div style={CARD_TITLE}>{tr('admin.taxonomy.title')}</div>
                  <div style={CARD_SUB}>{trf('admin.taxonomy.sub', { n: TAXONOMY.length })}</div>
                </div>
                <button
                  type="button"
                  disabled
                  title={tr('admin.inert')}
                  style={{ ...BTN_GHOST, ...INERT }}
                >
                  {tr('admin.taxonomy.edit')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {TAXONOMY.map((tx) => (
                  <div
                    key={tx.cat}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '13px 15px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <IconTaxonomy
                        width="16"
                        height="16"
                        stroke="var(--primary)"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      />
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--text)',
                          flex: 1,
                        }}
                      >
                        {tx.cat}
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--mono)',
                          fontWeight: 600,
                          color: 'var(--text-2)',
                          background: 'var(--surface-3)',
                          borderRadius: '20px',
                          padding: '3px 10px',
                        }}
                      >
                        {trf('admin.taxonomy.risks', { n: tx.n })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                      {tx.subs.map((sub) => (
                        <span
                          key={sub}
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--text-2)',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            borderRadius: '7px',
                            padding: '5px 10px',
                          }}
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── integrations ────────────────────────────────────────────── */}
          {section === 'integrations' && (
            <div style={{ ...CARD, padding: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div style={CARD_TITLE}>{tr('admin.integrations.title')}</div>
                  <div style={CARD_SUB}>{trf('admin.integrations.sub', { n: connected })}</div>
                </div>
                <button
                  type="button"
                  disabled
                  title={tr('admin.inert')}
                  style={{ ...BTN_GHOST, ...INERT }}
                >
                  {tr('admin.integrations.apiKeys')}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
                {INTEGRATIONS.map((ig) => {
                  const t = tok(ig.connected ? 'G' : 'N');
                  return (
                    <div
                      key={ig.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '13px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: 'var(--surface-3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--mono)',
                          color: 'var(--text-2)',
                          flexShrink: 0,
                        }}
                      >
                        {ig.init}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                          {ig.name}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                          {trf('admin.integrations.meta', { cat: ig.cat, sync: ig.sync })}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: '6px',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: t.ink,
                            background: t.bg,
                            borderRadius: '20px',
                            padding: '2px 8px',
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: t.dot,
                            }}
                          />
                          {tr(
                            ig.connected
                              ? 'admin.integrations.status.connected'
                              : 'admin.integrations.status.available',
                          )}
                        </span>
                        <button
                          type="button"
                          disabled
                          title={tr('admin.inert')}
                          style={{
                            height: '26px',
                            padding: '0 10px',
                            border: `1px solid ${ig.connected ? 'var(--border-strong)' : 'var(--primary)'}`,
                            borderRadius: '7px',
                            background: ig.connected ? 'var(--surface)' : 'var(--primary)',
                            color: ig.connected ? 'var(--text-2)' : '#fff',
                            fontFamily: 'inherit',
                            fontSize: '11px',
                            fontWeight: 600,
                            ...INERT,
                          }}
                        >
                          {tr(
                            ig.connected
                              ? 'admin.integrations.configure'
                              : 'admin.integrations.connect',
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── audit log ───────────────────────────────────────────────── */}
          {section === 'audit' && (
            <div style={{ ...CARD, overflow: 'hidden' }}>
              <div
                style={{
                  ...CARD_HEAD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <IconLock
                    width="17"
                    height="17"
                    stroke="var(--text-2)"
                    strokeWidth="1.7"
                    aria-hidden="true"
                  />
                  <div>
                    <div style={CARD_TITLE}>{tr('admin.audit.title')}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                      {tr('admin.audit.sub')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
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
                    <IconShieldOutline
                      width="11"
                      height="11"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    />
                    {tr('admin.audit.tamperEvident')}
                  </span>
                  <button
                    type="button"
                    disabled
                    title={tr('admin.inert')}
                    style={{ ...BTN_GHOST, height: '30px', ...INERT }}
                  >
                    {tr('admin.audit.export')}
                  </button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th
                      style={{
                        ...TH_CELL,
                        padding: '9px 18px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.audit.col.timestamp')}
                    </th>
                    <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                      {tr('admin.audit.col.actor')}
                    </th>
                    <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                      {tr('admin.audit.col.action')}
                    </th>
                    <th style={{ ...TH_CELL, borderBottom: '1px solid var(--border)' }}>
                      {tr('admin.audit.col.object')}
                    </th>
                    <th
                      style={{
                        ...TH_CELL,
                        padding: '9px 18px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('admin.audit.col.ip')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEM_AUDIT.map((al) => (
                    <tr
                      key={`${al.ts}-${al.object}`}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        style={{
                          padding: '10px 18px',
                          fontSize: '11.5px',
                          fontFamily: 'var(--mono)',
                          color: 'var(--text-2)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {al.ts}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: AUDIT_DOT[al.dot],
                            }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
                            {al.actor}
                          </span>
                        </span>
                      </td>
                      <td
                        style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-2)' }}
                      >
                        {al.action}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontSize: '11.5px',
                          fontFamily: 'var(--mono)',
                          color: 'var(--primary-ink)',
                          fontWeight: 600,
                        }}
                      >
                        {al.object}
                      </td>
                      <td
                        style={{
                          padding: '10px 18px',
                          fontSize: '11px',
                          fontFamily: 'var(--mono)',
                          color: 'var(--text-3)',
                        }}
                      >
                        {al.ip}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Not in the fragment. An administration screen whose controls do not
              persist, and whose write actions cannot run, has to say both out
              loud — see verification-discipline.md on honest mocks. */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-3)',
              lineHeight: 1.6,
              textWrap: 'pretty',
            }}
          >
            <span>{tr('admin.notPersisted')}</span>
            <span>{tr('admin.inert')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
