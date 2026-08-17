/**
 * File: apps/web/src/app/(app)/dashboard/dashboard.test.tsx
 * Purpose: Guards the two claims on this screen that a type check cannot see.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   The first component test in the repo, so it also proves the jsdom +
 *   testing-library setup landed in Day 1 actually works. Until something
 *   rendered, "10 existing tests still pass" only showed nothing had broken.
 *
 *   Two things are asserted, both chosen because every other gate is blind to
 *   them:
 *
 *   1. The scope counts are DERIVED. The fragment hardcodes "6 jurisdictions"
 *      and "6 entities"; this project has 13 OpCos across 11 jurisdictions. A
 *      copied literal type-checks, lints, builds and renders — and is wrong.
 *      Only reading the output catches it.
 *   2. Nothing out of scope reaches the screen. India and China are excluded
 *      by the charter and Japan is headquarters, not an operating entity. The
 *      fixtures were cleaned, but "cleaned the file I remembered" is not the
 *      claim worth guarding — "nothing renders" is. This runs against the DOM,
 *      so it also covers values arriving through a path nobody grepped.
 *
 *   Check 2 matches on rendered text with word boundaries. A bare substring
 *   search is useless here: `RIN` appears inside `string`, `print` and
 *   `monitoring`, which is why the phase checklist's own verification command
 *   could never reach zero hits.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { t, tf } from '@/i18n';

import DashboardPage from './page';

// The app-router Link needs a router context this test has no interest in.
vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
}));

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

function renderDashboard() {
  return render(
    <ShellStateContext.Provider value={shell}>
      <DashboardPage />
    </ShellStateContext.Provider>,
  );
}

describe('dashboard — scope counts are derived, not copied', () => {
  it('renders one row per in-scope OpCo', () => {
    renderDashboard();
    const table = screen.getByRole('table');
    // One header row plus one row per OpCo.
    expect(within(table).getAllByRole('row')).toHaveLength(entityPosture.length + 1);
    expect(entityPosture).toHaveLength(13);
  });

  it('states 11 jurisdictions, not the deliverable 6', () => {
    renderDashboard();
    expect(screen.getByText('11 個管轄區')).toBeDefined();
  });

  it('states 13 entities in the matrix subtitle', () => {
    renderDashboard();
    expect(screen.getByText(/^13 個實體/)).toBeDefined();
  });

  it('marks itself as demo data', () => {
    renderDashboard();
    expect(screen.getByRole('note')).toBeDefined();
  });
});

describe('dashboard — nothing out of scope renders', () => {
  // Word boundaries on purpose: `RIN` is a substring of `string`, `print` and
  // `monitoring`, and `AML` of `SAML` and `Streamline`.
  const FORBIDDEN: [string, RegExp][] = [
    ['India', /\bIndia\b/],
    ['RIN (OpCo code)', /\bRIN\b/],
    ['China', /\bChina\b/],
    ['Japan as an entity', /\bJapan\b/],
    ['AML', /\bAML\b/],
    ['sanctions', /\bsanctions?\b/i],
    ['reconciliation', /\breconcil/i],
    ['a financial regulator', /\b(MAS|FSA|APRA|HKMA|BNM|PBoC)\b/],
  ];

  it.each(FORBIDDEN)('does not render %s', (_label, pattern) => {
    const { container } = renderDashboard();
    expect(container.textContent ?? '').not.toMatch(pattern);
  });
});
