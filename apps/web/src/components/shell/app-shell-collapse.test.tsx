/**
 * File: apps/web/src/components/shell/app-shell-collapse.test.tsx
 * Purpose: Prove the nav rail collapses itself on narrow viewports AND that the
 *     toggle still wins afterwards — the second half is the one that rots.
 * Category: Test
 * Scope: Phase W20
 *
 * Description:
 *   W20 makes the rail collapse automatically below 1440px. The obvious
 *   implementation — derive `collapsed` from the breakpoint — turns the existing
 *   toggle button into a dead control at exactly the widths where the toggle
 *   matters most: it fires, state changes, and the next render recomputes the
 *   width from the viewport and throws the choice away. The button would still
 *   be clickable, still have a handler, still swap its own icon. W19 shipped 25
 *   controls of that shape and every gate was green, so this file asserts the
 *   override directly rather than trusting that a handler exists.
 *
 *   Tested through the real AppShell, not through a extracted one-line helper.
 *   A helper test would assert the expression and say nothing about whether the
 *   shell uses it, which is the gap that lets this class of bug ship.
 *
 *   The three mocks are the app-router surfaces only. Everything else the shell
 *   imports is local and pure, so it runs for real.
 *
 * Created: 2026-08-18 (Phase W20)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W20)
 *
 * Related:
 *   - apps/web/src/lib/useBreakpoint.ts — supplies the band
 *   - docs/01-planning/W20-responsive-layout/plan.md §3.2
 */
import { fireEvent, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PERSONAS } from '@/lib/personas';

import { AppShell } from './AppShell';

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));

// A real persona, not a hand-built literal cast to the type. A cast would keep
// compiling if Persona gained a field the shell then rendered, and this test
// would drift away from what the app actually mounts.
const persona = PERSONAS[0];
if (!persona) throw new Error('PERSONAS is empty — the shell cannot be rendered');

/** jsdom has no matchMedia; drive it from a width we control. */
function stubViewport(width: number) {
  const parseMax = (q: string) => Number(/max-width:\s*(\d+)px/.exec(q)?.[1] ?? Infinity);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width <= parseMax(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function railWidth(container: HTMLElement) {
  const aside = container.querySelector('aside');
  if (!aside) throw new Error('no <aside> — the shell did not render its nav rail');
  return aside.style.width;
}

const COLLAPSED = '64px';
const EXPANDED = '232px';

beforeEach(() => {
  document.documentElement.dataset.grc = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('nav rail — collapses itself below wide', () => {
  it.each([
    [2560, EXPANDED],
    [1440, EXPANDED],
    [1200, COLLAPSED],
    [800, COLLAPSED],
  ])('at %ipx the rail settles at %s', (width, expected) => {
    stubViewport(width);

    const { container } = render(<AppShell persona={persona}>{null}</AppShell>);

    expect(railWidth(container)).toBe(expected);
  });
});

describe('nav rail — the toggle outranks the viewport', () => {
  it('expanding on a narrow viewport sticks', () => {
    stubViewport(800);

    const { container, getByTitle } = render(<AppShell persona={persona}>{null}</AppShell>);
    expect(railWidth(container)).toBe(COLLAPSED);

    // 收合/展開側邊欄 — the title flips with the state, so query the current one.
    fireEvent.click(getByTitle('展開側邊欄'));

    expect(railWidth(container)).toBe(EXPANDED);
  });

  it('collapsing on a wide viewport sticks', () => {
    stubViewport(2560);

    const { container, getByTitle } = render(<AppShell persona={persona}>{null}</AppShell>);
    expect(railWidth(container)).toBe(EXPANDED);

    fireEvent.click(getByTitle('收合側邊欄'));

    expect(railWidth(container)).toBe(COLLAPSED);
  });

  it('the toggle is reversible, which a viewport-derived value would not be', () => {
    stubViewport(800);

    const { container, getByTitle } = render(<AppShell persona={persona}>{null}</AppShell>);

    fireEvent.click(getByTitle('展開側邊欄'));
    expect(railWidth(container)).toBe(EXPANDED);

    fireEvent.click(getByTitle('收合側邊欄'));
    expect(railWidth(container)).toBe(COLLAPSED);

    fireEvent.click(getByTitle('展開側邊欄'));
    expect(railWidth(container)).toBe(EXPANDED);
  });
});
