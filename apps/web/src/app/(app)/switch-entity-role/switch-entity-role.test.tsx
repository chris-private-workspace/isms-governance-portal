/**
 * File: apps/web/src/app/(app)/switch-entity-role/switch-entity-role.test.tsx
 * Purpose: Guards that the scope list is real, complete and actually connected.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   Two failures this catches that nothing else would:
 *
 *   1. A row that highlights itself but does not move the shell's scope. That is
 *      the dead control shell-state.ts exists to prevent, and it renders exactly
 *      like a working one — the button would still show 'Current'. Asserting
 *      setScope is called with the OpCo code is the only way to tell them apart.
 *   2. A row count taken from the fragment's hint (7) rather than from the OpCo
 *      fixture (13 + the region). A short list looks perfectly normal.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { t, tf } from '@/i18n';

import SwitchEntityRolePage from './page';

function renderScreen(setScope = vi.fn()) {
  const shell: ShellState = {
    locale: 'zh-Hant',
    tr: (key) => t('zh-Hant', key),
    trf: (key, vars) => tf('zh-Hant', key, vars),
    scopeCode: 'APAC',
    scopeLabel: 'APAC',
    entity: null,
    setScope,
    periodLabel: '2026-Q3',
  };

  return {
    setScope,
    ...render(
      <ShellStateContext.Provider value={shell}>
        <SwitchEntityRolePage />
      </ShellStateContext.Provider>,
    ),
  };
}

describe('switch entity role — the list is the charter scope', () => {
  it('offers the region plus every in-scope OpCo', () => {
    renderScreen();
    expect(screen.getAllByRole('button')).toHaveLength(entityPosture.length + 1);
    expect(entityPosture).toHaveLength(13);
  });

  it('marks the shell scope as current, not a local guess', () => {
    renderScreen();
    const region = screen.getByText(t('zh-Hant', 'switchRole.region')).closest('button');

    expect(region?.getAttribute('aria-pressed')).toBe('true');
    expect(region?.textContent).toContain(t('zh-Hant', 'switchRole.chip.current'));
  });

  it('names roles from the fixed six, not the deliverable job titles', () => {
    const { container } = renderScreen();
    expect(container.textContent ?? '').toContain(t('zh-Hant', 'switchRole.role.opcoAdmin'));
    expect(container.textContent ?? '').not.toMatch(/Regional Governance|Entity Oversight/);
  });

  it('marks itself as demo data', () => {
    renderScreen();
    expect(screen.getByRole('note')).toBeDefined();
  });
});

describe('switch entity role — selecting a row moves the shell', () => {
  it('calls setScope with the OpCo code', () => {
    const { setScope } = renderScreen();
    const target = entityPosture[3]!;

    fireEvent.click(screen.getByText(target.name));
    expect(setScope).toHaveBeenCalledWith(target.code);
  });

  it('calls setScope with APAC for the region row', () => {
    const { setScope } = renderScreen();

    fireEvent.click(screen.getByText(t('zh-Hant', 'switchRole.region')));
    expect(setScope).toHaveBeenCalledWith('APAC');
  });
});

describe('switch entity role — nothing out of scope renders', () => {
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
