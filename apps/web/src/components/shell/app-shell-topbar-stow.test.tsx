/**
 * File: apps/web/src/components/shell/app-shell-topbar-stow.test.tsx
 * Purpose: Assert that what the narrow topbar stops showing is still reachable —
 *     the half of "make it fit" that silently turns into removal.
 * Category: Test
 * Scope: Phase W20
 *
 * Description:
 *   The topbar cannot wrap and cannot clip (no flexWrap, no overflow), so below
 *   `wide` it has to give something up: the five-button period control and the
 *   name/role text beside the avatar. Dropping them makes the row fit, and a
 *   width assertion would go green there and stop.
 *
 *   That is the trap. "It fits now" and "the user can still do the thing" are
 *   different claims, and only the first one is easy to measure. So every test
 *   here pairs a disappearance with the place the function moved to:
 *     - the five periods must still be selectable, from the compact trigger
 *     - the seat's role must still be readable, from the user menu
 *
 *   The role assertion is the load-bearing one. Before W20 the user dropdown
 *   showed name and email but NOT role, so hiding the topbar block would have
 *   made the role unreachable at every width below 1440px. The dropdown line
 *   exists because this test demanded it, not the other way round.
 *
 * Created: 2026-08-18 (Phase W20)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W20)
 *
 * Related:
 *   - docs/01-planning/W20-responsive-layout/plan.md §3.2
 *   - .claude/rules/anti-patterns-checklist.md AP-3
 */
import { fireEvent, render, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/i18n';
import { PERSONAS, type Persona } from '@/lib/personas';

import { AppShell } from './AppShell';

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

// Narrowing through `if (!x) throw` does not reach the hoisted `function`
// declarations below it, so the check lives in a factory that returns the
// narrowed type instead.
function firstPersona(): Persona {
  const p = PERSONAS[0];
  if (!p) throw new Error('PERSONAS is empty — the shell cannot be rendered');
  return p;
}

const persona = firstPersona();

const ROLE_LABEL = t('zh-Hant', persona.roleKey);
const PERIODS = ['2026-Q3', '2026-Q2', '2026-Q1', '2025-Q4', 'FY2025'];

function stubViewport(width: number) {
  const parseMax = (q: string) => Number(/max-width:\s*(\d+)px/.exec(q)?.[1] ?? Infinity);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width <= parseMax(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function mount(width: number) {
  stubViewport(width);
  return render(<AppShell persona={persona}>{null}</AppShell>);
}

/** Buttons whose whole label is a period string, anywhere in the tree. */
function periodButtons(container: HTMLElement) {
  return [...container.querySelectorAll('button')].filter((b) =>
    PERIODS.includes((b.textContent ?? '').trim()),
  );
}

/**
 * The avatar button, found by the initials it renders. It carries no title and
 * no aria-label — noted as an accessibility gap in progress.md rather than
 * fixed here, since W20's scope is layout.
 */
function userMenuButton(container: HTMLElement) {
  const btn = [...container.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(persona.initials),
  );
  if (!btn) throw new Error('no avatar button — the topbar did not render the user menu trigger');
  return btn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('topbar — the period control shrinks but keeps all five periods', () => {
  it('shows five segmented buttons at wide', () => {
    const { container } = mount(2560);

    expect(periodButtons(container)).toHaveLength(5);
  });

  it('collapses to a single trigger below wide', () => {
    const { container } = mount(800);

    // The trigger's own label is the current period plus a chevron, so it is
    // not counted by periodButtons — which is the point: five became zero-plus-one.
    expect(periodButtons(container)).toHaveLength(0);
    expect(container.textContent).toContain('2026-Q3');
  });

  it('reveals all five from the trigger, and selecting one takes effect', () => {
    const { container, getByTitle } = mount(800);

    fireEvent.click(getByTitle(t('zh-Hant', 'topbar.period.heading')));

    const options = periodButtons(container);
    expect(options.map((b) => (b.textContent ?? '').trim())).toEqual(PERIODS);

    const fy = options.find((b) => (b.textContent ?? '').trim() === 'FY2025');
    if (!fy) throw new Error('FY2025 missing from the reopened list');
    fireEvent.click(fy);

    // The menu closes and the trigger now carries the chosen period.
    expect(periodButtons(container)).toHaveLength(0);
    expect(container.textContent).toContain('FY2025');
  });
});

describe('topbar — the seat identity is stowed, not deleted', () => {
  it('drops name and role from the row at narrow', () => {
    const { queryByText } = mount(800);

    expect(queryByText(persona.name)).toBeNull();
    expect(queryByText(ROLE_LABEL)).toBeNull();
  });

  it('still shows both once the user menu is open', () => {
    const { container, getByText } = mount(800);

    fireEvent.click(userMenuButton(container));

    expect(getByText(persona.name)).toBeTruthy();
    // The role is the one that was NOT in this dropdown before W20.
    expect(getByText(ROLE_LABEL)).toBeTruthy();
    expect(within(container).getByText(persona.email)).toBeTruthy();
  });

  it('keeps both inline at wide, where the row has room', () => {
    const { getByText } = mount(2560);

    expect(getByText(persona.name)).toBeTruthy();
    expect(getByText(ROLE_LABEL)).toBeTruthy();
  });
});
