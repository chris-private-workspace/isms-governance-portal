/**
 * File: apps/web/src/app/(app)/preferences/preferences.test.tsx
 * Purpose: Guards guardrail 7 on the one screen most likely to breach it.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   A preferences screen is where web storage gets reached for, and guardrail 7
 *   forbids it outright. The storage assertion is therefore the point of this
 *   file: it spies on Storage.prototype, so it fails for localStorage and
 *   sessionStorage alike and regardless of which module made the call. Nothing
 *   else in the toolchain would notice — a setItem call lints clean and builds.
 *
 *   The language assertion guards the other charter-facing claim. The
 *   deliverable listed five interface languages including Simplified Chinese for
 *   China, a jurisdiction excluded outright. Presenting a language the product
 *   cannot supply is a dead control the type checker is blind to, because both
 *   lists are just strings.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { LOCALES, t, tf } from '@/i18n';

import PreferencesPage from './page';

const shell: ShellState = {
  locale: 'zh-Hant',
  tr: (key) => t('zh-Hant', key),
  trf: (key, vars) => tf('zh-Hant', key, vars),
  scopeCode: 'APAC',
  scopeLabel: 'APAC',
  entity: null,
  setScope: () => {},
  periodLabel: '2026-Q3',
};

function renderScreen() {
  return render(
    <ShellStateContext.Provider value={shell}>
      <PreferencesPage />
    </ShellStateContext.Provider>,
  );
}

afterEach(() => {
  // These are written on <html>, which persists across tests in one file.
  delete document.documentElement.dataset.theme;
  document.documentElement.style.removeProperty('--row-py');
  vi.restoreAllMocks();
});

describe('preferences — nothing is written to web storage', () => {
  it('touches neither localStorage nor sessionStorage, on any interaction', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderScreen();

    fireEvent.click(screen.getByText(t('zh-Hant', 'prefs.theme.dark')));
    fireEvent.click(screen.getByText(t('zh-Hant', 'prefs.density.comfortable')));
    fireEvent.click(screen.getAllByRole('switch')[0]!);

    expect(setItem).not.toHaveBeenCalled();
  });

  it('says on the page that nothing is saved', () => {
    renderScreen();
    expect(screen.getByText(t('zh-Hant', 'prefs.persistNote'))).toBeDefined();
  });
});

describe('preferences — the language list is what the app ships', () => {
  it('offers exactly the locales in LOCALES', () => {
    renderScreen();
    expect(screen.getByText(t('zh-Hant', 'prefs.lang.zhHant'))).toBeDefined();
    expect(screen.getByText(t('zh-Hant', 'prefs.lang.en'))).toBeDefined();
    expect(LOCALES).toHaveLength(2);
  });

  const UNAVAILABLE: [string, RegExp][] = [
    ['Japanese', /Japanese|日本語/],
    ['Korean', /Korean|한국/],
    ['Simplified Chinese', /Simplified Chinese|简体/],
  ];

  it.each(UNAVAILABLE)('does not offer %s', (_label, pattern) => {
    const { container } = renderScreen();
    expect(container.textContent ?? '').not.toMatch(pattern);
  });
});

describe('preferences — the wired controls really move', () => {
  it('theme reaches the element the tokens hang off', () => {
    renderScreen();
    fireEvent.click(screen.getByText(t('zh-Hant', 'prefs.theme.dark')));

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('density reaches the row-padding token every register reads', () => {
    renderScreen();
    fireEvent.click(screen.getByText(t('zh-Hant', 'prefs.density.comfortable')));

    expect(document.documentElement.style.getPropertyValue('--row-py')).toBe('11px');
  });

  it('a notification toggle flips its own state', () => {
    renderScreen();
    const first = screen.getAllByRole('switch')[0]!;
    expect(first.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(first);
    expect(first.getAttribute('aria-checked')).toBe('false');
  });
});
