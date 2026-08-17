'use client';

/**
 * File: apps/web/src/components/shell/AppShell.tsx
 * Purpose: The nav rail + topbar that wraps every screen.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/shell/02-app-shell.html (222 lines — the densest
 *   fragment in the handoff: 33 style-hover, 30 SVG, 31 onClick).
 *
 *   PORT RULES, established here and copied by the 27 screens that follow:
 *
 *   1. inline style="" -> style={{}} with the values UNCHANGED. Not one
 *      number is re-derived. This is the whole point of the playbook's
 *      copy-don't-translate rule.
 *   2. style-hover="" -> data-hov="", resolved by 10 rules in globals.css.
 *      Mechanism changes because inline style cannot express :hover in any
 *      technology; the declarations themselves are character-identical.
 *   3. <sc-if>/<sc-for> -> {cond && ...} / {list.map(...)}.
 *   4. hint-* attributes dropped (fragments/README.md:18), but their
 *      placeholder counts were read first — they say how many rows the
 *      designer intended each list to show.
 *   5. Copy goes through t(), never inline. en holds the fragment's original
 *      wording so fidelity stays checkable; zh-Hant is the default per
 *      guardrail 9.
 *
 *   WHERE THE VALUES COME FROM when the fragment leaves a hole:
 *   the nav item's active style is a {{ nav.x.c }} hole in the fragment, so
 *   it is taken from components.css:118 — the only place it is written down.
 *   Same for the collapsed rail width (components.css:113, 64px).
 *   Layout values are taken from the FRAGMENT, not from components.css: the
 *   two disagree (fragment padding:8px 11px / radius 0 7px 7px 0 / 13px vs
 *   class height:34px / padding:0 12px / radius 8px / 12.5px), and the
 *   fragment is what the design actually renders.
 *
 *   aria-current="page" is added rather than inherited: Day-0 D11 found the
 *   fragments carry zero aria attributes while components.css has three
 *   selectors depending on them. Adding it closes an a11y gap AND is what
 *   makes that rule capable of firing at all.
 *
 * Key Components:
 *   - AppShell: the layout; owns rail collapse, theme, locale and menu state
 *   - NAV: the 13 destinations in their 5 groups, in the fragment's order
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — first ported screen
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/shell/02-app-shell.html
 *   - apps/web/src/app/globals.css (data-hov rules)
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from 'react';

import {
  IconAdmin,
  IconAssessments,
  IconAssistant,
  IconAuditIssues,
  IconBell,
  IconCheck,
  IconChevronLeft,
  IconDashboard,
  IconGlobe,
  IconIncidents,
  IconIsmsProfiles,
  IconIssues,
  IconMoon,
  IconOsPortfolio,
  IconPolicies,
  IconRisk,
  IconRiskOutline,
  IconRiskProgramme,
  IconSearch,
  IconSettings,
  IconShield,
  IconShieldOutline,
  IconSignOut,
  IconSuppliers,
  IconSun,
  IconSwitchRole,
  IconUser,
} from '@/components/icons';
import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { opcos } from '@/data/opcos';
import { LOCALES, t, tf, type Locale } from '@/i18n';
import type { Persona } from '@/lib/personas';
import { tok } from '@/lib/tok';

type IconCmp = ComponentType<SVGProps<SVGSVGElement>>;

type NavEntry = {
  href: string;
  labelKey: string;
  Icon: IconCmp;
  /** Trailing count pill. Undefined = no badge, matching the fragment. */
  badge?: { text: string; bg: string };
};

type NavGroup = { labelKey: string; items: NavEntry[] };

/**
 * The fragment's order and grouping, unchanged.
 *
 * The AI Agent sitting first, above the flagship dashboard, is the handoff's
 * own information architecture (AD-Nav-1) — a Wave 3 capability given top
 * billing. Carried across as designed; the product question of whether it
 * belongs there is not this phase's to answer.
 *
 * The badge counts (Issues 5, Audit issues 5, Incidents 2) are the
 * fragment's literals. AD-Nav-2 records that no spec defines what they
 * count, whose scope, or how often they refresh — so they are DEMO values
 * like everything else on screen.
 */
const NAV: NavGroup[] = [
  {
    labelKey: 'nav.group.intelligence',
    items: [
      {
        href: '/ai-assistant',
        labelKey: 'nav.assistant',
        Icon: IconAssistant,
        badge: { text: 'nav.assistant.badge', bg: 'var(--primary)' },
      },
    ],
  },
  {
    labelKey: 'nav.group.oversight',
    items: [
      { href: '/dashboard', labelKey: 'nav.dashboard', Icon: IconDashboard },
      { href: '/risks', labelKey: 'nav.risks', Icon: IconRisk },
      { href: '/risk-programme', labelKey: 'nav.riskProgramme', Icon: IconRiskProgramme },
      { href: '/controls', labelKey: 'nav.controls', Icon: IconShield },
      { href: '/policies', labelKey: 'nav.policies', Icon: IconPolicies },
      {
        href: '/issues',
        labelKey: 'nav.issues',
        Icon: IconIssues,
        badge: { text: '5', bg: 'var(--rag-r)' },
      },
      { href: '/assessments', labelKey: 'nav.assessments', Icon: IconAssessments },
      {
        href: '/audit-issues',
        labelKey: 'nav.auditIssues',
        Icon: IconAuditIssues,
        badge: { text: '5', bg: 'var(--rag-a)' },
      },
    ],
  },
  {
    labelKey: 'nav.group.operations',
    items: [
      {
        href: '/incidents',
        labelKey: 'nav.incidents',
        Icon: IconIncidents,
        badge: { text: '2', bg: 'var(--rag-r)' },
      },
      { href: '/suppliers', labelKey: 'nav.suppliers', Icon: IconSuppliers },
    ],
  },
  {
    labelKey: 'nav.group.compliance',
    items: [
      { href: '/isms-profiles', labelKey: 'nav.ismsProfiles', Icon: IconIsmsProfiles },
      { href: '/os-portfolio', labelKey: 'nav.osPortfolio', Icon: IconOsPortfolio },
    ],
  },
  {
    labelKey: 'nav.group.system',
    items: [{ href: '/admin', labelKey: 'nav.admin', Icon: IconAdmin }],
  },
];

/** Fragment :111-113 — the segmented period control. */
const PERIODS = ['2026-Q3', '2026-Q2', '2026-Q1', '2025-Q4', 'FY2025'];

/** Fragment :133-135 — three recent records in the search dropdown. */
const RECENT = [
  { id: 'RSK-1042', title: 'Unpatched externally-facing systems' },
  { id: 'ISS-5490', title: 'Cross-border transfer without DPA' },
  { id: 'CTL-2201', title: 'MFA on all administrator accounts' },
];

/** Fragment :153 — hint-placeholder-count="6" said six rows. */
const NOTIFICATIONS = [
  {
    rating: 'R',
    title: 'Control test failed — MFA on administrator accounts',
    meta: 'CTL-2201 · RHK',
    time: '12m',
  },
  { rating: 'A', title: 'Risk RSK-1042 moved to Treatment', meta: 'RSK-1042 · RAP', time: '1h' },
  {
    rating: 'R',
    title: 'Incident INC-0088 raised — phishing campaign',
    meta: 'INC-0088 · RSG',
    time: '3h',
  },
  {
    rating: 'A',
    title: 'Policy review overdue — Acceptable Use',
    meta: 'POL-014 · RMY',
    time: '1d',
  },
  { rating: 'G', title: 'Assessment cycle completed', meta: 'RCSA 2026-Q3 · RAU', time: '2d' },
  { rating: 'N', title: 'Surveillance audit scheduled', meta: 'RTH · 2026-08-08', time: '3d' },
];

type MenuId = 'scope' | 'search' | 'notif' | 'lang' | 'user';

export function AppShell({ children, persona }: { children: ReactNode; persona: Persona }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [locale, setLocale] = useState<Locale>('zh-Hant');
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  // The seat decides the opening scope. A Regional ISO lands on APAC; an OpCo
  // admin lands on their own entity, which is what entity scoping means.
  const [scopeCode, setScopeCode] = useState<string>(persona.scope);
  const [period, setPeriod] = useState<string>(PERIODS[0] ?? '');

  const tr = (key: string) => t(locale, key as Parameters<typeof t>[1]);
  const toggle = (id: MenuId) => setOpenMenu((cur) => (cur === id ? null : id));

  async function signOut() {
    setOpenMenu(null);
    await fetch('/api/demo-session', { method: 'DELETE' }).catch(() => undefined);
    router.push('/login');
    router.refresh();
  }

  // The tokens hang off [data-grc][data-theme] on <html> (tokens.css:7,67),
  // which this component does not render. Without this the toggle would swap
  // its own icon and change nothing else — a button that looks like it works.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // {{ navW }} / {{ navJustify }} / {{ navText }} — the fragment's three
  // collapse-derived holes. 64px is components.css:113.
  const navW = collapsed ? '64px' : '232px';
  const navJustify = collapsed ? 'center' : 'flex-start';
  const navText: React.CSSProperties = collapsed ? { display: 'none' } : {};

  const scopeLabel = scopeCode === 'APAC' ? 'APAC' : scopeCode;
  const scopeEntity = opcos.find((o) => o.code === scopeCode) ?? null;
  const scopeMeta = scopeCode === 'APAC' ? `${opcos.length} OpCo` : (scopeEntity?.country ?? '');

  // What the screens under this shell are allowed to read. Memoised because it
  // is a context value: a fresh object every render would re-render all 27
  // screens on any menu open, which is state they have no interest in.
  const shellState = useMemo<ShellState>(
    () => ({
      locale,
      tr,
      trf: (key: Parameters<typeof tf>[1], vars: Parameters<typeof tf>[2]) => tf(locale, key, vars),
      scopeCode,
      scopeLabel,
      entity: scopeEntity,
      setScope: setScopeCode,
      periodLabel: period,
    }),
    // `tr` and `scopeEntity` are omitted deliberately: both are pure functions
    // of locale / scopeCode, and both are rebuilt every render, so listing them
    // would make the memo a no-op.
    [locale, scopeCode, scopeLabel, period],
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: navW,
          flexShrink: 0,
          background: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          transition: 'width .18s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '17px 18px 16px',
            borderBottom: '1px solid var(--nav-border)',
            justifyContent: navJustify,
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconShield width="17" height="17" stroke="#fff" strokeWidth="1.9" />
          </div>
          <div style={{ lineHeight: 1.15, ...navText }}>
            <div
              style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', letterSpacing: '.2px' }}
            >
              {tr('shell.brand.name')}
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--nav-text-2)', fontWeight: 500 }}>
              {tr('shell.brand.tagline')}
            </div>
          </div>
        </div>

        <nav
          style={{
            padding: '12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            flex: 1,
          }}
        >
          {NAV.map((group, gi) => (
            <div key={group.labelKey} style={{ display: 'contents' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '.7px',
                  color: 'var(--nav-text-2)',
                  padding: gi === 0 ? '8px 10px 6px' : '16px 10px 6px',
                  textTransform: 'uppercase',
                  ...navText,
                }}
              >
                {tr(group.labelKey)}
              </div>
              {group.items.map(({ href, labelKey, Icon, badge }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    title={tr(labelKey)}
                    aria-current={active ? 'page' : undefined}
                    data-hov="nav"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      padding: '8px 11px',
                      borderRadius: '0 7px 7px 0',
                      fontSize: '13px',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      justifyContent: navJustify,
                      // components.css:118 — the fragment leaves this a hole.
                      ...(active
                        ? { background: 'var(--nav-surface)', color: '#fff', fontWeight: 600 }
                        : { color: 'var(--nav-text)' }),
                    }}
                  >
                    <Icon
                      width="18"
                      height="18"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      style={{ flexShrink: 0 }}
                    />
                    <span style={navText}>{tr(labelKey)}</span>
                    {badge && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: badge.text === 'nav.assistant.badge' ? '9.5px' : '10.5px',
                          fontWeight: 700,
                          fontFamily: 'var(--mono)',
                          background: badge.bg,
                          color: '#fff',
                          borderRadius: '10px',
                          padding: badge.text === 'nav.assistant.badge' ? '1px 6px' : '1px 7px',
                          letterSpacing: badge.text === 'nav.assistant.badge' ? '.3px' : undefined,
                          ...navText,
                        }}
                      >
                        {badge.text.startsWith('nav.') ? tr(badge.text) : badge.text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          style={{
            padding: '12px',
            borderTop: '1px solid var(--nav-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: navJustify,
          }}
        >
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', ...navText }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--rag-g)',
                boxShadow: '0 0 0 3px rgba(30,138,92,.18)',
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: '11px', color: 'var(--nav-text-2)', lineHeight: 1.3 }}>
              {tr('shell.env.name')}
              <br />
              <span style={{ color: 'var(--nav-text)' }}>{tr('shell.env.meta')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={tr(collapsed ? 'shell.expand' : 'shell.collapse')}
            data-hov="nav"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              border: '1px solid var(--nav-border)',
              background: 'transparent',
              color: 'var(--nav-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconChevronLeft
              width="16"
              height="16"
              stroke="currentColor"
              strokeWidth="1.9"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }}
            />
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            height: '56px',
            flexShrink: 0,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '0 18px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => toggle('scope')}
              data-hov="s3"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                height: '36px',
                padding: '0 12px',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <IconGlobe width="15" height="15" stroke="var(--primary)" strokeWidth="1.8" />
              <span>{scopeLabel}</span>
              <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{scopeMeta}</span>
              <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>▼</span>
            </button>
            {openMenu === 'scope' && (
              <div
                style={{
                  position: 'absolute',
                  top: '42px',
                  left: 0,
                  width: '264px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 28px rgba(16,24,40,.16)',
                  padding: '6px',
                  zIndex: 40,
                  maxHeight: '420px',
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.6px',
                    color: 'var(--text-3)',
                    padding: '8px 10px 5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {tr('topbar.scope.heading')}
                </div>
                {[
                  { code: 'APAC', label: 'APAC', meta: `${opcos.length} OpCo`, rating: 'A' },
                  ...opcos.map((o) => ({
                    code: o.code,
                    label: o.name,
                    meta: o.country,
                    rating: o.posture,
                  })),
                ].map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      setScopeCode(opt.code);
                      setOpenMenu(null);
                    }}
                    data-hov="s3"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '7px',
                      background: scopeCode === opt.code ? 'var(--primary-tint)' : 'transparent',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: tok(opt.rating).dot,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, fontWeight: scopeCode === opt.code ? 600 : 500 }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{opt.meta}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'var(--surface-3)',
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  height: '28px',
                  padding: '0 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: period === p ? 'var(--surface)' : 'transparent',
                  color: period === p ? 'var(--text)' : 'var(--text-3)',
                  fontFamily: 'var(--mono)',
                  fontSize: '12px',
                  fontWeight: period === p ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', minWidth: '230px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px',
                padding: '0 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface-2)',
              }}
            >
              <IconSearch width="15" height="15" stroke="var(--text-3)" strokeWidth="1.8" />
              <input
                onFocus={() => setOpenMenu('search')}
                placeholder={tr('topbar.search.placeholder')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  color: 'var(--text)',
                  width: '100%',
                }}
              />
              <span
                style={{
                  fontSize: '10.5px',
                  color: 'var(--text-3)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  fontFamily: 'var(--mono)',
                }}
              >
                ⌘K
              </span>
            </div>
            {openMenu === 'search' && (
              <div
                style={{
                  position: 'absolute',
                  top: '42px',
                  left: 0,
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 32px rgba(16,24,40,.18)',
                  padding: '8px',
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.6px',
                    color: 'var(--text-3)',
                    padding: '6px 10px 5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {tr('topbar.search.quickNav')}
                </div>
                {(
                  [
                    { href: '/risks', key: 'topbar.search.goRisks', Icon: IconRiskOutline },
                    { href: '/controls', key: 'topbar.search.goControls', Icon: IconShieldOutline },
                    { href: '/issues', key: 'topbar.search.goIssues', Icon: IconIssues },
                  ] as const
                ).map(({ href, key, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpenMenu(null)}
                    data-hov="s3"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '7px',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      textDecoration: 'none',
                    }}
                  >
                    <Icon width="15" height="15" stroke="var(--text-3)" strokeWidth="1.7" />
                    {tr(key)}
                  </Link>
                ))}
                <div style={{ height: '1px', background: 'var(--border)', margin: '6px 4px' }} />
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.6px',
                    color: 'var(--text-3)',
                    padding: '4px 10px 5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {tr('topbar.search.recent')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {RECENT.map((r) => (
                    <div
                      key={r.id}
                      data-hov="s3"
                      style={{
                        padding: '7px 10px',
                        borderRadius: '7px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                        cursor: 'pointer',
                      }}
                    >
                      <b
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          color: 'var(--primary-ink)',
                        }}
                      >
                        {r.id}
                      </b>{' '}
                      · {r.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => toggle('notif')}
              data-hov="s3"
              style={{
                width: '36px',
                height: '36px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface)',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconBell width="17" height="17" stroke="var(--text-2)" strokeWidth="1.7" />
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  minWidth: '15px',
                  height: '15px',
                  padding: '0 3px',
                  borderRadius: '8px',
                  background: 'var(--rag-r)',
                  border: '1.5px solid var(--surface)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {NOTIFICATIONS.length}
              </span>
            </button>
            {openMenu === 'notif' && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '340px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 36px rgba(16,24,40,.2)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '13px 15px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>
                    {tr('topbar.notifications')}
                  </div>
                  <button
                    type="button"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--primary-ink)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tr('topbar.notifications.markAllRead')}
                  </button>
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {NOTIFICATIONS.map((n) => (
                    <div
                      key={n.meta}
                      data-hov="s2"
                      style={{
                        display: 'flex',
                        gap: '11px',
                        padding: '11px 15px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: tok(n.rating).dot,
                          flexShrink: 0,
                          marginTop: '4px',
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            lineHeight: 1.35,
                          }}
                        >
                          {n.title}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-3)',
                            fontFamily: 'var(--mono)',
                            marginTop: '2px',
                          }}
                        >
                          {n.meta}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: 'var(--text-3)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {n.time}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/issues"
                  onClick={() => setOpenMenu(null)}
                  style={{
                    width: '100%',
                    display: 'block',
                    padding: '11px',
                    border: 'none',
                    background: 'var(--surface-2)',
                    color: 'var(--primary-ink)',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  {tr('topbar.notifications.viewAll')}
                </Link>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => toggle('lang')}
              data-hov="s3"
              style={{
                height: '36px',
                padding: '0 10px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-2)',
              }}
            >
              <IconGlobe width="15" height="15" stroke="currentColor" strokeWidth="1.7" />
              {locale === 'zh-Hant' ? '繁中' : 'EN'}{' '}
              <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>▼</span>
            </button>
            {openMenu === 'lang' && (
              <div
                style={{
                  position: 'absolute',
                  top: '44px',
                  right: 0,
                  width: '220px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 32px rgba(16,24,40,.18)',
                  padding: '6px',
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.6px',
                    color: 'var(--text-3)',
                    padding: '7px 10px 5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {tr('topbar.language')}
                </div>
                {LOCALES.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLocale(l);
                      setOpenMenu(null);
                    }}
                    data-hov="s3"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '7px',
                      background: locale === l ? 'var(--primary-tint)' : 'transparent',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ flex: 1 }}>
                      {t(l, `locale.${l}` as Parameters<typeof t>[1])}
                    </span>
                    {locale === l && (
                      <IconCheck width="15" height="15" stroke="var(--primary)" strokeWidth="2.4" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setTheme((x) => (x === 'light' ? 'dark' : 'light'))}
            title={tr(theme === 'light' ? 'topbar.theme.toDark' : 'topbar.theme.toLight')}
            data-hov="s3"
            style={{
              width: '36px',
              height: '36px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-2)',
            }}
          >
            {theme === 'dark' ? (
              <IconSun width="17" height="17" stroke="currentColor" strokeWidth="1.7" />
            ) : (
              <IconMoon width="16" height="16" stroke="currentColor" strokeWidth="1.7" />
            )}
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => toggle('user')}
              data-hov="op85"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                height: '38px',
                padding: '0 6px 0 4px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,var(--primary),var(--primary-ink))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11.5px',
                  fontWeight: 700,
                }}
              >
                {persona.initials}
              </span>
              <span style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {persona.name}
                </span>
                <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-3)' }}>
                  {tr(persona.roleKey)}
                </span>
              </span>
              <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>▼</span>
            </button>
            {openMenu === 'user' && (
              <div
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '250px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '11px',
                  boxShadow: '0 12px 36px rgba(16,24,40,.2)',
                  zIndex: 50,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '14px 15px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg,var(--primary),var(--primary-ink))',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {persona.initials}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{persona.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{persona.email}</div>
                  </div>
                </div>
                <div style={{ padding: '6px' }}>
                  {(
                    [
                      { href: '/my-profile', key: 'user.myProfile', Icon: IconUser },
                      { href: '/preferences', key: 'user.preferences', Icon: IconSettings },
                      { href: '/switch-entity-role', key: 'user.switchRole', Icon: IconSwitchRole },
                    ] as const
                  ).map(({ href, key, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpenMenu(null)}
                      data-hov="s3"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '7px',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: 'var(--text)',
                        cursor: 'pointer',
                        textDecoration: 'none',
                      }}
                    >
                      <Icon width="15" height="15" stroke="var(--text-3)" strokeWidth="1.7" />
                      {tr(key)}
                    </Link>
                  ))}
                  <div style={{ height: '1px', background: 'var(--border)', margin: '5px 4px' }} />
                  {/* A link to /login would leave the cookie set, so the next
                      visit walks straight back in — a sign-out that does not
                      sign anything out. It has to clear the session first. */}
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    data-hov="r-bg"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '7px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--rag-r-ink)',
                      cursor: 'pointer',
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <IconSignOut width="15" height="15" stroke="currentColor" strokeWidth="1.7" />
                    {tr('user.signOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 40px' }}>
          <ShellStateContext.Provider value={shellState}>{children}</ShellStateContext.Provider>
        </main>
      </div>
    </div>
  );
}
