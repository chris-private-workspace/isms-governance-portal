/**
 * File: apps/web/src/app/(app)/assessments/assessments.test.tsx
 * Purpose: Guards the counts this screen derives and the charter scope it renders.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   The fragment carried three literals that are wrong for this project — a 76%
 *   region completion, a Singapore-only task card, and a six-entity table. All
 *   three are now computed, and a copied literal would type-check, lint, build
 *   and render. Only reading the output catches it, which is what this does.
 *
 *   The completion figure is asserted against a recomputation from the fixture
 *   rather than against a hardcoded 81. Writing 81 here would pin the test to
 *   today's fixture and turn a legitimate data change into a red build, while
 *   proving nothing about the derivation itself.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { myTasks } from '@/data/extended/myTasks';
import { t, tf } from '@/i18n';

import AssessmentsPage from './page';

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
      <AssessmentsPage />
    </ShellStateContext.Provider>,
  );
}

/** The design's formula (dc.html:5062), restated so the test is independent. */
function expectedCompletion(): number {
  const assigned = entityPosture.map((e) => Math.round(e.risks * 0.6));
  const done = entityPosture.map((e, i) => Math.round((assigned[i]! * e.rcsa) / 100));
  const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
  return Math.round((sum(done) / sum(assigned)) * 100);
}

describe('assessments — counts are derived, not copied', () => {
  it('renders one row per in-scope OpCo', () => {
    renderScreen();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(entityPosture.length + 1);
    expect(entityPosture).toHaveLength(13);
  });

  it('computes region completion rather than the deliverable 76%', () => {
    renderScreen();
    // Scoped to the header line, not the page. Ricoh Taiwan's own completion is
    // genuinely 76%, so a whole-page search for '76%' fails against correct
    // output — a cheap proxy answering a question that needs the right element.
    const meta = screen.getByText(/區域完成率/);

    expect(meta.textContent).toContain(`區域完成率 ${expectedCompletion()}%`);
    expect(meta.textContent).not.toContain('76%');
  });

  it('counts the task list instead of restating "2 of 4"', () => {
    renderScreen();
    const done = myTasks.filter((task) => task.done).length;
    expect(
      screen.getByText(tf('zh-Hant', 'assessments.continue', { done, total: myTasks.length })),
    ).toBeDefined();
  });

  it('marks itself as demo data', () => {
    renderScreen();
    expect(screen.getByRole('note')).toBeDefined();
  });
});

describe('assessments — the task list opens the form and comes back', () => {
  it('switches views on both legs', () => {
    renderScreen();
    fireEvent.click(screen.getByText(myTasks[0]!.title));

    expect(screen.getByText(t('zh-Hant', 'assessments.form.title'))).toBeDefined();

    fireEvent.click(screen.getByText(t('zh-Hant', 'assessments.back')));
    expect(screen.getByText(t('zh-Hant', 'assessments.byEntity'))).toBeDefined();
  });

  it('lets the graded answers actually change', () => {
    renderScreen();
    fireEvent.click(screen.getByText(myTasks[0]!.title));

    const ineffective = screen.getByText(t('zh-Hant', 'assessments.q2.ineffective'));
    expect(ineffective.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(ineffective);
    expect(ineffective.getAttribute('aria-pressed')).toBe('true');
    expect(
      screen.getByText(t('zh-Hant', 'assessments.q2.effective')).getAttribute('aria-pressed'),
    ).toBe('false');
  });
});

describe('assessments — nothing out of scope renders', () => {
  // Word boundaries: `RIN` is a substring of `string`, `print` and `monitoring`.
  const FORBIDDEN: [string, RegExp][] = [
    ['India', /\bIndia\b/],
    ['RIN (OpCo code)', /\bRIN\b/],
    ['China', /\bChina\b/],
    ['Japan as an entity', /\bJapan\b/],
    ['a financial regulator', /\b(MAS|FSA|APRA|HKMA|BNM|PBoC)\b/],
  ];

  it.each(FORBIDDEN)('does not render %s', (_label, pattern) => {
    const { container } = renderScreen();
    expect(container.textContent ?? '').not.toMatch(pattern);
  });
});
