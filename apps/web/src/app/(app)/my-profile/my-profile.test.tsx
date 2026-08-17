/**
 * File: apps/web/src/app/(app)/my-profile/my-profile.test.tsx
 * Purpose: Guards the entity list this screen derives and the field it must never render.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   The password assertion is the one worth having. This screen draws a 'Change
 *   password' button because the fragment does, and the obvious next edit is to
 *   open a form behind it — which would put a credential field in a product
 *   whose identity lives with Entra ID (ADR-0007). Asserting that no
 *   input[type=password] exists makes that edit fail loudly instead of shipping.
 *
 *   The entity assertion guards the same drift the dashboard test guards, on the
 *   one other screen that lists every OpCo: assignments are derived from the
 *   fixture, so an excluded jurisdiction cannot appear on a user's profile.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { t, tf } from '@/i18n';

import MyProfilePage from './page';

const shell: ShellState = {
  locale: 'zh-Hant',
  tr: (key) => t('zh-Hant', key),
  trf: (key, vars) => tf('zh-Hant', key, vars),
  scopeCode: 'APAC',
  scopeLabel: 'APAC',
  entity: null,
  setScope: () => {},
  setLocale: () => {},
  periodLabel: '2026-Q3',
};

function renderScreen() {
  return render(
    <ShellStateContext.Provider value={shell}>
      <MyProfilePage />
    </ShellStateContext.Provider>,
  );
}

describe('my profile — no credential field, ever', () => {
  it('renders no password input', () => {
    const { container } = renderScreen();
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(0);
  });

  it('renders no input at all — this screen is read-only', () => {
    const { container } = renderScreen();
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });
});

describe('my profile — entity assignments are derived', () => {
  it('lists one chip per in-scope OpCo', () => {
    renderScreen();
    for (const e of entityPosture) {
      expect(screen.getByText(e.name)).toBeDefined();
    }
    expect(entityPosture).toHaveLength(13);
  });

  it('marks itself as demo data', () => {
    renderScreen();
    expect(screen.getByRole('note')).toBeDefined();
  });

  const FORBIDDEN: [string, RegExp][] = [
    ['India', /\bIndia\b/],
    ['RIN (OpCo code)', /\bRIN\b/],
    ['China', /\bChina\b/],
    ['Japan as an entity', /\bJapan\b/],
  ];

  it.each(FORBIDDEN)('does not render %s', (_label, pattern) => {
    const { container } = renderScreen();
    expect(container.textContent ?? '').not.toMatch(pattern);
  });
});
