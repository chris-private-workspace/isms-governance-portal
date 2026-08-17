'use client';

/**
 * File: apps/web/src/app/(app)/preferences/page.tsx
 * Purpose: Interface language, appearance and notification preferences.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/28-preferences.html (39 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   NOTHING ON THIS SCREEN PERSISTS, and that is a deliberate constraint rather
 *   than an unfinished edge. Guardrail 7 forbids putting anything in
 *   localStorage or sessionStorage, and there is no preferences endpoint yet, so
 *   every setting lives in React state and is gone on reload. A line on the page
 *   says so — a settings screen that silently forgets is worse than one that
 *   admits it.
 *
 *   WHAT IS REAL, WHAT IS NOT:
 *   - Theme genuinely switches. It writes data-theme on <html>, which is the
 *     same mechanism AppShell uses and the only one the tokens respond to
 *     (tokens.css:7,67). KNOWN LIMIT: AppShell keeps its own copy of that state,
 *     so after switching here the topbar's moon/sun icon is one click behind
 *     until it is pressed. Closing that needs theme on ShellState, which this
 *     screen does not own.
 *   - Density genuinely switches. It writes --row-py on <html>; every register
 *     in the product reads that token for row padding, so the change is visible
 *     across screens rather than only here. 7px / 11px are the design's own
 *     values (dc.html:4793). NOTE: tokens.css:44's comment describes a different
 *     scale ('5px compact / 7px default / 10px comfortable'); the two disagree,
 *     and the logic class is what the prototype actually renders.
 *   - Notification toggles genuinely toggle, and reach nothing. There is no
 *     notification service in this codebase.
 *   - The language rows genuinely switch, as of the Day-3 drive-through. They
 *     were ported with the fragment's markup and no handler, which left them
 *     carrying cursor:pointer and a hover rule while doing nothing — a dead
 *     control by the project's own definition. The capability was never missing:
 *     the topbar switcher calls the same setter, it just was not on ShellState.
 *     Adding setLocale there is the same move setScope made for the dashboard.
 *
 *   THE LANGUAGE LIST IS THE APP'S, NOT THE FRAGMENT'S. The deliverable offered
 *   five languages (dc.html:3724-3730) including Simplified Chinese for China,
 *   a jurisdiction the charter excludes outright. This renders LOCALES — what
 *   the product actually ships — so no unavailable language is ever presented as
 *   selectable.
 *
 * Key Components:
 *   - PreferencesPage: the three preference cards
 *   - DENSITY: the two row-padding options and the token value each writes
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/28-preferences.html
 *   - apps/web/src/i18n/index.ts — LOCALES, the list this screen must agree with
 */

import { useEffect, useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconCheck } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { LOCALES, type Locale } from '@/i18n';

/**
 * Copy for each shipped locale.
 *
 * `satisfies Record<Locale, …>` is the point of the shape: adding a locale to
 * LOCALES without adding its copy here stops the build, instead of rendering a
 * language row with two blank labels.
 */
const LANG_COPY = {
  'zh-Hant': { labelKey: 'prefs.lang.zhHant', subKey: 'prefs.lang.zhHant.sub' },
  en: { labelKey: 'prefs.lang.en', subKey: 'prefs.lang.en.sub' },
} as const satisfies Record<Locale, { labelKey: string; subKey: string }>;

/** dc.html:4793 — the design's own two row-padding values. */
const DENSITY = [
  { id: 'compact', labelKey: 'prefs.density.compact', rowPy: '7px' },
  { id: 'comfortable', labelKey: 'prefs.density.comfortable', rowPy: '11px' },
] as const;

/** Fragment :32, dc.html:5149-5154 — five rows, three on by default. */
const NOTIFY = [
  {
    id: 'critical',
    labelKey: 'prefs.notify.critical',
    subKey: 'prefs.notify.critical.sub',
    on: true,
  },
  { id: 'rcsa', labelKey: 'prefs.notify.rcsa', subKey: 'prefs.notify.rcsa.sub', on: true },
  { id: 'signoff', labelKey: 'prefs.notify.signoff', subKey: 'prefs.notify.signoff.sub', on: true },
  { id: 'digest', labelKey: 'prefs.notify.digest', subKey: 'prefs.notify.digest.sub', on: false },
  { id: 'policy', labelKey: 'prefs.notify.policy', subKey: 'prefs.notify.policy.sub', on: true },
] as const;

export default function PreferencesPage() {
  const { tr, locale, setLocale } = useShell();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [density, setDensity] = useState<string>('compact');
  const [notify, setNotify] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFY.map((n) => [n.id, n.on])),
  );

  // Read the live theme once, rather than assuming light: <html> may already
  // carry data-theme from the topbar toggle, and starting out of step would
  // highlight the wrong button on arrival.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'dark' || current === 'light') setTheme(current);
  }, []);

  function chooseTheme(next: 'light' | 'dark') {
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  function chooseDensity(id: string, rowPy: string) {
    setDensity(id);
    document.documentElement.style.setProperty('--row-py', rowPy);
  }

  const langs = LOCALES.map((code) => ({ code, ...LANG_COPY[code] }));

  return (
    <div data-screen-label="Preferences">
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
          {tr('prefs.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('prefs.title')}
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '760px',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
            {tr('prefs.language')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '14px' }}>
            {tr('prefs.language.sub')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Day-3 drive-through: these carried cursor:pointer and a hover rule
                with no handler, so they read as selectable and were not. The
                capability existed all along — the topbar's switcher calls the same
                setter — it simply was not on ShellState. */}
            {langs.map((l) => (
              <button
                key={l.code}
                type="button"
                data-hov="s3"
                onClick={() => setLocale(l.code)}
                aria-pressed={locale === l.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '11px 13px',
                  border: '1px solid var(--border)',
                  borderRadius: '9px',
                  background: locale === l.code ? 'var(--primary-tint)' : 'transparent',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text)',
                  }}
                >
                  {tr(l.labelKey)}
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '8px' }}>
                    {tr(l.subKey)}
                  </span>
                </span>
                {locale === l.code && (
                  <IconCheck width="16" height="16" stroke="var(--primary)" strokeWidth="2.4" />
                )}
              </button>
            ))}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-3)',
              lineHeight: 1.6,
              marginTop: '11px',
            }}
          >
            {tr('prefs.language.note')}
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>
            {tr('prefs.appearance')}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                {tr('prefs.theme')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {tr('prefs.theme.sub')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(
                [
                  { id: 'light', labelKey: 'prefs.theme.light' },
                  { id: 'dark', labelKey: 'prefs.theme.dark' },
                ] as const
              ).map((o) => {
                const on = theme === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => chooseTheme(o.id)}
                    style={{
                      height: '34px',
                      padding: '0 16px',
                      border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                      borderRadius: '8px',
                      background: on ? 'var(--primary)' : 'var(--surface-2)',
                      color: on ? '#fff' : 'var(--text-2)',
                      fontFamily: 'inherit',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tr(o.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                {tr('prefs.density')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                {tr('prefs.density.sub')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DENSITY.map((d) => {
                const on = density === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => chooseDensity(d.id, d.rowPy)}
                    style={{
                      height: '34px',
                      padding: '0 16px',
                      border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                      borderRadius: '8px',
                      background: on ? 'var(--primary)' : 'var(--surface-2)',
                      color: on ? '#fff' : 'var(--text-2)',
                      fontFamily: 'inherit',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tr(d.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            padding: '18px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
            {tr('prefs.notifications')}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '14px' }}>
            {tr('prefs.notifications.sub')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {NOTIFY.map((n) => {
              const on = notify[n.id] ?? false;
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '11px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                      {tr(n.labelKey)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{tr(n.subKey)}</div>
                  </div>
                  {/* A <span> in the fragment; a role=switch button here so it is
                      operable by keyboard. No design value changes. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={tr(n.labelKey)}
                    onClick={() => setNotify((prev) => ({ ...prev, [n.id]: !on }))}
                    style={{
                      width: '38px',
                      height: '22px',
                      borderRadius: '20px',
                      background: on ? 'var(--primary)' : 'var(--surface-3)',
                      position: 'relative',
                      flexShrink: 0,
                      cursor: 'pointer',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: on ? '19px' : '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#fff',
                        boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Not in the fragment. Added because a settings screen that forgets
            without saying so is the dishonest kind of mock. */}
        <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          {tr('prefs.persistNote')}
        </div>
      </div>
    </div>
  );
}
